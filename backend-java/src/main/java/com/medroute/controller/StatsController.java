package com.medroute.controller;

import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Returns live network statistics computed from the database.
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
        // Exclude cancelled from "Total Bookings Made"
        long totalAppointments = appointmentRepository.countByStatusNot("cancelled");

        // Sum of dailyLimit across all doctors — single SQL aggregate, no entity load
        long totalDailyCapacity = doctorRepository.sumDailyLimit();

        // Bookings made today (non-cancelled) — single filtered count, no entity load
        String today = LocalDate.now().toString();
        long bookedToday = appointmentRepository.countByDateStrAndStatusNot(today, "cancelled");

        long availableSlotsToday = Math.max(0, totalDailyCapacity - bookedToday);

        Map<String, String> stats = new LinkedHashMap<>();
        stats.put("Total Available Doctors", String.valueOf(doctors));
        stats.put("Total Live Hospitals", String.valueOf(hospitals));
        stats.put("Available Slots Today", String.valueOf(availableSlotsToday));
        stats.put("Total Bookings Made", String.valueOf(totalAppointments));
        return stats;
    }
}
