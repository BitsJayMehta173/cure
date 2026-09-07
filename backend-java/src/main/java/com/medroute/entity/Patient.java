package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Patient profile — represents a person who can book appointments.
 * One patient is the default profile for one UserAccount (linked at signup).
 * One patient can have many appointments (1-to-many).
 *
 * Multi-tenancy: each Patient belongs to exactly one UserAccount via userAccountId.
 * The UserAccount.defaultPatientId circular reference ensures the "Follow-up view"
 * can show a user's own appointments without a global list.
 *
 * Why a separate entity instead of just using patientName as a String?
 *   - Real names are too short for analytics and identity verification
 *   - We need a stable FK for the Appointment table
 *   - DPDP consent needs to be tied to a profile, not a free-text name
 *   - Phone number enables future SMS notifications
 *   - Per-user isolation: patients cannot see other users' appointments
 */
@Entity
@Table(name = "patient")
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String gender;  // "male" | "female" | "other"

    @Column(name = "blood_group")
    private String bloodGroup;  // e.g. "O+", "A-", optional

    @Column(nullable = false, length = 10)
    private String mobile;  // 10-digit Indian mobile number

    @Column(nullable = false)
    private String relation;  // "self" | "spouse" | "child" | "parent" | "sibling" | "other"

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * FK to UserAccount.id — each patient belongs to exactly one user.
     * Used for multi-tenancy: patient records are isolated per user.
     * The linked UserAccount.defaultPatientId points back to this patient.
     */
    @Column(name = "user_account_id", nullable = false)
    private Long userAccountId;

    public Patient() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUserAccountId() { return userAccountId; }
    public void setUserAccountId(Long userAccountId) { this.userAccountId = userAccountId; }
}
