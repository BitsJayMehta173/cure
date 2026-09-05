package com.medroute.dto;

public class TokenPreviewDTO {
    private Long doctorId;
    private String assignedDoctor;
    private String doctorQualification;
    private Integer tokenNumber;
    private Integer avgMinutesPerPatient;
    private String expectedTimeStr;  // e.g. "10:30 AM"
    private Integer remainingSlots;

    public TokenPreviewDTO() {}

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public String getAssignedDoctor() { return assignedDoctor; }
    public void setAssignedDoctor(String assignedDoctor) { this.assignedDoctor = assignedDoctor; }
    public String getDoctorQualification() { return doctorQualification; }
    public void setDoctorQualification(String doctorQualification) { this.doctorQualification = doctorQualification; }
    public Integer getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }
    public Integer getAvgMinutesPerPatient() { return avgMinutesPerPatient; }
    public void setAvgMinutesPerPatient(Integer avgMinutesPerPatient) { this.avgMinutesPerPatient = avgMinutesPerPatient; }
    public String getExpectedTimeStr() { return expectedTimeStr; }
    public void setExpectedTimeStr(String expectedTimeStr) { this.expectedTimeStr = expectedTimeStr; }
    public Integer getRemainingSlots() { return remainingSlots; }
    public void setRemainingSlots(Integer remainingSlots) { this.remainingSlots = remainingSlots; }
}
