package com.medroute.service;

import com.medroute.dto.MedicalReportDTO;
import com.medroute.dto.PatientRecordDTO;
import com.medroute.dto.PrescriptionDTO;
import com.medroute.entity.Appointment;
import com.medroute.entity.MedicalReport;
import com.medroute.entity.Patient;
import com.medroute.entity.Prescription;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.MedicalReportRepository;
import com.medroute.repository.NotificationRepository;
import com.medroute.repository.PatientRepository;
import com.medroute.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Backing service for the "Patient Records" tab — the patient chooser
 * (with unread-notification badges), and the appointment-scoped
 * Reports / Medicine data shown in the detail view.
 *
 * Ownership rule (mirrors BookingFlowService.cancelAppointment): a caller
 * may only read/mark-read data for a patient profile that belongs to
 * their own userAccountId. Never expose another user's records.
 */
@Service
public class PatientRecordsService {

    @Autowired private PatientRepository patientRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private MedicalReportRepository medicalReportRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private NotificationRepository notificationRepository;

    /**
     * All patient profiles owned by this user, each annotated with its
     * current unread-notification count for the chooser badge.
     */
    public List<PatientRecordDTO> getPatientsWithNotifications(Long userAccountId) {
        return patientRepository.findByUserAccountIdOrderByIdDesc(userAccountId)
                .stream()
                .map(p -> {
                    PatientRecordDTO dto = new PatientRecordDTO();
                    dto.setId(p.getId());
                    dto.setFullName(p.getFullName());
                    dto.setAge(p.getAge());
                    dto.setGender(p.getGender());
                    dto.setRelation(p.getRelation());
                    long unread = notificationRepository.countByPatientFkAndIsReadFalse(p.getId());
                    dto.setUnreadNotifications((int) unread);
                    return dto;
                })
                .toList();
    }

    public List<MedicalReportDTO> getReports(Long appointmentId, Long userAccountId) {
        verifyAppointmentOwnership(appointmentId, userAccountId);
        return medicalReportRepository.findByAppointmentIdOrderByReportDateDesc(appointmentId)
                .stream()
                .map(this::toReportDTO)
                .toList();
    }

    public List<PrescriptionDTO> getMedicines(Long appointmentId, Long userAccountId) {
        verifyAppointmentOwnership(appointmentId, userAccountId);
        return prescriptionRepository.findByAppointmentIdOrderByIdAsc(appointmentId)
                .stream()
                .map(this::toPrescriptionDTO)
                .toList();
    }

    @Transactional
    public void markPatientNotificationsRead(Long patientId, Long userAccountId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient profile not found."));
        if (userAccountId == null || !patient.getUserAccountId().equals(userAccountId)) {
            throw new RuntimeException("Access denied: this patient profile does not belong to you.");
        }
        notificationRepository.markAllReadForPatient(patientId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    /**
     * Verifies the appointment exists, has a linked patient profile, and
     * that patient profile belongs to the requesting user account.
     */
    private void verifyAppointmentOwnership(Long appointmentId, Long userAccountId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found."));
        Long patientFk = appt.getPatientFk();
        if (patientFk == null) {
            throw new RuntimeException("Access denied: this appointment has no linked patient profile.");
        }
        Patient patient = patientRepository.findById(patientFk).orElse(null);
        if (patient == null || userAccountId == null || !patient.getUserAccountId().equals(userAccountId)) {
            throw new RuntimeException("Access denied: this appointment does not belong to you.");
        }
    }

    private MedicalReportDTO toReportDTO(MedicalReport r) {
        MedicalReportDTO dto = new MedicalReportDTO();
        dto.setId(r.getId());
        dto.setReportType(r.getReportType());
        dto.setTitle(r.getTitle());
        dto.setTextContent(r.getTextContent());
        dto.setFileUrl(r.getFileUrl());
        dto.setReportDate(r.getReportDate());
        return dto;
    }

    private PrescriptionDTO toPrescriptionDTO(Prescription p) {
        PrescriptionDTO dto = new PrescriptionDTO();
        dto.setId(p.getId());
        dto.setMedicineName(p.getMedicineName());
        dto.setDosage(p.getDosage());
        dto.setFrequency(p.getFrequency());
        dto.setDuration(p.getDuration());
        dto.setInstructions(p.getInstructions());
        dto.setPrescribedDate(p.getPrescribedDate());
        return dto;
    }
}
