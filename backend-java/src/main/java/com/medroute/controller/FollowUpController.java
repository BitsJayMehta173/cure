package com.medroute.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stub controller for Follow-Up API called from Doctor Portal.
 */
@RestController
@RequestMapping("/api/follow-ups")
@CrossOrigin(origins = "*")
public class FollowUpController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> createFollowUp(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", System.currentTimeMillis() % 10000);
        response.put("status", payload.get("date") != null ? "BOOKED" : "OPEN");
        response.put("notes", payload.get("notes"));
        response.put("createdAt", java.time.LocalDateTime.now().toString());
        response.put("actions", new ArrayList<>());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient")
    public ResponseEntity<List<Map<String, Object>>> getFollowUpsForPatient(@RequestParam Long userId) {
        return ResponseEntity.ok(new ArrayList<>());
    }

    @PostMapping("/{id}/book")
    public ResponseEntity<Map<String, Object>> bookFollowUp(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", id);
        response.put("status", "BOOKED");
        response.put("actions", new ArrayList<>());
        return ResponseEntity.ok(response);
    }
}
