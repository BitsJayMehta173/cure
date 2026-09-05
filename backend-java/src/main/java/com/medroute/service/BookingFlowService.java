package com.medroute.service;

import com.medroute.dto.*;
import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Shared slot calculation engine — used by BOTH the booking wizard AND the
 * recommendation system.
 *
 * Both systems query the same Appointment table. When a slot is booked or
 * cancelled through the wizard, the recommendation system instantly reflects
 * the change because they share this service.
 */
@Service
public class BookingFlowService {

    @Autowired private PatientRepository patientRepository;
    @Autowired private HospitalRepository hospitalRepository;
    @Autowired private HospitalDepartmentRepository deptRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private HolidayRepository holidayRepository;
    @Autowired private CancellationRepository cancellationRepository;

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    public List<PatientProfileDTO> getAllProfiles() {
        return patientRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::toProfileDTO)
                .toList();
    }

    public PatientProfileDTO createProfile(String fullName, Integer age, String gender,
                                           String bloodGroup, String mobile, String relation) {
        Patient p = new Patient();
        p.setFullName(fullName);
        p.setAge(age);
        p.setGender(gender);
        p.setBloodGroup(bloodGroup);
        p.setMobile(mobile);
        p.setRelation(relation);
        Patient saved = patientRepository.save(p);
        return toProfileDTO(saved);
    }

    public void deleteProfile(Long id) {
        patientRepository.deleteById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOSPITAL & DEPARTMENT BROWSE
    // ═══════════════════════════════════════════════════════════════════════

    public List<String> getAllStates() {
        return hospitalRepository.findDistinctStates();
    }

    /**
     * Get the state of a specific hospital — used to determine which state-specific
     * holidays apply when the frontend doesn't pass the state explicitly.
     */
    public String getHospitalState(Long hospitalId) {
        return hospitalRepository.findById(hospitalId)
                .map(h -> h.getState() != null ? h.getState() : "Rajasthan")
                .orElse("Rajasthan");
    }

    public List<HospitalSummaryDTO> getHospitalsByState(String state) {
        if (state == null || state.isBlank()) return Collections.emptyList();
        String needle = state.trim();
        return hospitalRepository.findAll().stream()
                .filter(h -> {
                    if (h.getState() == null) return false;
                    // Match exactly OR the state string is contained in the hospital's state
                    // (handles "Delhi NCR" vs "Delhi" gracefully)
                    String hay = h.getState().trim();
                    return hay.equalsIgnoreCase(needle) || hay.toLowerCase().contains(needle.toLowerCase());
                })
                .map(this::toHospitalSummaryDTO)
                .toList();
    }

    public List<DepartmentSummary> getDepartmentsByHospital(Long hospitalId) {
        return deptRepository.findByHospitalId(hospitalId).stream()
                .map(hd -> {
                    DepartmentSummary ds = new DepartmentSummary();
                    ds.setId(hd.getId());
                    ds.setConditionName(hd.getDepartmentName());
                    return ds;
                })
                .toList();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SLOT CALCULATION (shared by booking wizard AND recommendation system)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Determine slot status for a single doctor on a single date.
     * This method is the SOURCE OF TRUTH for availability.
     *
     * Status values:
     *   - "not_open"  : Sunday (hospitals closed)
     *   - "holiday"   : Public/state holiday
     *   - "full"      : No slots left
     *   - "available" : At least one slot open
     */
    public String getSlotStatus(Long doctorId, LocalDate date, String state) {
        // Sundays are not open
        if (date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            return "not_open";
        }

        // Check holiday table
        List<Holiday> holidays = holidayRepository.findHolidaysForDate(date, state);
        if (!holidays.isEmpty()) {
            return "holiday";
        }

        // Check capacity
        long booked = appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                doctorId, date.toString(), "cancelled");
        Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
        if (doctor == null) return "full";

        return booked < doctor.getDailyLimit() ? "available" : "full";
    }

    /**
     * Build the monthly slot calendar for the booking wizard.
     * month format: "YYYY-MM"
     *
     * Performance: uses 1 batched query to fetch all booking counts for the month,
     * instead of N doctors x N days = N² individual queries.
     */
    public List<SlotAvailabilityDTO> getMonthlySlots(Long hospitalId, Long deptId,
                                                     String monthStr, String state) {
        YearMonth ym = YearMonth.parse(monthStr);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        // Single eager-loaded query (3-level JOIN FETCH) — no lazy proxies, no N+1
        List<Doctor> doctors = doctorRepository.findByHospitalIdAndDepartmentId(hospitalId, deptId);
        if (doctors.isEmpty()) return Collections.emptyList();

        // Compute total daily capacity once (avoid per-day recompute)
        int docTotal = doctors.stream()
                .mapToInt(d -> Optional.ofNullable(d.getDailyLimit()).orElse(0))
                .sum();

        // Batch-fetch all booking counts for the month in 1 query
        List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
        Map<LocalDate, Integer> bookedByDate = new HashMap<>();
        for (Object[] row : appointmentRepository.countActiveByDoctorIdsInRange(
                doctorIds, start.toString(), end.toString())) {
            Long docId = (Long) row[0];
            String dateStr = (String) row[1];
            Long count = (Long) row[2];
            bookedByDate.merge(LocalDate.parse(dateStr), count.intValue(), Integer::sum);
        }

        // Pre-fetch holidays for the month (1 query)
        Map<LocalDate, String> holidayMap = new HashMap<>();
        for (Holiday h : holidayRepository.findHolidaysInRange(start, end, state)) {
            holidayMap.put(h.getDate(), h.getName());
        }

        List<SlotAvailabilityDTO> slots = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            String status;
            String holidayName = holidayMap.get(date);
            int bookedSlots = bookedByDate.getOrDefault(date, 0);
            int totalSlots = docTotal;
            int remainingSlots = Math.max(0, totalSlots - bookedSlots);

            if (date.isBefore(today)) {
                status = "not_open";
            } else if (date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
                status = "not_open";
            } else if (holidayName != null) {
                status = "holiday";
            } else {
                status = remainingSlots > 0 ? "available" : "full";
            }

            SlotAvailabilityDTO dto = new SlotAvailabilityDTO();
            dto.setDate(date.toString());
            dto.setStatus(status);
            dto.setTotalSlots(totalSlots);
            dto.setBookedSlots(bookedSlots);
            dto.setRemainingSlots(remainingSlots);
            dto.setHolidayName(holidayName);
            slots.add(dto);
        }
        return slots;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOKEN PREVIEW (used by ConfirmModal)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Compute the token preview for a specific hospital+department+date.
     * Returns the doctor with the earliest token (shortest wait).
     */
    public TokenPreviewDTO previewToken(Long hospitalId, Long deptId, LocalDate date, String state) {
        // Eager load — no lazy proxies
        List<Doctor> doctors = doctorRepository.findByHospitalIdAndDepartmentId(hospitalId, deptId);
        if (doctors.isEmpty()) return null;

        // Batch-fetch booking counts for all doctors on this date — 1 query instead of N
        List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
        Map<Long, Long> bookedCounts = new HashMap<>();
        for (Object[] row : appointmentRepository.countActiveByDoctorIdsAndDate(doctorIds, date.toString())) {
            bookedCounts.put((Long) row[0], (Long) row[1]);
        }

        // Sort by ascending booked count (least busy doctor first)
        doctors.sort(Comparator.comparingInt(d ->
                bookedCounts.getOrDefault(d.getId(), 0L).intValue()));

        Doctor doctor = doctors.get(0);
        long booked = bookedCounts.getOrDefault(doctor.getId(), 0L);
        int dailyLimit = Optional.ofNullable(doctor.getDailyLimit()).orElse(0);
        // Use gap-filling: lowest positive int not already taken (so cancelled
        // tokens are reused instead of producing two patients with the same number).
        int tokenNumber = nextAvailableToken(doctor.getId(), date, dailyLimit);
        int avgMins = Optional.ofNullable(doctor.getAvgMinutesPerPatient()).orElse(15);

        LocalTime time = LocalTime.of(9, 0).plusMinutes((long) (tokenNumber - 1) * avgMins);
        String timeStr = formatTime(time);

        int remaining = Math.max(0, dailyLimit - (int) booked);

        TokenPreviewDTO dto = new TokenPreviewDTO();
        dto.setDoctorId(doctor.getId());
        dto.setAssignedDoctor(doctor.getDoctorName());
        dto.setDoctorQualification(doctor.getQualification());
        dto.setTokenNumber(tokenNumber);
        dto.setAvgMinutesPerPatient(avgMins);
        dto.setExpectedTimeStr(timeStr);
        dto.setRemainingSlots(remaining);
        return dto;
    }

    /**
     * Returns ALL doctors with open slots for a given hospital+department+date.
     * Used by the booking modal's doctor dropdown so the user can choose a specific doctor.
     * Sorted by ascending token number (earliest available first).
     */
    public List<AvailableDoctorDTO> getAvailableDoctors(Long hospitalId, Long deptId,
                                                        LocalDate date, String state) {
        // Eager load — 1 query, no lazy proxies
        List<Doctor> doctors = doctorRepository.findByHospitalIdAndDepartmentId(hospitalId, deptId);
        if (doctors.isEmpty()) return Collections.emptyList();

        // Batch-fetch booking counts — 1 query for all doctors on this date
        List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
        Map<Long, Long> bookedCounts = new HashMap<>();
        for (Object[] row : appointmentRepository.countActiveByDoctorIdsAndDate(doctorIds, date.toString())) {
            bookedCounts.put((Long) row[0], (Long) row[1]);
        }

        // Build DTOs for doctors with remaining slots, sorted by token number (ascending)
        List<AvailableDoctorDTO> available = new ArrayList<>();
        for (Doctor doc : doctors) {
            long booked = bookedCounts.getOrDefault(doc.getId(), 0L);
            int dailyLimit = Optional.ofNullable(doc.getDailyLimit()).orElse(0);
            int remaining = Math.max(0, dailyLimit - (int) booked);
            if (remaining <= 0) continue; // Skip fully-booked doctors

            // Gap-filling token assignment: lowest positive int not already taken,
            // so cancelled tokens are reused and no two patients get the same number.
            int tokenNumber = nextAvailableToken(doc.getId(), date, dailyLimit);
            int avgMins = Optional.ofNullable(doc.getAvgMinutesPerPatient()).orElse(15);
            LocalTime time = LocalTime.of(9, 0).plusMinutes((long) (tokenNumber - 1) * avgMins);

            AvailableDoctorDTO dto = new AvailableDoctorDTO();
            dto.setDoctorId(doc.getId());
            dto.setDoctorName(doc.getDoctorName());
            dto.setQualification(doc.getQualification());
            dto.setYearsOfExperience(doc.getYearsOfExperience());
            dto.setAvgMinutesPerPatient(avgMins);
            dto.setTokenNumber(tokenNumber);
            dto.setRemainingSlots(remaining);
            dto.setExpectedTimeStr(formatTime(time));
            available.add(dto);
        }

        // Sort: earliest token first, then most remaining slots
        available.sort(Comparator
                .comparingInt(AvailableDoctorDTO::getTokenNumber)
                .thenComparing(Comparator.comparingInt(AvailableDoctorDTO::getRemainingSlots).reversed()));
        return available;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIRM BOOKING
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public BookingConfirmationDTO confirmBooking(Long profileId, Long hospitalId,
                                                Long deptId, Long doctorId, LocalDate date) {
        Doctor selectedDoctor = null;
        int selectedToken = -1;

        if (doctorId != null) {
            // Path A: user selected a specific doctor in the dropdown
            Doctor d = doctorRepository.findByIdWithLock(doctorId)
                    .orElseThrow(() -> new RuntimeException("Selected doctor not found."));
            // Verify the doctor belongs to the chosen hospital+department
            var dept = d.getDepartment();
            if (dept == null || !dept.getId().equals(deptId)
                    || dept.getHospital() == null
                    || !dept.getHospital().getId().equals(hospitalId)) {
                throw new RuntimeException("Doctor does not belong to the selected hospital/department.");
            }
            // Re-check slot availability under the lock
            long booked = appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                    d.getId(), date.toString(), "cancelled");
            int dailyLimit = Optional.ofNullable(d.getDailyLimit()).orElse(0);
            if (booked >= dailyLimit) {
                throw new RuntimeException("This doctor's slots are full for that date. Please pick another doctor or date.");
            }
            selectedDoctor = d;
            // Gap-filling token assignment (under lock) — fills the lowest free slot
            // so cancelled tokens are reused instead of producing two patients with
            // the same token number.
            selectedToken = nextAvailableToken(d.getId(), date, dailyLimit);
            if (selectedToken == 0) {
                throw new RuntimeException("This doctor's slots are full for that date. Please pick another doctor or date.");
            }
        } else {
            // Path B: auto-assign the least-busy available doctor
            List<Doctor> doctors = doctorRepository.findByHospitalIdAndDepartmentId(hospitalId, deptId);
            if (doctors.isEmpty()) {
                throw new RuntimeException("No doctors found for this department.");
            }

            List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
            Map<Long, Long> bookedCounts = new HashMap<>();
            for (Object[] row : appointmentRepository.countActiveByDoctorIdsAndDate(doctorIds, date.toString())) {
                bookedCounts.put((Long) row[0], (Long) row[1]);
            }

            doctors.sort(Comparator.comparingInt(d ->
                    bookedCounts.getOrDefault(d.getId(), 0L).intValue()));

            for (Doctor doc : doctors) {
                long booked = bookedCounts.getOrDefault(doc.getId(), 0L);
                int dailyLimit = Optional.ofNullable(doc.getDailyLimit()).orElse(0);
                if (booked < dailyLimit) {
                    selectedDoctor = doctorRepository.findByIdWithLock(doc.getId())
                            .orElseThrow(() -> new RuntimeException("Doctor not found."));
                    // Gap-filling token assignment under lock
                    selectedToken = nextAvailableToken(doc.getId(), date, dailyLimit);
                    if (selectedToken > 0) break;
                    // Race: another tx filled the gap we targeted; loop to next doctor
                    selectedDoctor = null;
                }
            }

            if (selectedDoctor == null) {
                throw new RuntimeException("No slots available for this date. Please choose another day.");
            }
        }

        // Final re-check under lock (defense-in-depth against the second user hitting confirm simultaneously)
        long finalBooked = appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                selectedDoctor.getId(), date.toString(), "cancelled");
        if (finalBooked >= Optional.ofNullable(selectedDoctor.getDailyLimit()).orElse(0)) {
            throw new RuntimeException("Slot just got filled. Please choose another doctor or date.");
        }
        // Re-assign token under lock using gap-filling: race-safe (only one tx
        // holds this doctor row at a time, so the lowest free slot is unique).
        int dailyLimitFinal = Optional.ofNullable(selectedDoctor.getDailyLimit()).orElse(0);
        selectedToken = nextAvailableToken(selectedDoctor.getId(), date, dailyLimitFinal);
        if (selectedToken == 0) {
            throw new RuntimeException("Slot just got filled. Please choose another doctor or date.");
        }

        // 6. Create appointment
        Appointment appt = new Appointment();
        appt.setDoctor(selectedDoctor);
        appt.setDateStr(date.toString());
        appt.setSource("BookingWizard");

        Patient patient = patientRepository.findById(profileId).orElse(null);
        if (patient != null) {
            appt.setPatientFk(profileId);
            appt.setPatientName(patient.getFullName());
        }

        appt.setHospitalId(hospitalId);
        appt.setDepartmentId(deptId);
        appt.setStatus("confirmed");

        String tokenCode = "TKN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        appt.setTokenCode(tokenCode);
        appt.setTokenNum(selectedToken);

        Appointment saved = appointmentRepository.save(appt);

        // 7. Build response
        BookingConfirmationDTO dto = new BookingConfirmationDTO();
        dto.setAppointmentId(saved.getId());
        dto.setTokenCode(tokenCode);
        dto.setTokenNumber(selectedToken);
        dto.setDoctorName(selectedDoctor.getDoctorName());
        dto.setDate(date.toString());
        dto.setStatus("confirmed");

        // Expected time
        int avgMins = Optional.ofNullable(selectedDoctor.getAvgMinutesPerPatient()).orElse(15);
        LocalTime time = LocalTime.of(9, 0).plusMinutes((long) (selectedToken - 1) * avgMins);
        dto.setExpectedTimeStr(formatTime(time));

        // Hospital and department names
        Hospital hospital = hospitalRepository.findById(hospitalId).orElse(null);
        HospitalDepartment dept = deptRepository.findById(deptId).orElse(null);
        if (hospital != null) dto.setHospitalName(hospital.getName());
        if (dept != null) dto.setDepartmentName(dept.getDepartmentName());

        return dto;
    }

    /**
     * Backward-compatible overload: when frontend doesn't specify a doctor, auto-assign.
     */
    public BookingConfirmationDTO confirmBooking(Long profileId, Long hospitalId,
                                                Long deptId, LocalDate date) {
        return confirmBooking(profileId, hospitalId, deptId, null, date);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOKEN ASSIGNMENT (monotonic — never reuse cancelled numbers)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Monotonic token assignment — the next token is ALWAYS the highest
     * existing confirmed token + 1. Cancelled tokens are NOT reused.
     *
     * Example: taken = {1, 2, 3, 5} (token 4 was cancelled) → next = 6.
     * This ensures token numbers only increase over time, so the user can
     * always see progress (token 3 cancelled → next patient still gets a
     * unique, never-reused token number).
     *
     * Returns 0 if the doctor is at full daily capacity (max + 1 > dailyLimit).
     */
    public int nextAvailableToken(Long doctorId, LocalDate date, int dailyLimit) {
        if (dailyLimit <= 0) return 0;
        List<Integer> taken = appointmentRepository.findTakenTokensByDoctorAndDate(
                doctorId, date.toString());
        int maxToken = taken.isEmpty() ? 0 : Collections.max(taken);
        int candidate = maxToken + 1;
        return candidate <= dailyLimit ? candidate : 0;
    }

    /**
     * Count active (non-cancelled) bookings for a doctor on a date.
     * Single source of truth for "how many slots are taken".
     */
    public long countActiveBookings(Long doctorId, LocalDate date) {
        return appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                doctorId, date.toString(), "cancelled");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPOINTMENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    public List<AppointmentSummaryDTO> getPatientAppointments(Long profileId) {
        return appointmentRepository.findByPatientFkOrderByDateStrDesc(profileId).stream()
                .map(this::toAppointmentSummaryDTO)
                .toList();
    }

    @Transactional
    public void cancelAppointment(Long appointmentId, Long profileId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found."));

        // Verify ownership — only enforce when BOTH sides are present
        // (simulator bookings have no patientFk and cannot be cancelled via this endpoint)
        if (profileId != null && appt.getPatientFk() != null
                && !appt.getPatientFk().equals(profileId)) {
            throw new RuntimeException("You can only cancel your own appointments.");
        }

        if ("cancelled".equals(appt.getStatus())) {
            throw new RuntimeException("This appointment is already cancelled.");
        }

        // Soft delete — keep the row for audit history
        appt.setStatus("cancelled");
        appointmentRepository.save(appt);

        // Record in Cancellation table for analytics
        Cancellation cancellation = new Cancellation();
        cancellation.setAppointmentId(appt.getId());
        cancellation.setDoctorId(appt.getDoctor().getId());
        cancellation.setDateStr(appt.getDateStr());
        cancellation.setPatientName(appt.getPatientName());
        cancellation.setCancelledAt(LocalDateTime.now());
        cancellationRepository.save(cancellation);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private String formatTime(LocalTime time) {
        int hour = time.getHour();
        int minute = time.getMinute();
        String ampm = hour >= 12 ? "PM" : "AM";
        int displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        return String.format("%02d:%02d %s", displayHour, minute, ampm);
    }

    private PatientProfileDTO toProfileDTO(Patient p) {
        PatientProfileDTO dto = new PatientProfileDTO();
        dto.setId(p.getId());
        dto.setFullName(p.getFullName());
        dto.setAge(p.getAge());
        dto.setGender(p.getGender());
        dto.setBloodGroup(p.getBloodGroup());
        dto.setMobile(p.getMobile());
        dto.setRelation(p.getRelation());
        dto.setCreatedAt(p.getCreatedAt());
        return dto;
    }

    private HospitalSummaryDTO toHospitalSummaryDTO(Hospital h) {
        HospitalSummaryDTO dto = new HospitalSummaryDTO();
        dto.setId(h.getId());
        dto.setName(h.getName());
        dto.setAddress(h.getAddress());
        dto.setState(h.getState());
        dto.setType(h.getType() != null ? h.getType() : "private");
        dto.setOpdHours(h.getOpdHours() != null ? h.getOpdHours() : "9:00 AM - 5:00 PM");
        dto.setRating(h.getRating() != null ? h.getRating() : 4.0);

        // Department count for this hospital
        int deptCount = (int) deptRepository.findByHospitalId(h.getId()).size();
        dto.setDepartmentCount(deptCount);

        // Accreditation as list
        if (h.getAccreditation() != null && !h.getAccreditation().isBlank()) {
            dto.setAccreditation(Arrays.asList(h.getAccreditation().split(",")));
        } else {
            dto.setAccreditation(Collections.emptyList());
        }

        return dto;
    }

    private AppointmentSummaryDTO toAppointmentSummaryDTO(Appointment a) {
        AppointmentSummaryDTO dto = new AppointmentSummaryDTO();
        dto.setId(a.getId());
        dto.setDate(a.getDateStr());
        dto.setStatus(a.getStatus());
        dto.setTokenNumber(a.getTokenNum());

        if (a.getDoctor() != null) {
            dto.setDoctorName(a.getDoctor().getDoctorName());
        }

        // Expected time calculation
        if (a.getDoctor() != null && a.getTokenNum() != null && !"cancelled".equals(a.getStatus())) {
            int avgMins = Optional.ofNullable(a.getDoctor().getAvgMinutesPerPatient()).orElse(15);
            LocalTime time = LocalTime.of(9, 0).plusMinutes((long) (a.getTokenNum() - 1) * avgMins);
            dto.setExpectedTimeStr(formatTime(time));
        }

        // Hospital and department names via denormalized fields
        if (a.getHospitalId() != null) {
            Hospital h = hospitalRepository.findById(a.getHospitalId()).orElse(null);
            if (h != null) dto.setHospitalName(h.getName());
        }
        if (a.getDepartmentId() != null) {
            HospitalDepartment hd = deptRepository.findById(a.getDepartmentId()).orElse(null);
            if (hd != null) dto.setDepartmentName(hd.getDepartmentName());
        }

        return dto;
    }

    // Inner static class to match frontend's expected shape
    public static class DepartmentSummary {
        private Long id;
        private String conditionName;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getConditionName() { return conditionName; }
        public void setConditionName(String conditionName) { this.conditionName = conditionName; }
    }
}
