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

    @Column(name = "referral_type", nullable = false)
    private String referralType = "FULL_PATIENT"; // FULL_PATIENT or SINGLE_CASE

    @Column(name = "referral_status", nullable = false)
    private String referralStatus = "pending"; // pending, analysed, booked

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

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
    public String getReferralType() { return referralType; }
    public void setReferralType(String referralType) { this.referralType = referralType; }
    public String getReferralStatus() { return referralStatus; }
    public void setReferralStatus(String referralStatus) { this.referralStatus = referralStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
