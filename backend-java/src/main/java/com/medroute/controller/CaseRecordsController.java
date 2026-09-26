package com.medroute.controller;

import com.medroute.dto.MedicalReportDTO;
import com.medroute.dto.PrescriptionDTO;
import com.medroute.dto.ReferralViews.*;
import com.medroute.service.CaseRecordsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Doctor-facing case file: reports / prescriptions / notes of a visit and its care
 * chain, with ownership on every item. Records are append-only — once written they
 * cannot be edited. Writes are validated by CaseRecordsService.
 *
 * Base path: /api/case-records
 */
@RestController
@RequestMapping("/api/case-records")
@CrossOrigin(origins = "*")
public class CaseRecordsController {

    @Autowired
    private CaseRecordsService caseRecordsService;

    /** GET /api/case-records/appointment/{id}?doctorId= — visit + inherited records. */
    @GetMapping("/appointment/{id}")
    public CaseRecordsView forAppointment(@PathVariable Long id, @RequestParam Long doctorId) {
        return caseRecordsService.forAppointment(id, doctorId);
    }

    /** GET /api/case-records/referral/{id}?doctorId= — the case file shared by a referral. */
    @GetMapping("/referral/{id}")
    public CaseRecordsView forReferral(@PathVariable Long id, @RequestParam Long doctorId) {
        return caseRecordsService.forReferral(id, doctorId);
    }

    /** POST /api/case-records/reports — body: { doctorId, appointmentId | referralId, title, textContent, reportType?, fileUrl? } */
    @PostMapping("/reports")
    public ResponseEntity<MedicalReportDTO> addReport(@RequestBody AddReportRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(caseRecordsService.addReport(req));
    }

    /** POST /api/case-records/prescriptions — body: { doctorId, appointmentId | referralId, medicineName, dosage, frequency, duration, instructions } */
    @PostMapping("/prescriptions")
    public ResponseEntity<PrescriptionDTO> addPrescription(@RequestBody AddPrescriptionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(caseRecordsService.addPrescription(req));
    }
}
