package com.medroute.dto;

/**
 * Patient profile + unread notification count — used by the patient chooser
 * step of the Patient Records tab (badge shown only when unreadNotifications > 0).
 */
public class PatientRecordDTO {
    private Long id;
    private String fullName;
    private Integer age;
    private String gender;
    private String relation;
    private int unreadNotifications;

    public PatientRecordDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }
    public int getUnreadNotifications() { return unreadNotifications; }
    public void setUnreadNotifications(int unreadNotifications) { this.unreadNotifications = unreadNotifications; }
}
