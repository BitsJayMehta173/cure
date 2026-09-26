package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "referral")
public class Referral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_by_doctor_id", nullable = false)
    private Doctor referredByDoctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_to_doctor_id", nullable = false)
    private Doctor referredToDoctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    /** The follow-up appointment booked by the patient after the referral is analysed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follow_up_appointment_id")
    private Appointment followUpAppointment;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // ─── State machine (source of truth — see ReferralService) ─────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private ReferralKind kind = ReferralKind.CONSULT;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 20)
    private ReferralScope scope = ReferralScope.CASE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ReferralStatus status = ReferralStatus.REQUESTED;

    /** The referred doctor's findings (CONSULT) — kept here, never on the referring doctor's appointment. */
    @Column(name = "response_notes", columnDefinition = "TEXT")
    private String responseNotes;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    /** Set when the referral is finished (consult reviewed at finalize, follow-up booked, declined, cancelled). */
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public Referral() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }
    public Doctor getReferredByDoctor() { return referredByDoctor; }
    public void setReferredByDoctor(Doctor referredByDoctor) { this.referredByDoctor = referredByDoctor; }
    public Doctor getReferredToDoctor() { return referredToDoctor; }
    public void setReferredToDoctor(Doctor referredToDoctor) { this.referredToDoctor = referredToDoctor; }
    public Appointment getAppointment() { return appointment; }
    public void setAppointment(Appointment appointment) { this.appointment = appointment; }
    public Appointment getFollowUpAppointment() { return followUpAppointment; }
    public void setFollowUpAppointment(Appointment followUpAppointment) { this.followUpAppointment = followUpAppointment; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public ReferralKind getKind() { return kind; }
    public void setKind(ReferralKind kind) { this.kind = kind; }
    public ReferralScope getScope() { return scope; }
    public void setScope(ReferralScope scope) { this.scope = scope; }
    public ReferralStatus getStatus() { return status; }
    public void setStatus(ReferralStatus status) { this.status = status; }
    public String getResponseNotes() { return responseNotes; }
    public void setResponseNotes(String responseNotes) { this.responseNotes = responseNotes; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
}
