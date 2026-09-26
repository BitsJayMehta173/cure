package com.medroute.service;

import com.medroute.dto.AppointmentReportView;
import com.medroute.dto.AppointmentReportView.*;
import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

/**
 * Data for the patient's downloadable appointment report (PDF). Read-only: gathers the
 * visit, patient, doctor, hospital and that visit's own records. Only the account that
 * owns the patient profile may fetch it (same rule as PatientRecordsService).
 */
@Service
public class AppointmentReportService {

    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private MedicalReportRepository reportRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private ReferralRepository referralRepository;
    @Autowired private BookingFlowService bookingFlowService;
    @Autowired private ReferralService referralService;

    @Transactional(readOnly = true)
    public AppointmentReportView build(Long appointmentId, Long userId) {
        Appointment a = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
        Patient p = a.getPatientFk() != null ? patientRepository.findById(a.getPatientFk()).orElse(null) : null;
        if (p == null || userId == null || !userId.equals(p.getUserAccountId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This appointment does not belong to you.");
        }

        Doctor d = a.getDoctor() != null ? doctorRepository.findByIdWithDepartment(a.getDoctor().getId()).orElse(null) : null;
        HospitalDepartment dept = d != null ? d.getDepartment() : null;
        Hospital h = dept != null ? dept.getHospital() : null;

        String display = referralService.displayStatuses(List.of(a)).get(a.getId());
        Visit visit = new Visit(a.getId(), a.getDateStr(), a.getStatus(), display, a.getTokenNum(),
                a.getTokenCode(), bookingFlowService.expectedTimeFor(a));
        Person patient = new Person(p.getFullName(), p.getAge(), p.getGender(), p.getBloodGroup(), p.getMobile());
        DoctorInfo doctor = d == null ? null : new DoctorInfo(d.getDoctorName(), d.getQualification(),
                dept != null ? dept.getDepartmentName() : null, d.getYearsOfExperience(), d.getAvgMinutesPerPatient());
        HospitalInfo hospital = h == null ? null : new HospitalInfo(h.getName(), h.getAddress(), h.getState(),
                h.getType(), h.getOpdHours(), h.getRating(),
                h.getAccreditation() == null || h.getAccreditation().isBlank() ? List.of()
                        : Arrays.stream(h.getAccreditation().split(",")).map(String::trim).toList());

        ReferredFrom referredFrom = a.getOriginReferralId() == null ? null
                : referralRepository.findById(a.getOriginReferralId()).map(r -> {
                    Doctor from = r.getReferredByDoctor();
                    HospitalDepartment fd = from.getDepartment();
                    return new ReferredFrom(from.getDoctorName(),
                            fd != null ? fd.getDepartmentName() : null,
                            fd != null && fd.getHospital() != null ? fd.getHospital().getName() : null,
                            r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : null);
                }).orElse(null);

        List<Report> reports = reportRepository.findByAppointmentIdOrderByReportDateDesc(a.getId()).stream()
                .map(m -> new Report(m.getTitle(), m.getReportType(), m.getTextContent(), m.getFileUrl(),
                        m.getReportDate(), authorOr(m.getAuthorName(), d)))
                .toList();
        List<Medicine> medicines = prescriptionRepository.findByAppointmentIdOrderByIdAsc(a.getId()).stream()
                .map(m -> new Medicine(m.getMedicineName(), m.getDosage(), m.getFrequency(), m.getDuration(),
                        m.getInstructions(), m.getPrescribedDate(), authorOr(m.getAuthorName(), d)))
                .toList();

        String advice = a.getGeneralAdvice() != null && !a.getGeneralAdvice().isBlank() ? a.getGeneralAdvice() : null;
        return new AppointmentReportView(visit, patient, doctor, hospital, referredFrom, advice, reports, medicines);
    }

    /** Seeded/demo records may lack an author — attribute them to the visit's doctor. */
    private static String authorOr(String author, Doctor visitDoctor) {
        if (author != null && !author.isBlank()) return author;
        return visitDoctor != null ? visitDoctor.getDoctorName() : null;
    }
}
