package com.medroute.dto;

public class AvailableDoctorDTO {
    private Long doctorId;
    private String doctorName;
    private String qualification;
    private Integer yearsOfExperience;
    private Integer avgMinutesPerPatient;
    private Integer tokenNumber;
    private Integer remainingSlots;
    private String expectedTimeStr;

    public AvailableDoctorDTO() {}

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public Integer getAvgMinutesPerPatient() { return avgMinutesPerPatient; }
    public void setAvgMinutesPerPatient(Integer avgMinutesPerPatient) { this.avgMinutesPerPatient = avgMinutesPerPatient; }

    public Integer getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }

    public Integer getRemainingSlots() { return remainingSlots; }
    public void setRemainingSlots(Integer remainingSlots) { this.remainingSlots = remainingSlots; }

    public String getExpectedTimeStr() { return expectedTimeStr; }
    public void setExpectedTimeStr(String expectedTimeStr) { this.expectedTimeStr = expectedTimeStr; }
}
