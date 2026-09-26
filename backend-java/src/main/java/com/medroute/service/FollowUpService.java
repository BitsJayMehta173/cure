package com.medroute.service;

import com.medroute.dto.BookingConfirmationDTO;
import com.medroute.dto.ReferralViews.FollowUpView;
import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Same-doctor follow-ups. Created when a doctor finalizes a visit and wants to see the
 * patient again: booked immediately if the doctor picks a date, otherwise left OPEN
 * for the patient to book. Finalizing also completes the source visit and closes its
 * responded consults (via ReferralService).
 */
@Service
public class FollowUpService {

    @Autowired private FollowUpRequestRepository followUpRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private BookingFlowService bookingFlowService;
    @Autowired private ReferralService referralService;

    @Transactional
    public FollowUpView create(Long sourceAppointmentId, Long doctorId, LocalDate date, String notes) {
        Appointment source = appointmentRepository.findById(sourceAppointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
        if (source.getDoctor() == null || !source.getDoctor().getId().equals(doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only this visit's doctor can request a follow-up.");
        }
        if (source.getPatientFk() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This visit has no patient profile to follow up.");
        }
        if ("cancelled".equals(source.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A cancelled visit cannot be followed up.");
        }

        FollowUpRequest f = new FollowUpRequest();
        f.setSourceAppointmentId(source.getId());
        f.setPatientId(source.getPatientFk());
        f.setDoctor(source.getDoctor());
        f.setNotes(notes != null ? notes.trim() : "");
        followUpRepository.save(f);

        if (date != null) book(f, date);

        // Finalizing the visit
        source.setStatus("completed");
        referralService.onVisitFinalized(source.getId());
        return toView(f, null);
    }

    /** Patient books an OPEN follow-up. */
    @Transactional
    public FollowUpView bookByPatient(Long followUpId, Long userId, LocalDate date) {
        FollowUpRequest f = followUpRepository.findById(followUpId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Follow-up not found."));
        Patient p = patientRepository.findById(f.getPatientId()).orElse(null);
        if (p == null || userId == null || !userId.equals(p.getUserAccountId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This follow-up does not belong to you.");
        }
        if (date == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date is required.");
        book(f, date);
        return toView(f, userId);
    }

    @Transactional(readOnly = true)
    public List<FollowUpView> forUser(Long userId) {
        List<Long> patientIds = patientRepository.findByUserAccountIdOrderByIdDesc(userId).stream()
                .map(Patient::getId).toList();
        if (patientIds.isEmpty()) return List.of();
        return followUpRepository.findByPatientIdInOrderByCreatedAtDesc(patientIds).stream()
                .map(f -> toView(f, userId)).toList();
    }

    /** A booked same-doctor follow-up was cancelled → OPEN again so the patient can rebook. */
    @org.springframework.context.event.EventListener
    public void onAppointmentCancelled(AppointmentCancelledEvent event) {
        for (FollowUpRequest f : followUpRepository.findByBookedAppointmentId(event.appointmentId())) {
            f.setStatus(FollowUpStatus.OPEN);
            f.setBookedAppointmentId(null);
            f.setBookedAt(null);
            followUpRepository.save(f);
        }
    }

    private void book(FollowUpRequest f, LocalDate date) {
        if (f.getStatus() != FollowUpStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Follow-up is already " + f.getStatus() + ".");
        }
        // Book at the doctor's CURRENT hospital/department, derived server-side.
        Doctor doctor = doctorRepository.findByIdWithDepartment(f.getDoctor().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found."));
        HospitalDepartment dept = doctor.getDepartment();
        BookingConfirmationDTO booked;
        try {
            booked = bookingFlowService.confirmBooking(f.getPatientId(),
                    dept.getHospital().getId(), dept.getId(), doctor.getId(), date);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
        Appointment appt = appointmentRepository.findById(booked.getAppointmentId()).orElseThrow();
        appt.setParentAppointmentId(f.getSourceAppointmentId());

        f.setBookedAppointmentId(appt.getId());
        f.setStatus(FollowUpStatus.BOOKED);
        f.setBookedAt(LocalDateTime.now());
    }

    private FollowUpView toView(FollowUpRequest f, Long viewerUserId) {
        Appointment source = appointmentRepository.findById(f.getSourceAppointmentId()).orElse(null);
        Appointment booked = f.getBookedAppointmentId() != null
                ? appointmentRepository.findById(f.getBookedAppointmentId()).orElse(null) : null;
        Patient p = patientRepository.findById(f.getPatientId()).orElse(null);
        boolean canBook = f.getStatus() == FollowUpStatus.OPEN && viewerUserId != null
                && p != null && viewerUserId.equals(p.getUserAccountId());
        return new FollowUpView(f.getId(), f.getStatus().name(), f.getNotes(), f.getCreatedAt(),
                ReferralService.patientRef(p), ReferralService.doctorRef(f.getDoctor()),
                referralService.appointmentRef(source), referralService.appointmentRef(booked),
                canBook ? List.of("book") : List.of());
    }
}
