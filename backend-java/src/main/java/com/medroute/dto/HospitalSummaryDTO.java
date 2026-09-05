package com.medroute.dto;

import java.util.List;

public class HospitalSummaryDTO {
    private Long id;
    private String name;
    private String address;
    private String state;
    private String type;  // "government" | "private" | "trust"
    private String opdHours;
    private Double rating;
    private Integer departmentCount;
    private List<String> accreditation;  // split by comma

    public HospitalSummaryDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getOpdHours() { return opdHours; }
    public void setOpdHours(String opdHours) { this.opdHours = opdHours; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public Integer getDepartmentCount() { return departmentCount; }
    public void setDepartmentCount(Integer departmentCount) { this.departmentCount = departmentCount; }
    public List<String> getAccreditation() { return accreditation; }
    public void setAccreditation(List<String> accreditation) { this.accreditation = accreditation; }
}
