package com.medroute.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class BookingRequestDTO {
    @NotNull
    private Long doctorId;
    @NotBlank
    private String dateStr;
    @NotBlank
    private String patientName;
    @NotBlank
    private String source;

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public String getDateStr() { return dateStr; }
    public void setDateStr(String dateStr) { this.dateStr = dateStr; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
