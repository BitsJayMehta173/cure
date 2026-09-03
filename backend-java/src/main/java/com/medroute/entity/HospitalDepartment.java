package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hospital_department")
public class HospitalDepartment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Hospital getHospital() { return hospital; }
    public void setHospital(Hospital hospital) { this.hospital = hospital; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
}
