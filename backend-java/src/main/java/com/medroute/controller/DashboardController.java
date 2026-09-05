package com.medroute.controller;

import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping("/capacity")
    public ResponseEntity<Map<String, Object>> getCapacityStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total_live_hospitals", hospitalRepository.count());
        stats.put("total_available_doctors", doctorRepository.count());
        stats.put("total_daily_capacity", doctorRepository.sumDailyLimit());
        return ResponseEntity.ok(stats);
    }
}
