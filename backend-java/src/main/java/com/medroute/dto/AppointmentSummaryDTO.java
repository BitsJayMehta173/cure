package com.medroute.dto;

public class AppointmentSummaryDTO {
    private Long id;
    private String hospitalName;
    private String departmentName;
    private String doctorName;
    private String date;
    private Integer tokenNumber;
    private String expectedTimeStr;
    private String status;
    private String patientName;

    public AppointmentSummaryDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public Integer getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }
    public String getExpectedTimeStr() { return expectedTimeStr; }
    public void setExpectedTimeStr(String expectedTimeStr) { this.expectedTimeStr = expectedTimeStr; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
}
