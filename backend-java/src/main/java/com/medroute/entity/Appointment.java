package com.medroute.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "appointment", indexes = {
    @Index(name = "idx_doctor_date", columnList = "doctor_id, date_str")
})
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "date_str", nullable = false)
    private String dateStr;  // YYYY-MM-DD

    /**
     * Patient name — kept for simulator bookings which have no patient profile.
     * For real bookings, use patientFk instead.
     */
    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "token_code", unique = true, nullable = false)
    private String tokenCode;

    @Column(name = "token_num")
    private Integer tokenNum;

    private String source;

    // ─── Booking Wizard Fields ───────────────────────────────────────────────
    /**
     * FK to Patient.id — links this booking to a patient profile.
     * Nullable because simulator bookings don't have a patient.
     */
    @Column(name = "patient_fk")
    private Long patientFk;

    /**
     * Denormalized hospital ID — set at booking time for fast wizard queries.
     * Avoids joining through Doctor → HospitalDepartment → Hospital when listing
     * a patient's appointments.
     */
    @Column(name = "hospital_id")
    private Long hospitalId;

    /**
     * Denormalized department ID — set at booking time for fast wizard queries.
     */
    @Column(name = "department_id")
    private Long departmentId;

    /**
     * Booking status — "confirmed" | "cancelled" | "completed".
     * Cancelled bookings stay in the DB (soft-delete) for audit history.
     * They are excluded from slot availability counts.
     */
    @Column(nullable = false)
    private String status = "confirmed";

    /**
     * Doctor's free-form general advice for this appointment.
     * Can be set/updated by the doctor from the Doctor Portal.
     */
    @Column(name = "general_advice", columnDefinition = "TEXT")
    private String generalAdvice;
    // ─────────────────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Doctor getDoctor() { return doctor; }
    public void setDoctor(Doctor doctor) { this.doctor = doctor; }
    public String getDateStr() { return dateStr; }
    public void setDateStr(String dateStr) { this.dateStr = dateStr; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getTokenCode() { return tokenCode; }
    public void setTokenCode(String tokenCode) { this.tokenCode = tokenCode; }
    public Integer getTokenNum() { return tokenNum; }
    public void setTokenNum(Integer tokenNum) { this.tokenNum = tokenNum; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getPatientFk() { return patientFk; }
    public void setPatientFk(Long patientFk) { this.patientFk = patientFk; }
    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }
    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getGeneralAdvice() { return generalAdvice; }
    public void setGeneralAdvice(String generalAdvice) { this.generalAdvice = generalAdvice; }
}
