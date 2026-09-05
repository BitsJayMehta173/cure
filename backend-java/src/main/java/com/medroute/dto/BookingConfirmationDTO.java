package com.medroute.dto;

public class BookingConfirmationDTO {
    private Long appointmentId;
    private String tokenCode;
    private Integer tokenNumber;
    private String doctorName;
    private String expectedTimeStr;
    private String hospitalName;
    private String departmentName;
    private String date;
    private String status;

    public BookingConfirmationDTO() {}

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getTokenCode() { return tokenCode; }
    public void setTokenCode(String tokenCode) { this.tokenCode = tokenCode; }
    public Integer getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(Integer tokenNumber) { this.tokenNumber = tokenNumber; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public String getExpectedTimeStr() { return expectedTimeStr; }
    public void setExpectedTimeStr(String expectedTimeStr) { this.expectedTimeStr = expectedTimeStr; }
    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
