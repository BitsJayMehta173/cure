package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "doctor")
public class Doctor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_id", nullable = false)
    private HospitalDepartment department;

    @Column(name = "doctor_name", nullable = false)
    private String doctorName;

    @Column(name = "daily_limit", nullable = false)
    private Integer dailyLimit;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "total_patients_treated")
    private Integer totalPatientsTreated;

    @Column(name = "avg_minutes_per_patient")
    private Integer avgMinutesPerPatient;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public HospitalDepartment getDepartment() { return department; }
    public void setDepartment(HospitalDepartment department) { this.department = department; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public Integer getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(Integer dailyLimit) { this.dailyLimit = dailyLimit; }
    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }
    public Integer getTotalPatientsTreated() { return totalPatientsTreated; }
    public void setTotalPatientsTreated(Integer totalPatientsTreated) { this.totalPatientsTreated = totalPatientsTreated; }
    public Integer getAvgMinutesPerPatient() { return avgMinutesPerPatient; }
    public void setAvgMinutesPerPatient(Integer avgMinutesPerPatient) { this.avgMinutesPerPatient = avgMinutesPerPatient; }
}

