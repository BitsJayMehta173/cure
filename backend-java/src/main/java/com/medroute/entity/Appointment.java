package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "appointment", indexes = {
    @Index(name = "idx_doctor_date", columnList = "doctor_id, date_str")
})
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "date_str", nullable = false)
    private String dateStr; // YYYY-MM-DD

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "token_code", unique = true, nullable = false)
    private String tokenCode;

    @Column(name = "token_num")
    private Integer tokenNum;

    private String source;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Doctor getDoctor() { return doctor; }
    public void setDoctor(Doctor doctor) { this.doctor = doctor; }
    public String getDateStr() { return dateStr; }
    public void setDateStr(String dateStr) { this.dateStr = dateStr; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getTokenCode() { return tokenCode; }
    public void setTokenCode(String tokenCode) { this.tokenCode = tokenCode; }
    public Integer getTokenNum() { return tokenNum; }
    public void setTokenNum(Integer tokenNum) { this.tokenNum = tokenNum; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
