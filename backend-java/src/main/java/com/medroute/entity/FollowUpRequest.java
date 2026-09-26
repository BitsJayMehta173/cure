package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A same-doctor follow-up requested when a visit is finalized. OPEN until a date is
 * booked (by the doctor at finalize time, or later by the patient), then BOOKED.
 * Replaces the old "doctor refers the patient to themselves" referral hack.
 */
@Entity
@Table(name = "follow_up_request")
public class FollowUpRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_appointment_id", nullable = false)
    private Long sourceAppointmentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FollowUpStatus status = FollowUpStatus.OPEN;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "booked_appointment_id")
    private Long bookedAppointmentId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "booked_at")
    private LocalDateTime bookedAt;

    public FollowUpRequest() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSourceAppointmentId() { return sourceAppointmentId; }
    public void setSourceAppointmentId(Long sourceAppointmentId) { this.sourceAppointmentId = sourceAppointmentId; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public Doctor getDoctor() { return doctor; }
    public void setDoctor(Doctor doctor) { this.doctor = doctor; }
    public FollowUpStatus getStatus() { return status; }
    public void setStatus(FollowUpStatus status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Long getBookedAppointmentId() { return bookedAppointmentId; }
    public void setBookedAppointmentId(Long bookedAppointmentId) { this.bookedAppointmentId = bookedAppointmentId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getBookedAt() { return bookedAt; }
    public void setBookedAt(LocalDateTime bookedAt) { this.bookedAt = bookedAt; }
}
