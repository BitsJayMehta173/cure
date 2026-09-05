package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hospital")
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String address;
    private String state;
    private Double latitude;
    private Double longitude;

    // ─── Booking Wizard Fields ───────────────────────────────────────────────
    // Hospital type: "government" | "private" | "trust"
    private String type;

    // Star rating: 1.0 – 5.0 (patient-reported or aggregated)
    private Double rating;

    // OPD hours in human-readable format, e.g. "9:00 AM - 5:00 PM"
    private String opdHours;

    // Comma-separated accreditations, e.g. "NABH,NABH Certified,ISO"
    private String accreditation;
    // ─────────────────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
    public String getOpdHours() { return opdHours; }
    public void setOpdHours(String opdHours) { this.opdHours = opdHours; }
    public String getAccreditation() { return accreditation; }
    public void setAccreditation(String accreditation) { this.accreditation = accreditation; }
}
