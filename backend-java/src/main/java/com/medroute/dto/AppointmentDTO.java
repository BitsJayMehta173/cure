package com.medroute.dto;

public class AppointmentDTO {
    private Long doctorId;       // Actual DB ID for booking
    private String initials;
    private String name;
    private String qualification;
    private String department;
    private String hospitalName;
    private String date;
    private String time;
    private Integer token;       // Token number (queue position)
    private String status;
    private String statusType;
    private String tradeoffLabel;
    private Double distanceKm;
    private Integer waitDays;
    private Double aiScore;
    // Transport recommendation from ML pipeline
    private String transportMode;
    private String transportEmoji;
    private Double transportTimeHrs;
    private String transportDescription;
    private Boolean isLongDistance;
    private String shiftHours;
    // Doctor intelligence fields
    private Integer yearsOfExperience;
    private Integer totalPatientsTreated;
    private Integer avgMinutesPerPatient;

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public String getInitials() { return initials; }
    public void setInitials(String initials) { this.initials = initials; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public Integer getToken() { return token; }
    public void setToken(Integer token) { this.token = token; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStatusType() { return statusType; }
    public void setStatusType(String statusType) { this.statusType = statusType; }
    public String getTradeoffLabel() { return tradeoffLabel; }
    public void setTradeoffLabel(String tradeoffLabel) { this.tradeoffLabel = tradeoffLabel; }
    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }
    public Integer getWaitDays() { return waitDays; }
    public void setWaitDays(Integer waitDays) { this.waitDays = waitDays; }
    public Double getAiScore() { return aiScore; }
    public void setAiScore(Double aiScore) { this.aiScore = aiScore; }
    public String getTransportMode() { return transportMode; }
    public void setTransportMode(String transportMode) { this.transportMode = transportMode; }
    public String getTransportEmoji() { return transportEmoji; }
    public void setTransportEmoji(String transportEmoji) { this.transportEmoji = transportEmoji; }
    public Double getTransportTimeHrs() { return transportTimeHrs; }
    public void setTransportTimeHrs(Double transportTimeHrs) { this.transportTimeHrs = transportTimeHrs; }
    public String getTransportDescription() { return transportDescription; }
    public void setTransportDescription(String transportDescription) { this.transportDescription = transportDescription; }
    public Boolean getIsLongDistance() { return isLongDistance; }
    public void setIsLongDistance(Boolean isLongDistance) { this.isLongDistance = isLongDistance; }
    public String getShiftHours() { return shiftHours; }
    public void setShiftHours(String shiftHours) { this.shiftHours = shiftHours; }
    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }
    public Integer getTotalPatientsTreated() { return totalPatientsTreated; }
    public void setTotalPatientsTreated(Integer totalPatientsTreated) { this.totalPatientsTreated = totalPatientsTreated; }
    public Integer getAvgMinutesPerPatient() { return avgMinutesPerPatient; }
    public void setAvgMinutesPerPatient(Integer avgMinutesPerPatient) { this.avgMinutesPerPatient = avgMinutesPerPatient; }
}

