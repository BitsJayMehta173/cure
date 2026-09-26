package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * A single prescribed medicine entry tied to one appointment.
 * An appointment can have multiple Prescription rows (one per medicine).
 */
@Entity
@Table(name = "prescription")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id") // null only for records on a FULL_HISTORY referral (see referralId)
    private Long appointmentId;

    @Column(name = "medicine_name", nullable = false)
    private String medicineName;

    private String dosage;      // e.g. "500mg"
    private String frequency;   // e.g. "Twice daily"
    private String duration;    // e.g. "5 days"

    @Column(columnDefinition = "TEXT")
    private String instructions; // e.g. "Take after food"

    @Column(name = "prescribed_date", nullable = false)
    private LocalDate prescribedDate;

    @Column(name = "author_name")
    private String authorName;

    /** Set when written by a referred doctor as part of a referral (not the visit's own doctor). */
    @Column(name = "referral_id")
    private Long referralId;

    @Column(name = "author_doctor_id")
    private Long authorDoctorId;

    // ─── Handover copies (V13) ───────────────────────────────────
    /** Frozen copy in a handover packet (referralId = the TRANSFER referral). Never shown as live data. */
    @Column(name = "is_snapshot", nullable = false)
    private boolean snapshot = false;

    /** Record this was copied from (original → packet → imported). */
    @Column(name = "source_record_id")
    private Long sourceRecordId;

    /** Visit the original record belonged to (for provenance on copies). */
    @Column(name = "source_appointment_id")
    private Long sourceAppointmentId;

    /** Set on records imported into a visit from a handover packet. */
    @Column(name = "imported_from_referral_id")
    private Long importedFromReferralId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public LocalDate getPrescribedDate() { return prescribedDate; }
    public void setPrescribedDate(LocalDate prescribedDate) { this.prescribedDate = prescribedDate; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getReferralId() { return referralId; }
    public void setReferralId(Long referralId) { this.referralId = referralId; }
    public Long getAuthorDoctorId() { return authorDoctorId; }
    public void setAuthorDoctorId(Long authorDoctorId) { this.authorDoctorId = authorDoctorId; }
    public boolean isSnapshot() { return snapshot; }
    public void setSnapshot(boolean snapshot) { this.snapshot = snapshot; }
    public Long getSourceRecordId() { return sourceRecordId; }
    public void setSourceRecordId(Long sourceRecordId) { this.sourceRecordId = sourceRecordId; }
    public Long getSourceAppointmentId() { return sourceAppointmentId; }
    public void setSourceAppointmentId(Long sourceAppointmentId) { this.sourceAppointmentId = sourceAppointmentId; }
    public Long getImportedFromReferralId() { return importedFromReferralId; }
    public void setImportedFromReferralId(Long importedFromReferralId) { this.importedFromReferralId = importedFromReferralId; }
}
