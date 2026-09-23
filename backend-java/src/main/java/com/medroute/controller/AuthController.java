package com.medroute.controller;

import com.medroute.entity.Patient;
import com.medroute.entity.UserAccount;
import com.medroute.repository.PatientRepository;
import com.medroute.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Authentication controller — handles signup, login, and profile management.
 *
 * Uses SHA-256 password hashing (lightweight, no Spring Security dependency).
 * Not production-grade — suitable for demo/prototype purposes.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private com.medroute.repository.DoctorRepository doctorRepository;

    @Autowired
    private com.medroute.repository.HospitalDepartmentRepository departmentRepository;

    // ═══════════════════════════════════════════════════════════════════════
    // SIGNUP
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/auth/signup
     * Body: { fullName, email, mobile, password, role, doctorId, qualification, ... }
     * Supports DOCTOR, STAFF, PATIENT roles.
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        // Validate
        if (req.fullName == null || req.fullName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
        }
        if (req.email == null || req.email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (req.password == null || req.password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        // Check duplicate email
        if (userAccountRepository.existsByEmail(req.email.trim().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        String role = (req.role != null && !req.role.isBlank()) ? req.role.trim().toUpperCase() : "PATIENT";

        // 1. Create the user account
        UserAccount account = new UserAccount();
        account.setEmail(req.email.trim().toLowerCase());
        account.setPasswordHash(hashPassword(req.password));
        account.setFullName(req.fullName.trim());
        account.setMobile(req.mobile != null ? req.mobile.trim() : "");
        account.setRole(role);

        // If DOCTOR role: link to existing doctor or create new Doctor record
        if ("DOCTOR".equals(role)) {
            Long docId = req.doctorId;
            if (docId == null || docId <= 0) {
                String docName = req.fullName.trim();
                if (!docName.startsWith("Dr.") && !docName.startsWith("Dr ")) {
                    docName = "Dr. " + docName;
                }
                com.medroute.entity.Doctor doc = new com.medroute.entity.Doctor();
                doc.setDoctorName(docName);
                doc.setQualification(req.qualification != null && !req.qualification.isBlank() ? req.qualification.trim() : "MBBS, MD (Specialist)");
                doc.setDailyLimit(req.dailyLimit != null ? req.dailyLimit : 22);
                doc.setYearsOfExperience(req.yearsOfExperience != null ? req.yearsOfExperience : 12);
                doc.setTotalPatientsTreated(8100);
                doc.setAvgMinutesPerPatient(req.avgMinutesPerPatient != null ? req.avgMinutesPerPatient : 15);
                doc.setBio(req.bio != null && !req.bio.isBlank() ? req.bio : docName + " is a specialist providing patient-first healthcare and evidence-based treatments.");
                doc.setPhotoUrl("");

                Long deptId = req.deptId != null ? req.deptId : 1L;
                var deptOpt = departmentRepository.findById(deptId);
                if (deptOpt.isEmpty()) {
                    List<com.medroute.entity.HospitalDepartment> allDepts = departmentRepository.findAll();
                    if (!allDepts.isEmpty()) {
                        doc.setDepartment(allDepts.get(0));
                    }
                } else {
                    doc.setDepartment(deptOpt.get());
                }
                com.medroute.entity.Doctor savedDoc = doctorRepository.save(doc);
                docId = savedDoc.getId();
            }
            account.setDoctorId(docId);
        }

        UserAccount saved = userAccountRepository.save(account);

        // If PATIENT role: auto-create a default Patient profile
        if ("PATIENT".equals(role)) {
            Patient patient = new Patient();
            patient.setFullName(req.fullName.trim());
            patient.setAge(25);
            patient.setGender("other");
            patient.setBloodGroup("");
            patient.setMobile(req.mobile != null ? req.mobile.trim() : "0000000000");
            patient.setRelation("self");
            patient.setUserAccountId(saved.getId());
            Patient savedPatient = patientRepository.save(patient);

            account.setDefaultPatientId(savedPatient.getId());
            userAccountRepository.save(account);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(toUserResponse(saved));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/auth/login
     * Body: { email, password }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req.email == null || req.password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }

        UserAccount account = userAccountRepository.findByEmail(req.email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!hashPassword(req.password).equals(account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return ResponseEntity.ok(toUserResponse(account));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/auth/profile?userId=
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestParam Long userId) {
        UserAccount account = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(toUserResponse(account));
    }

    /**
     * PUT /api/auth/profile?userId=
     * Body: { fullName, email, mobile }
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestParam Long userId, @RequestBody ProfileUpdateRequest req) {
        UserAccount account = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.fullName != null && !req.fullName.isBlank()) {
            account.setFullName(req.fullName.trim());
        }
        if (req.email != null && !req.email.isBlank()) {
            String newEmail = req.email.trim().toLowerCase();
            // Check if new email is taken by another user
            userAccountRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(userId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
                }
            });
            account.setEmail(newEmail);
        }
        if (req.mobile != null) {
            account.setMobile(req.mobile.trim());
        }

        // Also update the linked Patient profile name if it exists
        if (account.getDefaultPatientId() != null) {
            patientRepository.findById(account.getDefaultPatientId()).ifPresent(patient -> {
                if (req.fullName != null && !req.fullName.isBlank()) {
                    patient.setFullName(req.fullName.trim());
                }
                if (req.mobile != null && !req.mobile.isBlank()) {
                    patient.setMobile(req.mobile.trim());
                }
                patientRepository.save(patient);
            });
        }

        UserAccount saved = userAccountRepository.save(account);
        return ResponseEntity.ok(toUserResponse(saved));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private Map<String, Object> toUserResponse(UserAccount account) {
        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("id", account.getId());
        resp.put("email", account.getEmail());
        resp.put("fullName", account.getFullName());
        resp.put("mobile", account.getMobile() != null ? account.getMobile() : "");
        resp.put("role", account.getRole());
        resp.put("doctorId", account.getDoctorId());
        resp.put("defaultPatientId", account.getDefaultPatientId() != null ? account.getDefaultPatientId() : 0);
        return resp;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUEST DTOs
    // ═══════════════════════════════════════════════════════════════════════

    public static class SignupRequest {
        public String fullName;
        public String email;
        public String mobile;
        public String password;
        public String role; // "DOCTOR" | "STAFF" | "PATIENT"
        public Long doctorId; // Link to existing doctor
        public String qualification;
        public Long deptId;
        public Integer yearsOfExperience;
        public Integer dailyLimit;
        public Integer avgMinutesPerPatient;
        public String bio;
    }

    public static class LoginRequest {
        public String email;
        public String password;
    }

    public static class ProfileUpdateRequest {
        public String fullName;
        public String email;
        public String mobile;
    }
}
