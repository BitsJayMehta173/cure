package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A single medical report attached to an appointment — either a text report
 * (e.g. consultation notes, lab results typed out) or an image report
 * (e.g. X-ray, scan) referenced by an external URL.
 *
 * Scoped to one Appointment (not directly to a Patient) — accessed via the
 * "Patient Records" flow: patient -> appointment -> Reports tab.
 */
@Entity
@Table(name = "medical_report")
public class MedicalReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id") // null only for records on a FULL_HISTORY referral (see referralId)
    private Long appointmentId;

    /** "text" | "image" */
    @Column(name = "report_type", nullable = false)
    private String reportType;

    @Column(nullable = false)
    private String title;

    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

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

    public MedicalReport() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTextContent() { return textContent; }
    public void setTextContent(String textContent) { this.textContent = textContent; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public LocalDate getReportDate() { return reportDate; }
    public void setReportDate(LocalDate reportDate) { this.reportDate = reportDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
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
