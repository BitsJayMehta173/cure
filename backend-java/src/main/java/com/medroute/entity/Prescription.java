package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * A single prescribed medicine entry tied to one appointment.
 * An appointment can have multiple Prescription rows (one per medicine).
 */
@Entity
@Table(name = "prescription")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "medicine_name", nullable = false)
    private String medicineName;

    private String dosage;      // e.g. "500mg"
    private String frequency;   // e.g. "Twice daily"
    private String duration;    // e.g. "5 days"

    @Column(columnDefinition = "TEXT")
    private String instructions; // e.g. "Take after food"

    @Column(name = "prescribed_date", nullable = false)
    private LocalDate prescribedDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }
    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }
    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public LocalDate getPrescribedDate() { return prescribedDate; }
    public void setPrescribedDate(LocalDate prescribedDate) { this.prescribedDate = prescribedDate; }
}
