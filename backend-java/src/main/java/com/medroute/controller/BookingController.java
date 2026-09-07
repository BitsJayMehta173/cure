package com.medroute.controller;

import com.medroute.dto.AppointmentDTO;
import com.medroute.dto.BookingRequestDTO;
import com.medroute.entity.Appointment;
import com.medroute.entity.Doctor;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalDepartmentRepository;
import com.medroute.repository.HospitalRepository;
import com.medroute.service.BookingFlowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private HospitalDepartmentRepository deptRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private com.medroute.repository.PatientRepository patientRepository;

    @Autowired
    private BookingFlowService bookingFlowService;

    /**
     * Book an appointment from the recommendation system.
     * Now sets patientFk, hospitalId, departmentId, status — so the booking
     * wizard and recommendation system share the same appointment data.
     */
    @PostMapping("/book")
    @Transactional
    public ResponseEntity<?> bookAppointment(@Valid @RequestBody BookingRequestDTO request) {
        // 1. Pessimistic lock on the doctor to prevent concurrent double bookings
        Doctor doctor = doctorRepository.findByIdWithLock(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // 2. Check current NON-CANCELLED bookings for the given date
        long currentBookings = appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                doctor.getId(), request.getDateStr(), "cancelled");

        // 3. Enforce daily limit
        if (currentBookings >= doctor.getDailyLimit()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Daily limit reached for doctor on " + request.getDateStr());
        }

        // 3a. Use MONOTONIC token assignment — never reuses cancelled token numbers.
        // Same logic as the booking wizard's confirmBooking, so token numbers
        // are consistent across both entry points and never decrease on cancel.
        int dailyLimit = java.util.Optional.ofNullable(doctor.getDailyLimit()).orElse(0);
        int assignedToken = bookingFlowService.nextAvailableToken(
                doctor.getId(),
                java.time.LocalDate.parse(request.getDateStr()),
                dailyLimit);
        if (assignedToken == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Daily limit reached for doctor on " + request.getDateStr());
        }

        // 4. Create appointment with all new fields
        Appointment appointment = new Appointment();
        appointment.setDoctor(doctor);
        appointment.setDateStr(request.getDateStr());
        appointment.setPatientName(request.getPatientName());
        appointment.setSource(request.getSource());
        appointment.setStatus("confirmed");

        // Link to patient profile if provided (enables unified appointment tracking)
        if (request.getPatientFk() != null) {
            appointment.setPatientFk(request.getPatientFk());
        } else if (request.getPatientName() != null && !request.getPatientName().isBlank()) {
            patientRepository.findFirstByFullNameIgnoreCase(request.getPatientName().trim())
                    .ifPresent(p -> appointment.setPatientFk(p.getId()));
        }

        if ((appointment.getPatientName() == null || appointment.getPatientName().isBlank()) && appointment.getPatientFk() != null) {
            patientRepository.findById(appointment.getPatientFk())
                    .ifPresent(p -> appointment.setPatientName(p.getFullName()));
        }

        // Denormalize hospital + department IDs for fast wizard queries
        var dept = doctor.getDepartment();
        if (dept != null) {
            appointment.setDepartmentId(dept.getId());
            var hospital = dept.getHospital();
            if (hospital != null) {
                appointment.setHospitalId(hospital.getId());
            }
        }

        // Generate unique token code (displayed to the user)
        String tokenCode = "TKN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        appointment.setTokenCode(tokenCode);
        appointment.setTokenNum(assignedToken);

        Appointment saved = appointmentRepository.save(appointment);

        // 5. Build response DTO
        AppointmentDTO dto = new AppointmentDTO();
        dto.setName(saved.getDoctor().getDoctorName());
        dto.setDate(saved.getDateStr());
        dto.setToken(saved.getTokenNum());
        dto.setStatus("confirmed");
        dto.setTradeoffLabel("Token: " + saved.getTokenCode());
        dto.setDoctorId(saved.getDoctor().getId());

        // Shift hours
        int avgMins = java.util.Optional.ofNullable(doctor.getAvgMinutesPerPatient()).orElse(15);
        int tokenNum = saved.getTokenNum();
        LocalTime time = LocalTime.of(9, 0).plusMinutes((long) (tokenNum - 1) * avgMins);
        int hour = time.getHour();
        int minute = time.getMinute();
        String ampm = hour >= 12 ? "PM" : "AM";
        int displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        String timeStr = String.format("%02d:%02d %s", displayHour, minute, ampm);

        LocalTime shiftEnd = LocalTime.of(9, 0).plusMinutes((long) doctor.getDailyLimit() * avgMins);
        int endHour = shiftEnd.getHour();
        int endMin = shiftEnd.getMinute();
        String endAmpm = endHour >= 12 ? "PM" : "AM";
        int endDisplayHour = endHour > 12 ? endHour - 12 : (endHour == 0 ? 12 : endHour);
        dto.setShiftHours("09:00 AM - " + String.format("%02d:%02d %s", endDisplayHour, endMin, endAmpm));
        dto.setTime(timeStr);

        return ResponseEntity.ok(dto);
    }
}
