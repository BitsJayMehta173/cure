package com.medroute.controller;

import com.medroute.entity.Appointment;
import com.medroute.entity.Patient;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Doctor Portal API — doctor-facing data endpoints.
 * Used by the Doctor Dashboard for the Patient Directory and Appointments tabs.
 *
 * Base path: /api/doctor-portal
 */
@RestController
@RequestMapping("/api/doctor-portal")
@CrossOrigin(origins = "*")
public class DoctorPortalController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    /**
     * GET /api/doctor-portal/patients?doctorId=
     * Returns distinct patients who have had an appointment with this doctor.
     * Only includes appointments with a linked patient profile (patientFk != null).
     */
    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getDoctorPatients(
            @RequestParam Long doctorId,
            @RequestParam(required = false) String search) {

        List<Appointment> appointments = appointmentRepository.findByDoctorIdOrderByIdDesc(doctorId);

        // Get distinct patient IDs
        Set<Long> patientIds = appointments.stream()
                .filter(a -> a.getPatientFk() != null)
                .map(Appointment::getPatientFk)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Long patientId : patientIds) {
            patientRepository.findById(patientId).ifPresent(p -> {
                // Find latest appointment for this patient with this doctor
                Optional<Appointment> lastAppt = appointments.stream()
                        .filter(a -> patientId.equals(a.getPatientFk()))
                        .findFirst();

                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("fullName", p.getFullName() != null ? p.getFullName() : "Unknown");
                map.put("age", p.getAge());
                map.put("gender", p.getGender() != null ? p.getGender() : "");
                map.put("bloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
                map.put("mobile", p.getMobile() != null ? p.getMobile() : "");
                map.put("relation", p.getRelation() != null ? p.getRelation() : "");
                map.put("lastVisitDate", lastAppt.map(Appointment::getDateStr).orElse(""));
                map.put("lastVisitStatus", lastAppt.map(Appointment::getStatus).orElse(""));
                result.add(map);
            });
        }

        // Apply search filter
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            return ResponseEntity.ok(result.stream()
                    .filter(m -> {
                        String name = ((String) m.get("fullName")).toLowerCase();
                        String mobile = ((String) m.get("mobile")).toLowerCase();
                        String bg = ((String) m.get("bloodGroup")).toLowerCase();
                        return name.contains(q) || mobile.contains(q) || bg.contains(q);
                    })
                    .collect(Collectors.toList()));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/doctor-portal/appointments?doctorId=&date=YYYY-MM-DD
     * Returns appointments for this doctor on the given date, ordered by token number.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getDoctorAppointments(
            @RequestParam Long doctorId,
            @RequestParam String date) {

        List<Appointment> appointments =
                appointmentRepository.findByDoctorIdAndDateStrOrderByTokenNumAsc(doctorId, date);

        List<Map<String, Object>> result = appointments.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("patientName", a.getPatientName() != null ? a.getPatientName() : "Walk-in Patient");
            map.put("patientFk", a.getPatientFk());
            map.put("tokenNum", a.getTokenNum());
            map.put("tokenCode", a.getTokenCode());
            map.put("dateStr", a.getDateStr());
            map.put("status", a.getStatus());
            map.put("generalAdvice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "");

            // Calculate expected time from token number and avg minutes
            int avgMins = 15;
            if (a.getDoctor() != null && a.getDoctor().getAvgMinutesPerPatient() != null) {
                avgMins = a.getDoctor().getAvgMinutesPerPatient();
            }
            int tokenNum = a.getTokenNum() != null ? a.getTokenNum() : 1;
            int minutesFromStart = (tokenNum - 1) * avgMins;
            int startHour = 9; // 9:00 AM
            int totalMinutes = startHour * 60 + minutesFromStart;
            int hour = totalMinutes / 60;
            int min = totalMinutes % 60;
            String ampm = hour >= 12 ? "PM" : "AM";
            int displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
            map.put("expectedTimeStr", String.format("%02d:%02d %s", displayHour, min, ampm));

            // Hospital & department
            String hospName = "";
            String deptName = "";
            if (a.getDoctor() != null && a.getDoctor().getDepartment() != null) {
                deptName = a.getDoctor().getDepartment().getDepartmentName();
                if (a.getDoctor().getDepartment().getHospital() != null) {
                    hospName = a.getDoctor().getDepartment().getHospital().getName();
                }
            }
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            map.put("doctorName", a.getDoctor() != null ? a.getDoctor().getDoctorName() : "");

            // Patient info if linked
            if (a.getPatientFk() != null) {
                patientRepository.findById(a.getPatientFk()).ifPresent(p -> {
                    map.put("patientAge", p.getAge());
                    map.put("patientGender", p.getGender() != null ? p.getGender() : "");
                    map.put("patientBloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
                    map.put("patientMobile", p.getMobile() != null ? p.getMobile() : "");
                });
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/doctor-portal/appointment-dates?doctorId=
     * Returns distinct dates (YYYY-MM-DD) on which this doctor has appointments, newest first.
     */
    @GetMapping("/appointment-dates")
    public ResponseEntity<List<String>> getAppointmentDates(@RequestParam Long doctorId) {
        List<Appointment> appointments = appointmentRepository.findByDoctorIdOrderByIdDesc(doctorId);
        List<String> dates = appointments.stream()
                .map(Appointment::getDateStr)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dates);
    }

    /**
     * GET /api/doctor-portal/appointments/{id}/advice
     * Returns the general advice for an appointment.
     */
    @GetMapping("/appointments/{id}/advice")
    public ResponseEntity<Map<String, String>> getAdvice(@PathVariable Long id) {
        return appointmentRepository.findById(id)
                .map(a -> ResponseEntity.ok(Map.of("advice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "")))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/doctor-portal/appointments/{id}/advice
     * Updates the general advice for an appointment.
     */
    @PutMapping("/appointments/{id}/advice")
    public ResponseEntity<Map<String, String>> updateAdvice(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return appointmentRepository.findById(id)
                .map(a -> {
                    a.setGeneralAdvice(body.getOrDefault("advice", ""));
                    appointmentRepository.save(a);
                    return ResponseEntity.ok(Map.of("advice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : ""));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
