package com.medroute.dto;

/**
 * Compact doctor result returned by the Doctor Directory search.
 * Contains exactly what's needed to render a doctor card in the search grid.
 */
public class DoctorSearchResultDTO {
    private Long id;
    private String name;
    private String qualification;
    private String photoUrl;
    private String hospitalName;
    private Long hospitalId;
    private String departmentName;
    private Long departmentId;
    private Integer yearsOfExperience;
    private Integer totalPatientsTreated;

    public DoctorSearchResultDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public Integer getTotalPatientsTreated() { return totalPatientsTreated; }
    public void setTotalPatientsTreated(Integer totalPatientsTreated) { this.totalPatientsTreated = totalPatientsTreated; }
}
