package com.medroute.dto;

import java.util.List;

public class HospitalDTO {
    private Long hospitalId;
    private String name;
    private String state;
    private Integer count;
    private List<AppointmentDTO> appointments;

    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }
    public List<AppointmentDTO> getAppointments() { return appointments; }
    public void setAppointments(List<AppointmentDTO> appointments) { this.appointments = appointments; }
}
