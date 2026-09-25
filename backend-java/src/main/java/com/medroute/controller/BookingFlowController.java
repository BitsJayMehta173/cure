package com.medroute.controller;

import com.medroute.dto.*;
import com.medroute.entity.Patient;
import com.medroute.entity.Referral;
import com.medroute.repository.PatientRepository;
import com.medroute.repository.ReferralRepository;
import com.medroute.service.BookingFlowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Booking Wizard API — handles the multi-step appointment booking flow.
 *
 * All endpoints use the same slot calculation logic as the recommendation
 * system (via BookingFlowService), so both views stay in sync.
 *
 * Base path: /api/booking
 */
@RestController
@RequestMapping("/api/booking")
@CrossOrigin(origins = "*")
public class BookingFlowController {

    @Autowired
    private BookingFlowService bookingService;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ReferralRepository referralRepository;

    /**
     * GET /api/booking/referrals?userId=
     * Returns referral summaries for all patients belonging to this user.
     * These are shown as special "referred" cards in the appointments list.
     */
    @GetMapping("/referrals")
    public ResponseEntity<List<Map<String, Object>>> getReferralsForUser(@RequestParam Long userId) {
        List<Patient> patients = patientRepository.findByUserAccountIdOrderByIdDesc(userId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Patient patient : patients) {
            List<Referral> referrals = referralRepository.findByPatientId(patient.getId());
            for (Referral ref : referrals) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("referralId", ref.getId());
                map.put("referralType", ref.getReferralType());
                map.put("notes", ref.getNotes() != null ? ref.getNotes() : "");
                map.put("createdAt", ref.getCreatedAt() != null ? ref.getCreatedAt().toLocalDate().toString() : "");

                // Patient
                map.put("patientId", patient.getId());
                map.put("patientName", patient.getFullName());

                // Referring doctor
                if (ref.getReferredByDoctor() != null) {
                    map.put("referredByDoctorName", ref.getReferredByDoctor().getDoctorName());
                    map.put("referredByDoctorQual", ref.getReferredByDoctor().getQualification() != null
                            ? ref.getReferredByDoctor().getQualification() : "");
                    String byHosp = "";
                    if (ref.getReferredByDoctor().getDepartment() != null
                            && ref.getReferredByDoctor().getDepartment().getHospital() != null) {
                        byHosp = ref.getReferredByDoctor().getDepartment().getHospital().getName();
                    }
                    map.put("referredByHospital", byHosp);
                    String byDept = "";
                    if (ref.getReferredByDoctor().getDepartment() != null) {
                        byDept = ref.getReferredByDoctor().getDepartment().getDepartmentName();
                    }
                    map.put("referredByDept", byDept);
                }

                // Referred-to doctor
                if (ref.getReferredToDoctor() != null) {
                    map.put("referredToDoctorId", ref.getReferredToDoctor().getId());
                    map.put("referredToDoctorName", ref.getReferredToDoctor().getDoctorName());
                    map.put("referredToDoctorQual", ref.getReferredToDoctor().getQualification() != null
                            ? ref.getReferredToDoctor().getQualification() : "");
                    String toHosp = "";
                    String toDept = "";
                    if (ref.getReferredToDoctor().getDepartment() != null) {
                        map.put("referredToDeptId", ref.getReferredToDoctor().getDepartment().getId());
                        toDept = ref.getReferredToDoctor().getDepartment().getDepartmentName();
                        if (ref.getReferredToDoctor().getDepartment().getHospital() != null) {
                            map.put("referredToHospitalId", ref.getReferredToDoctor().getDepartment().getHospital().getId());
                            toHosp = ref.getReferredToDoctor().getDepartment().getHospital().getName();
                        }
                    }
                    map.put("referredToHospital", toHosp);
                    map.put("referredToDept", toDept);
                }

                // Linked appointment (from original booking, if SINGLE_CASE)
                if (ref.getAppointment() != null) {
                    map.put("sourceAppointmentId", ref.getAppointment().getId());
                    map.put("sourceAppointmentDate", ref.getAppointment().getDateStr());
                }

                // Status
                map.put("referralStatus", ref.getReferralStatus() != null ? ref.getReferralStatus() : "pending");

                result.add(map);
            }
        }
        return ResponseEntity.ok(result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/profiles?userId=
     * Returns patient profiles owned by a specific user, newest first.
     */
    @GetMapping("/profiles")
    public ResponseEntity<List<PatientProfileDTO>> getProfiles(
            @RequestParam Long userId) {
        return ResponseEntity.ok(bookingService.getAllProfiles(userId));
    }

    /**
     * POST /api/booking/profiles?userId=
     * Creates a new patient profile for the given user.
     * Body: { fullName, age, gender, bloodGroup, mobile, relation }
     */
    @PostMapping("/profiles")
    public ResponseEntity<PatientProfileDTO> createProfile(
            @RequestParam Long userId,
            @RequestBody @Valid PatientProfileRequest req) {
        PatientProfileDTO created = bookingService.createProfile(
                req.fullName,
                req.age,
                req.gender,
                req.bloodGroup,
                req.mobile,
                req.relation,
                userId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * DELETE /api/booking/profiles/{id}?userId=
     * Deletes a patient profile owned by the given user.
     */
    @DeleteMapping("/profiles/{id}")
    public ResponseEntity<Void> deleteProfile(@PathVariable Long id,
                                               @RequestParam Long userId) {
        bookingService.deleteProfile(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSPITAL BROWSE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/states
     * Returns all states that have hospitals.
     */
    @GetMapping("/states")
    public ResponseEntity<List<String>> getStates() {
        return ResponseEntity.ok(bookingService.getAllStates());
    }

    /**
     * GET /api/booking/hospitals?state=<state>
     * Returns hospitals in the given state with rich metadata.
     */
    @GetMapping("/hospitals")
    public ResponseEntity<List<HospitalSummaryDTO>> getHospitals(
            @RequestParam String state) {
        return ResponseEntity.ok(bookingService.getHospitalsByState(state));
    }

    /**
     * GET /api/booking/departments?hospitalId=<id>
     * Returns departments (conditions) available at a hospital.
     */
    @GetMapping("/departments")
    public ResponseEntity<List<BookingFlowService.DepartmentSummary>> getDepartments(
            @RequestParam Long hospitalId) {
        return ResponseEntity.ok(bookingService.getDepartmentsByHospital(hospitalId));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SLOT CALENDAR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/slots?hospitalId=&deptId=&month=YYYY-MM
     * Returns a month's worth of slot data for the booking calendar.
     */
    @GetMapping("/slots")
    public ResponseEntity<List<SlotAvailabilityDTO>> getSlots(
            @RequestParam Long hospitalId,
            @RequestParam Long deptId,
            @RequestParam String month,
            @RequestParam(required = false) String state) {
        // If state omitted, look up the hospital's actual state so holidays match correctly
        String hospState = state;
        if (hospState == null || hospState.isBlank()) {
            hospState = bookingService.getHospitalState(hospitalId);
        }
        return ResponseEntity.ok(bookingService.getMonthlySlots(hospitalId, deptId, month, hospState));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOKEN PREVIEW
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/preview?hospitalId=&deptId=&date=YYYY-MM-DD
     * Returns the doctor + token number + expected time for a booking slot.
     */
    @GetMapping("/preview")
    public ResponseEntity<TokenPreviewDTO> getPreview(
            @RequestParam Long hospitalId,
            @RequestParam Long deptId,
            @RequestParam String date,
            @RequestParam(required = false) String state) {
        LocalDate parsedDate = LocalDate.parse(date);
        String hospState = (state != null && !state.isBlank())
                ? state
                : bookingService.getHospitalState(hospitalId);
        TokenPreviewDTO preview = bookingService.previewToken(hospitalId, deptId, parsedDate, hospState);
        if (preview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No doctors available for this department.");
        }
        return ResponseEntity.ok(preview);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AVAILABLE DOCTORS (for the confirm-booking doctor dropdown)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/available-doctors?hospitalId=&deptId=&date=YYYY-MM-DD
     * Returns all doctors in a department with remaining slots on a given date.
     * Sorted by earliest available token first.
     */
    @GetMapping("/available-doctors")
    public ResponseEntity<List<AvailableDoctorDTO>> getAvailableDoctors(
            @RequestParam Long hospitalId,
            @RequestParam Long deptId,
            @RequestParam String date,
            @RequestParam(required = false) String state) {
        LocalDate parsedDate = LocalDate.parse(date);
        String hospState = (state != null && !state.isBlank())
                ? state
                : bookingService.getHospitalState(hospitalId);
        return ResponseEntity.ok(
                bookingService.getAvailableDoctors(hospitalId, deptId, parsedDate, hospState));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIRM BOOKING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/booking/confirm?profileId=&hospitalId=&deptId=&date=YYYY-MM-DD[&doctorId=]
     * Locks a slot and creates the appointment. If doctorId is provided, books
     * that specific doctor; otherwise auto-assigns the least-busy one.
     */
    @PostMapping("/confirm")
    public ResponseEntity<BookingConfirmationDTO> confirmBooking(
            @RequestParam Long profileId,
            @RequestParam Long hospitalId,
            @RequestParam Long deptId,
            @RequestParam String date,
            @RequestParam(required = false) Long doctorId) {
        LocalDate parsedDate = LocalDate.parse(date);
        try {
            BookingConfirmationDTO confirmed = bookingService.confirmBooking(
                    profileId, hospitalId, deptId, doctorId, parsedDate);
            return ResponseEntity.ok(confirmed);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // APPOINTMENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/appointments?userId=&profileId=
     * Returns appointments for the user (filtered by profile if provided), newest first.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentSummaryDTO>> getAppointments(
            @RequestParam Long userId,
            @RequestParam(required = false) Long profileId) {
        return ResponseEntity.ok(bookingService.getPatientAppointments(profileId, userId));
    }

    /**
     * DELETE /api/booking/appointments/{id}?userId=
     * Cancels an appointment (soft-delete). userId is required to verify ownership.
     */
    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<Void> cancelAppointment(
            @PathVariable Long id,
            @RequestParam Long userId) {
        try {
            bookingService.cancelAppointment(id, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * DELETE /api/booking/appointments/{id}/remove
     * Permanently removes a cancelled appointment from the list.
     */
    @DeleteMapping("/appointments/{id}/remove")
    public ResponseEntity<Void> removeAppointment(@PathVariable Long id) {
        try {
            bookingService.removeAppointment(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REQUEST BODY DTO
    // ═══════════════════════════════════════════════════════════════════════════

    public static class PatientProfileRequest {
        public String fullName;
        public Integer age;
        public String gender;
        public String bloodGroup;
        public String mobile;
        public String relation;
    }
}
