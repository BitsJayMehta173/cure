package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * User account for authentication — stores login credentials.
 * Separate from Patient (which stores health profile data).
 *
 * One UserAccount maps to one default Patient profile (created at signup).
 * The defaultPatientId links bookings made from the recommendation tab
 * back to the patient profile, so they appear in the Follow-up view.
 */
@Entity
@Table(name = "user_account")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(length = 10)
    private String mobile;

    /**
     * FK to Patient.id — the default patient profile created at signup.
     * Used to link recommendation bookings to the patient for unified
     * appointment tracking.
     */
    @Column(name = "default_patient_id")
    private Long defaultPatientId;

    @Column(name = "role", length = 20)
    private String role = "PATIENT";

    @Column(name = "doctor_id")
    private Long doctorId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public UserAccount() {
        this.createdAt = LocalDateTime.now();
        this.role = "PATIENT";
    }

    // ─── Getters & Setters ───────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getRole() { return role != null ? role : "PATIENT"; }
    public void setRole(String role) { this.role = role; }
    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public Long getDefaultPatientId() { return defaultPatientId; }
    public void setDefaultPatientId(Long defaultPatientId) { this.defaultPatientId = defaultPatientId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
