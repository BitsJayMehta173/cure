package com.medroute.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Stub controller for Case Records API called from Doctor Portal.
 */
@RestController
@RequestMapping("/api/case-records")
@CrossOrigin(origins = "*")
public class CaseRecordsController {

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<Map<String, Object>> getRecordsForAppointment(
            @PathVariable Long appointmentId,
            @RequestParam Long doctorId) {
        
        Map<String, Object> response = new HashMap<>();
        response.put("appointmentId", appointmentId);
        response.put("referralId", null);
        response.put("canAdd", true);
        response.put("reports", new ArrayList<>());
        response.put("prescriptions", new ArrayList<>());
        response.put("notes", new ArrayList<>());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/referral/{referralId}")
    public ResponseEntity<Map<String, Object>> getRecordsForReferral(
            @PathVariable Long referralId,
            @RequestParam Long doctorId) {
        
        Map<String, Object> response = new HashMap<>();
        response.put("appointmentId", null);
        response.put("referralId", referralId);
        response.put("canAdd", true);
        response.put("reports", new ArrayList<>());
        response.put("prescriptions", new ArrayList<>());
        response.put("notes", new ArrayList<>());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reports")
    public ResponseEntity<?> addReport(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Report added successfully"));
    }

    @PostMapping("/prescriptions")
    public ResponseEntity<?> addPrescription(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(Map.of("success", true, "message", "Prescription added successfully"));
    }
}
