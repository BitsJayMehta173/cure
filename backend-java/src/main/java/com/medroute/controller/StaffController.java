package com.medroute.controller;

import com.medroute.entity.Appointment;
import com.medroute.entity.Patient;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.PatientRepository;
import com.medroute.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Staff Administration API.
 * Allows hospital desk staff to view, search, and edit patient profiles and appointments.
 * Strictly prevents any edits to Doctor profiles or credentials.
 *
 * Base path: /api/staff
 */
@RestController
@RequestMapping("/api/staff")
@CrossOrigin(origins = "*")
public class StaffController {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    /**
     * GET /api/staff/patients
     * Returns all patients in the system with demographic information.
     */
    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getAllPatients(
            @RequestParam(required = false) String search) {
        List<Patient> patients = patientRepository.findAll();

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            patients = patients.stream()
                    .filter(p -> (p.getFullName() != null && p.getFullName().toLowerCase().contains(q))
                            || (p.getMobile() != null && p.getMobile().contains(q))
                            || (p.getBloodGroup() != null && p.getBloodGroup().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> response = patients.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("fullName", p.getFullName());
            map.put("age", p.getAge());
            map.put("gender", p.getGender());
            map.put("bloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
            map.put("mobile", p.getMobile());
            map.put("relation", p.getRelation());
            map.put("createdAt", p.getCreatedAt());
            map.put("userAccountId", p.getUserAccountId());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/staff/patients/{id}
     * Staff can edit any patient information.
     */
    @PutMapping("/patients/{id}")
    public ResponseEntity<?> updatePatient(@PathVariable Long id, @RequestBody PatientUpdateRequest req) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));

        if (req.fullName != null && !req.fullName.isBlank()) {
            patient.setFullName(req.fullName.trim());
        }
        if (req.age != null) {
            patient.setAge(Math.max(0, req.age));
        }
        if (req.gender != null && !req.gender.isBlank()) {
            patient.setGender(req.gender.trim());
        }
        if (req.bloodGroup != null) {
            patient.setBloodGroup(req.bloodGroup.trim());
        }
        if (req.mobile != null && !req.mobile.isBlank()) {
            patient.setMobile(req.mobile.trim());
        }
        if (req.relation != null && !req.relation.isBlank()) {
            patient.setRelation(req.relation.trim());
        }

        Patient saved = patientRepository.save(patient);

        // Also sync name to UserAccount if this was default patient
        if (saved.getUserAccountId() != null) {
            userAccountRepository.findById(saved.getUserAccountId()).ifPresent(user -> {
                if (saved.getId().equals(user.getDefaultPatientId())) {
                    if (req.fullName != null && !req.fullName.isBlank()) {
                        user.setFullName(req.fullName.trim());
                    }
                    if (req.mobile != null && !req.mobile.isBlank()) {
                        user.setMobile(req.mobile.trim());
                    }
                    userAccountRepository.save(user);
                }
            });
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", saved.getId());
        resp.put("fullName", saved.getFullName());
        resp.put("age", saved.getAge());
        resp.put("gender", saved.getGender());
        resp.put("bloodGroup", saved.getBloodGroup());
        resp.put("mobile", saved.getMobile());
        resp.put("relation", saved.getRelation());
        resp.put("userAccountId", saved.getUserAccountId());

        return ResponseEntity.ok(resp);
    }

    /**
     * DELETE /api/staff/patients/{id}
     * Staff can delete a patient record.
     */
    @DeleteMapping("/patients/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        if (!patientRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found");
        }
        patientRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/staff/appointments
     * Returns appointments for staff queue monitoring.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getAllAppointments() {
        List<Appointment> list = appointmentRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> response = list.stream().limit(50).map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("patientName", a.getPatientName());
            map.put("patientFk", a.getPatientFk());
            String docName = (a.getDoctor() != null) ? a.getDoctor().getDoctorName() : "Doctor";
            Long docId = (a.getDoctor() != null) ? a.getDoctor().getId() : null;
            String deptName = "";
            String hospName = "";
            if (a.getDoctor() != null && a.getDoctor().getDepartment() != null) {
                deptName = a.getDoctor().getDepartment().getDepartmentName();
                if (a.getDoctor().getDepartment().getHospital() != null) {
                    hospName = a.getDoctor().getDepartment().getHospital().getName();
                }
            }

            map.put("doctorName", docName);
            map.put("doctorId", docId);
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            map.put("dateStr", a.getDateStr());
            map.put("tokenCode", a.getTokenCode());
            map.put("tokenNum", a.getTokenNum());
            map.put("status", a.getStatus());
            map.put("source", a.getSource());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/staff/appointments/{id}/status
     * Allows staff to mark an appointment as confirmed, completed, or cancelled.
     */
    @PutMapping("/appointments/{id}/status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }

        Appointment app = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        app.setStatus(newStatus.trim().toLowerCase());
        Appointment saved = appointmentRepository.save(app);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "status", saved.getStatus()));
    }

    public static class PatientUpdateRequest {
        public String fullName;
        public Integer age;
        public String gender;
        public String bloodGroup;
        public String mobile;
        public String relation;
    }
}
