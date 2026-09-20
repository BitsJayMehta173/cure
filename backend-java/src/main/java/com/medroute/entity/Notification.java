package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A single in-app notification for a patient profile — e.g. "New report
 * available" after a visit. Drives the unread-count badge shown on the
 * patient chooser in the Patient Records tab.
 *
 * Scoped to a Patient (patientFk), optionally linked to the Appointment
 * that triggered it. Marked read in bulk when the patient's records are opened.
 */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_fk", nullable = false)
    private Long patientFk;

    @Column(name = "appointment_id")
    private Long appointmentId; // nullable — not every notification is appointment-specific

    /** e.g. "report_added" | "prescription_added" | "reminder" */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Notification() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientFk() { return patientFk; }
    public void setPatientFk(Long patientFk) { this.patientFk = patientFk; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
