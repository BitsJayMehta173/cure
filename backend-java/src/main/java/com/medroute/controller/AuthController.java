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

    // ═══════════════════════════════════════════════════════════════════════
    // SIGNUP
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/auth/signup
     * Body: { fullName, email, mobile, password }
     * Creates a UserAccount + auto-creates a linked Patient profile.
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

        // 1. Auto-create a Patient profile so bookings can be linked
        Patient patient = new Patient();
        patient.setFullName(req.fullName.trim());
        patient.setAge(25);  // default — user can update later
        patient.setGender("other");
        patient.setBloodGroup("");
        patient.setMobile(req.mobile != null ? req.mobile.trim() : "0000000000");
        patient.setRelation("self");
        Patient savedPatient = patientRepository.save(patient);

        // 2. Create the user account
        UserAccount account = new UserAccount();
        account.setEmail(req.email.trim().toLowerCase());
        account.setPasswordHash(hashPassword(req.password));
        account.setFullName(req.fullName.trim());
        account.setMobile(req.mobile != null ? req.mobile.trim() : "");
        account.setDefaultPatientId(savedPatient.getId());
        UserAccount saved = userAccountRepository.save(account);

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
        return Map.of(
                "id", account.getId(),
                "email", account.getEmail(),
                "fullName", account.getFullName(),
                "mobile", account.getMobile() != null ? account.getMobile() : "",
                "defaultPatientId", account.getDefaultPatientId() != null ? account.getDefaultPatientId() : 0
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUEST DTOs
    // ═══════════════════════════════════════════════════════════════════════

    public static class SignupRequest {
        public String fullName;
        public String email;
        public String mobile;
        public String password;
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
