package com.medroute.controller;

import com.medroute.dto.*;
import com.medroute.service.BookingFlowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import java.time.LocalDate;
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

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/booking/profiles
     * Returns all patient profiles, newest first.
     */
    @GetMapping("/profiles")
    public ResponseEntity<List<PatientProfileDTO>> getProfiles() {
        return ResponseEntity.ok(bookingService.getAllProfiles());
    }

    /**
     * POST /api/booking/profiles
     * Creates a new patient profile.
     * Body: { fullName, age, gender, bloodGroup, mobile, relation }
     */
    @PostMapping("/profiles")
    public ResponseEntity<PatientProfileDTO> createProfile(@RequestBody @Valid PatientProfileRequest req) {
        PatientProfileDTO created = bookingService.createProfile(
                req.fullName,
                req.age,
                req.gender,
                req.bloodGroup,
                req.mobile,
                req.relation
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * DELETE /api/booking/profiles/{id}
     * Deletes a patient profile. Does NOT cascade — appointments remain.
     */
    @DeleteMapping("/profiles/{id}")
    public ResponseEntity<Void> deleteProfile(@PathVariable Long id) {
        bookingService.deleteProfile(id);
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
     * GET /api/booking/appointments?profileId=
     * Returns appointments for a patient (or all if profileId is omitted), newest first.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentSummaryDTO>> getAppointments(
            @RequestParam(required = false) Long profileId) {
        return ResponseEntity.ok(bookingService.getPatientAppointments(profileId));
    }

    /**
     * DELETE /api/booking/appointments/{id}
     * Cancels an appointment (soft-delete).
     */
    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<Void> cancelAppointment(
            @PathVariable Long id,
            @RequestParam(required = false) Long profileId) {
        try {
            bookingService.cancelAppointment(id, profileId);
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
