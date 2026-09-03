package com.medroute.controller;

import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Returns live network statistics computed directly from the database.
 * The frontend stats slider reads from here instead of hardcoded data.ts.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StatsController {

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @GetMapping("/stats")
    public Map<String, String> getLiveStats() {
        long hospitals = hospitalRepository.count();
        long doctors = doctorRepository.count();
        long appointments = appointmentRepository.count();

        // Total remaining slots today = sum of (dailyLimit - bookedToday) across all doctors
        // Simplified: total daily capacity - appointments booked
        long totalCapacity = doctorRepository.findAll()
                .stream()
                .mapToLong(d -> d.getDailyLimit())
                .sum();
        long slotsLeft = Math.max(0, totalCapacity - appointments);

        Map<String, String> stats = new LinkedHashMap<>();
        stats.put("Total Available Doctors", String.valueOf(doctors));
        stats.put("Total Live Hospitals", String.valueOf(hospitals));
        stats.put("Available Slots Today", String.valueOf(slotsLeft));
        stats.put("Total Bookings Made", String.valueOf(appointments));
        return stats;
    }
}
