package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "department_condition")
public class DepartmentCondition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    @Column(name = "condition_name", nullable = false)
    private String conditionName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getConditionName() { return conditionName; }
    public void setConditionName(String conditionName) { this.conditionName = conditionName; }
}
