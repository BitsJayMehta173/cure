package com.medroute.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Everything printed on a patient's downloadable appointment report (PDF): the visit,
 * patient, doctor, hospital, and that visit's own advice / reports / prescriptions.
 * Built by AppointmentReportService — read-only, patient-scoped.
 */
public record AppointmentReportView(
        Visit visit,
        Person patient,
        DoctorInfo doctor,
        HospitalInfo hospital,
        ReferredFrom referredFrom,     // null unless the visit was booked from a handover
        String generalAdvice,          // written by the visit's doctor (null if none)
        List<Report> reports,
        List<Medicine> prescriptions
) {
    public record Visit(Long id, String date, String status, String displayStatus, Integer tokenNumber,
                        String tokenCode, String expectedTime) {}

    public record Person(String fullName, Integer age, String gender, String bloodGroup, String mobile) {}

    public record DoctorInfo(String name, String qualification, String department, Integer yearsOfExperience,
                             Integer avgMinutesPerPatient) {}

    public record HospitalInfo(String name, String address, String state, String type, String opdHours,
                               Double rating, List<String> accreditation) {}

    public record ReferredFrom(String doctorName, String department, String hospitalName, String referredOn) {}

    public record Report(String title, String reportType, String textContent, String fileUrl,
                         LocalDate reportDate, String authorName) {}

    public record Medicine(String medicineName, String dosage, String frequency, String duration,
                           String instructions, LocalDate prescribedDate, String authorName) {}
}
