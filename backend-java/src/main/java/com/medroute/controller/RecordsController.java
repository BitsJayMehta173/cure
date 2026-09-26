package com.medroute.controller;

import com.medroute.dto.MedicalReportDTO;
import com.medroute.dto.PatientRecordDTO;
import com.medroute.dto.PrescriptionDTO;
import com.medroute.service.PatientRecordsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Patient Records API — the patient chooser (with unread-notification
 * badges) and appointment-scoped Reports / Medicine data.
 *
 * Base path: /api/records
 */
@RestController
@RequestMapping("/api/records")
@CrossOrigin(origins = "*")
public class RecordsController {

    @Autowired
    private PatientRecordsService recordsService;

    /**
     * GET /api/records/patients?userId=
     * Patient profiles owned by this user, each with an unread-notification count.
     */
    @GetMapping("/patients")
    public ResponseEntity<List<PatientRecordDTO>> getPatients(@RequestParam Long userId) {
        return ResponseEntity.ok(recordsService.getPatientsWithNotifications(userId));
    }

    /**
     * GET /api/records/reports?appointmentId=&userId=
     */
    @GetMapping("/reports")
    public ResponseEntity<List<MedicalReportDTO>> getReports(
            @RequestParam Long appointmentId,
            @RequestParam Long userId) {
        try {
            return ResponseEntity.ok(recordsService.getReports(appointmentId, userId));
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        }
    }

    /**
     * GET /api/records/medicines?appointmentId=&userId=
     */
    @GetMapping("/medicines")
    public ResponseEntity<List<PrescriptionDTO>> getMedicines(
            @RequestParam Long appointmentId,
            @RequestParam Long userId) {
        try {
            return ResponseEntity.ok(recordsService.getMedicines(appointmentId, userId));
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        }
    }

    /**
     * POST /api/records/patients/{patientId}/mark-read?userId=
     * Marks all of this patient's notifications as read — called when the
     * patient's gallery is opened, clearing the chooser badge.
     */
    @PostMapping("/patients/{patientId}/mark-read")
    public ResponseEntity<Void> markRead(
            @PathVariable Long patientId,
            @RequestParam Long userId) {
        try {
            recordsService.markPatientNotificationsRead(patientId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        }
    }
}
