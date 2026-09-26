package com.medroute.dto;

import java.time.LocalDate;

public class MedicalReportDTO {
    private Long id;
    private String reportType;
    private String title;
    private String textContent;
    private String fileUrl;
    private LocalDate reportDate;
    private String authorName;
    private Long authorDoctorId;
    private Long referralId;

    public MedicalReportDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getAuthorDoctorId() { return authorDoctorId; }
    public void setAuthorDoctorId(Long authorDoctorId) { this.authorDoctorId = authorDoctorId; }
    public Long getReferralId() { return referralId; }
    public void setReferralId(Long referralId) { this.referralId = referralId; }
}
