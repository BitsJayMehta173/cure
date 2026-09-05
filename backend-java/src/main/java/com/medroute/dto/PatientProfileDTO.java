package com.medroute.dto;

import java.time.LocalDateTime;

public class PatientProfileDTO {
    private Long id;
    private String fullName;
    private Integer age;
    private String gender;
    private String bloodGroup;
    private String mobile;
    private String relation;
    private LocalDateTime createdAt;

    public PatientProfileDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
