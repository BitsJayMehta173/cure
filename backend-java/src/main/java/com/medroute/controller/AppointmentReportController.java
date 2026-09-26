package com.medroute.controller;

import com.medroute.dto.AppointmentReportView;
import com.medroute.service.AppointmentReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * Patient's downloadable appointment report — returns the data the frontend renders
 * into a PDF (one visit: patient, doctor, hospital, advice, reports, prescriptions).
 *
 * Base path: /api/appointment-report
 */
@RestController
@RequestMapping("/api/appointment-report")
@CrossOrigin(origins = "*")
public class AppointmentReportController {

    @Autowired
    private AppointmentReportService appointmentReportService;

    /** GET /api/appointment-report/{appointmentId}?userId= — only for the account owning the patient profile. */
    @GetMapping("/{appointmentId}")
    public AppointmentReportView get(@PathVariable Long appointmentId, @RequestParam Long userId) {
        return appointmentReportService.build(appointmentId, userId);
    }
}
