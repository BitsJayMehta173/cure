package com.medroute.dto;

/**
 * Full doctor profile returned by GET /api/doctors/{id}.
 * Includes bio and all metadata needed for the LinkedIn-style profile page.
 */
public class DoctorProfileDTO {
    private Long id;
    private String name;
    private String qualification;
    private String photoUrl;
    private String bio;
    private String hospitalName;
    private Long hospitalId;
    private String hospitalAddress;
    private String hospitalState;
    private String departmentName;
    private Long departmentId;
    private Integer yearsOfExperience;
    private Integer totalPatientsTreated;
    private Integer avgMinutesPerPatient;
    private Integer dailyLimit;
    private Boolean hasUpcomingSlots;

    public DoctorProfileDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalAddress() { return hospitalAddress; }
    public void setHospitalAddress(String hospitalAddress) { this.hospitalAddress = hospitalAddress; }

    public String getHospitalState() { return hospitalState; }
    public void setHospitalState(String hospitalState) { this.hospitalState = hospitalState; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public Integer getTotalPatientsTreated() { return totalPatientsTreated; }
    public void setTotalPatientsTreated(Integer totalPatientsTreated) { this.totalPatientsTreated = totalPatientsTreated; }

    public Integer getAvgMinutesPerPatient() { return avgMinutesPerPatient; }
    public void setAvgMinutesPerPatient(Integer avgMinutesPerPatient) { this.avgMinutesPerPatient = avgMinutesPerPatient; }

    public Integer getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(Integer dailyLimit) { this.dailyLimit = dailyLimit; }

    public Boolean getHasUpcomingSlots() { return hasUpcomingSlots; }
    public void setHasUpcomingSlots(Boolean hasUpcomingSlots) { this.hasUpcomingSlots = hasUpcomingSlots; }
}
