package com.medroute.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping("/capacity")
    public ResponseEntity<Map<String, Object>> getCapacityStats() {
        return ResponseEntity.ok(Map.of(
                "total_available_doctors", 248,
                "total_live_hospitals", 42,
                "total_available_beds", 1284,
                "shortest_queue_mins", 15
        ));
    }
}
