package com.medroute.service;

import com.medroute.dto.BookingConfirmationDTO;
import com.medroute.dto.ReferralViews.*;
import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Single owner of the referral state machine, record-access rules and the
 * server-computed display status of appointments/referrals.
 *
 * Lifecycles (see {@link ReferralStatus}):
 *   CONSULT : REQUESTED → RESPONDED, closed when the referring doctor completes the visit.
 *   TRANSFER: REQUESTED → ACCEPTED (source visit auto-completes) → FOLLOW_UP_BOOKED.
 *   either  : REQUESTED → DECLINED (referred doctor) | CANCELLED (referring doctor).
 *
 * Every mutation validates the acting doctor/user and the current state, and runs in
 * one transaction. Controllers must not change referral fields directly.
 *
 * NOTE: identity is still taken from request params (the app has no auth yet).
 */
@Service
public class ReferralService {

    @Autowired private ReferralRepository referralRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private BookingFlowService bookingFlowService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private org.springframework.context.ApplicationEventPublisher events;

    /** Who is looking at / acting on a referral. Exactly one id is normally set. */
    public record Viewer(Long doctorId, Long userId) {
        public static Viewer doctor(Long id) { return new Viewer(id, null); }
        public static Viewer user(Long id) { return new Viewer(null, id); }
    }

    /** Thrown when an equivalent active referral already exists (carries its id). */
    public static class DuplicateReferralException extends ResponseStatusException {
        private final Long existingId;
        public DuplicateReferralException(String msg, Long existingId) {
            super(HttpStatus.CONFLICT, msg);
            this.existingId = existingId;
        }
        public Long getExistingId() { return existingId; }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMANDS
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public Referral create(Long patientId, Long fromDoctorId, Long toDoctorId,
                           Long appointmentId, ReferralKind kind, String notes) {
        if (patientId == null || fromDoctorId == null || toDoctorId == null) {
            throw bad("patientId, fromDoctorId and toDoctorId are required.");
        }
        if (fromDoctorId.equals(toDoctorId)) {
            throw bad("A doctor cannot refer a patient to themselves — request a follow-up instead.");
        }
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> notFound("Patient not found."));
        Doctor from = doctorRepository.findById(fromDoctorId)
                .orElseThrow(() -> notFound("Referring doctor not found."));
        Doctor to = doctorRepository.findById(toDoctorId)
                .orElseThrow(() -> notFound("Referred doctor not found."));

        Appointment source = null;
        if (appointmentId != null) {
            source = appointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> notFound("Appointment not found."));
            if (!patientId.equals(source.getPatientFk())) {
                throw bad("Appointment does not belong to this patient.");
            }
            if ("cancelled".equals(source.getStatus())) {
                throw bad("A cancelled appointment cannot be referred.");
            }
            if (!canView(fromDoctorId, source)) {
                throw forbidden("You do not have access to this appointment.");
            }
        }

        // Duplicate = an ACTIVE referral of the same case/history to the same doctor.
        for (Referral r : referralRepository.findByPatientIdAndReferredToDoctorId(patientId, toDoctorId)) {
            if (!r.getStatus().isActive()) continue;
            boolean sameCase = source != null && r.getAppointment() != null
                    && r.getAppointment().getId().equals(source.getId());
            boolean sameHistory = source == null && r.getScope() == ReferralScope.FULL_HISTORY;
            if (sameCase || sameHistory) {
                throw new DuplicateReferralException(source != null
                        ? "This case has already been referred to this doctor."
                        : "This patient has already been referred to this doctor.", r.getId());
            }
        }

        Referral r = new Referral();
        r.setPatient(patient);
        r.setReferredByDoctor(from);
        r.setReferredToDoctor(to);
        r.setAppointment(source);
        r.setNotes(notes != null ? notes.trim() : "");
        r.setKind(kind);
        r.setScope(source != null ? ReferralScope.CASE : ReferralScope.FULL_HISTORY);
        r.setStatus(ReferralStatus.REQUESTED);
        Referral saved = referralRepository.save(r);
        if (kind == ReferralKind.TRANSFER) {
            // Handover = a frozen copy of the case file, not a live link (CaseRecordsService).
            events.publishEvent(new HandoverEvents.Created(saved.getId()));
        }
        return saved;
    }

    /** CONSULT: referred doctor sends findings back. REQUESTED → RESPONDED. */
    @Transactional
    public Referral respond(Long referralId, Long doctorId, String findings) {
        Referral r = load(referralId);
        requireReferredDoctor(r, doctorId);
        requireKind(r, ReferralKind.CONSULT, "Only a consult referral can be responded to.");
        requireStatus(r, ReferralStatus.REQUESTED);
        r.setResponseNotes(findings != null ? findings.trim() : "");
        r.setStatus(ReferralStatus.RESPONDED);
        r.setRespondedAt(LocalDateTime.now());
        return r;
    }

    /** TRANSFER: referred doctor takes over. REQUESTED → ACCEPTED; source visit is completed (handed off). */
    @Transactional
    public Referral accept(Long referralId, Long doctorId) {
        Referral r = load(referralId);
        requireReferredDoctor(r, doctorId);
        requireKind(r, ReferralKind.TRANSFER, "Only a transfer referral can be accepted.");
        requireStatus(r, ReferralStatus.REQUESTED);
        doAccept(r);
        return r;
    }

    @Transactional
    public Referral decline(Long referralId, Long doctorId, String reason) {
        Referral r = load(referralId);
        requireReferredDoctor(r, doctorId);
        requireStatus(r, ReferralStatus.REQUESTED);
        r.setStatus(ReferralStatus.DECLINED);
        if (reason != null && !reason.isBlank()) r.setResponseNotes(reason.trim());
        r.setClosedAt(LocalDateTime.now());
        return r;
    }

    @Transactional
    public Referral cancel(Long referralId, Long doctorId) {
        Referral r = load(referralId);
        if (doctorId == null || !doctorId.equals(r.getReferredByDoctor().getId())) {
            throw forbidden("Only the referring doctor can cancel this referral.");
        }
        requireStatus(r, ReferralStatus.REQUESTED);
        r.setStatus(ReferralStatus.CANCELLED);
        r.setClosedAt(LocalDateTime.now());
        return r;
    }

    /**
     * TRANSFER: book the follow-up with the referred doctor at THEIR hospital/department
     * (always derived here, never from the client), link it, and close the referral —
     * atomically. Actor = the referred doctor (auto-accepts if still REQUESTED) or the
     * patient's account owner (requires ACCEPTED).
     */
    @Transactional
    public Referral bookFollowUp(Long referralId, Viewer actor, LocalDate date) {
        Referral r = load(referralId);
        requireKind(r, ReferralKind.TRANSFER, "Only a transfer referral has a follow-up to book.");
        if (date == null) throw bad("date is required.");

        boolean isReferredDoctor = actor.doctorId() != null
                && actor.doctorId().equals(r.getReferredToDoctor().getId());
        boolean isPatientOwner = actor.userId() != null && ownsPatient(actor.userId(), r.getPatient());
        if (!isReferredDoctor && !isPatientOwner) {
            throw forbidden("Only the referred doctor or the patient can book this follow-up.");
        }
        if (r.getStatus() == ReferralStatus.REQUESTED && isReferredDoctor) {
            doAccept(r);
        }
        requireStatus(r, ReferralStatus.ACCEPTED);

        Doctor doctor = doctorRepository.findByIdWithDepartment(r.getReferredToDoctor().getId())
                .orElseThrow(() -> notFound("Referred doctor not found."));
        HospitalDepartment dept = doctor.getDepartment();
        BookingConfirmationDTO booked;
        try {
            booked = bookingFlowService.confirmBooking(r.getPatient().getId(),
                    dept.getHospital().getId(), dept.getId(), doctor.getId(), date);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }

        Appointment followUp = appointmentRepository.findById(booked.getAppointmentId()).orElseThrow();
        followUp.setOriginReferralId(r.getId());
        followUp.setParentAppointmentId(r.getAppointment() != null ? r.getAppointment().getId() : null);

        r.setFollowUpAppointment(followUp);
        r.setStatus(ReferralStatus.FOLLOW_UP_BOOKED);
        r.setClosedAt(LocalDateTime.now());
        // Import the handover packet into the new visit as the new doctor's starting records (read-only).
        events.publishEvent(new HandoverEvents.FollowUpBooked(r.getId(), followUp.getId()));
        return r;
    }

    /**
     * Called when the referring doctor finalizes a visit (complete, or complete + follow-up):
     *   - referrals still awaiting a response (REQUESTED) are CANCELLED — the doctor kept the
     *     case, so the pending review/handover is withdrawn and the other doctor loses access;
     *   - second opinions that already came back (RESPONDED) are closed as reviewed.
     * Rows are kept (not deleted) so the history shows what happened.
     */
    @Transactional
    public void onVisitFinalized(Long appointmentId) {
        LocalDateTime now = LocalDateTime.now();
        for (Referral r : referralRepository.findByAppointmentId(appointmentId)) {
            if (r.getStatus() == ReferralStatus.REQUESTED) {
                r.setStatus(ReferralStatus.CANCELLED);
                r.setResponseNotes("Withdrawn — the referring doctor finalized the visit before a response.");
                r.setClosedAt(now);
            } else if (r.getKind() == ReferralKind.CONSULT && r.getStatus() == ReferralStatus.RESPONDED
                    && r.getClosedAt() == null) {
                r.setClosedAt(now);
            }
        }
    }

    /**
     * A booked referral follow-up was cancelled → back to ACCEPTED so the patient can
     * rebook, instead of the referral silently ending.
     */
    @org.springframework.context.event.EventListener
    public void onAppointmentCancelled(AppointmentCancelledEvent event) {
        Appointment appt = appointmentRepository.findById(event.appointmentId()).orElse(null);
        if (appt == null || appt.getOriginReferralId() == null) return;
        referralRepository.findById(appt.getOriginReferralId()).ifPresent(r -> {
            if (r.getStatus() == ReferralStatus.FOLLOW_UP_BOOKED && r.getFollowUpAppointment() != null
                    && r.getFollowUpAppointment().getId().equals(appt.getId())) {
                r.setStatus(ReferralStatus.ACCEPTED);
                r.setFollowUpAppointment(null);
                r.setClosedAt(null);
                referralRepository.save(r);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACCESS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * May this doctor see this appointment's records? Yes if they are its doctor, or hold
     * a non-declined/cancelled referral covering it (FULL_HISTORY for the patient, or CASE
     * for this appointment), or it is a follow-up booked from a referral to them.
     */
    @Transactional(readOnly = true)
    public boolean canView(Long doctorId, Appointment a) {
        if (doctorId == null || a == null) return false;
        if (a.getDoctor() != null && doctorId.equals(a.getDoctor().getId())) return true;
        if (a.getPatientFk() == null) return false;
        return viewableAppointmentIds(doctorId, a.getPatientFk()).contains(a.getId());
    }

    /**
     * Every appointment of this patient the doctor may see:
     *   1. direct access — visits the doctor attended, and visits shared with them for a
     *      second opinion (CONSULT: CASE, or everything for FULL_HISTORY);
     *   2. plus ancestors of those visits via parent_appointment_id (same-doctor follow-ups).
     * A handover (TRANSFER) grants NO live access to the referring doctor's visits and the
     * ancestor walk stops at a handover-booked visit: the new doctor works on a frozen copy
     * of the case imported into their own visit (CaseRecordsService), so later additions by
     * the referring doctor never reach them.
     */
    @Transactional(readOnly = true)
    public Set<Long> viewableAppointmentIds(Long doctorId, Long patientId) {
        List<Appointment> all = appointmentRepository.findByPatientFkOrderByDateStrDesc(patientId);
        Set<Long> direct = new HashSet<>();
        for (Referral r : referralRepository.findByPatientIdAndReferredToDoctorId(patientId, doctorId)) {
            if (!r.getStatus().grantsAccess() || r.getKind() == ReferralKind.TRANSFER) continue;
            if (r.getScope() == ReferralScope.FULL_HISTORY) {
                return all.stream().map(Appointment::getId).collect(java.util.stream.Collectors.toSet());
            }
            if (r.getAppointment() != null) direct.add(r.getAppointment().getId());
        }
        Map<Long, Long> parentOf = new HashMap<>();
        for (Appointment a : all) {
            if (a.getDoctor() != null && doctorId.equals(a.getDoctor().getId())) direct.add(a.getId());
            // Handover-booked visits start a new, separate case file — don't walk past them.
            if (a.getParentAppointmentId() != null && a.getOriginReferralId() == null) {
                parentOf.put(a.getId(), a.getParentAppointmentId());
            }
        }
        Set<Long> visible = new HashSet<>();
        for (Long id : direct) {
            Long cur = id;
            while (cur != null && visible.add(cur)) cur = parentOf.get(cur); // add() == false stops cycles
        }
        return visible;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUERIES (views)
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<ReferralView> incoming(Long doctorId) {
        return referralRepository.findByReferredToDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .map(r -> toView(r, Viewer.doctor(doctorId))).toList();
    }

    @Transactional(readOnly = true)
    public List<ReferralView> outgoing(Long doctorId) {
        return referralRepository.findByReferredByDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .filter(r -> !r.getReferredByDoctor().getId().equals(r.getReferredToDoctor().getId()))
                .map(r -> toView(r, Viewer.doctor(doctorId))).toList();
    }

    /** All referrals for the patient profiles owned by this user account (patient-visible ones only). */
    @Transactional(readOnly = true)
    public List<ReferralView> forUser(Long userId) {
        List<Long> patientIds = patientRepository.findByUserAccountIdOrderByIdDesc(userId).stream()
                .map(Patient::getId).toList();
        if (patientIds.isEmpty()) return List.of();
        return referralRepository.findByPatientIdInOrderByCreatedAtDesc(patientIds).stream()
                .filter(ReferralService::visibleToPatient)
                .map(r -> toView(r, Viewer.user(userId))).toList();
    }

    /**
     * Patients don't see referrals the referring doctor withdrew (CANCELLED — explicitly, or
     * because the visit was finalized before a response): the visit simply continues/completes.
     * A DECLINED referral stays visible so the patient knows the specialist turned it down.
     */
    private static boolean visibleToPatient(Referral r) {
        return r.getStatus() != ReferralStatus.CANCELLED;
    }

    @Transactional(readOnly = true)
    public ReferralView get(Long referralId, Viewer viewer) {
        Referral r = load(referralId);
        boolean allowed = (viewer.doctorId() != null
                && (viewer.doctorId().equals(r.getReferredByDoctor().getId())
                    || viewer.doctorId().equals(r.getReferredToDoctor().getId())))
                || (viewer.userId() != null && ownsPatient(viewer.userId(), r.getPatient()));
        if (!allowed) throw forbidden("You do not have access to this referral.");
        return toView(r, viewer);
    }

    @Transactional(readOnly = true)
    public AppointmentStatusView appointmentStatus(Long appointmentId, Viewer viewer) {
        Appointment a = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> notFound("Appointment not found."));
        List<Referral> refs = referralRepository.findByAppointmentId(appointmentId);
        String display = displayStatus(a, refs);
        ReferralView referredFrom = a.getOriginReferralId() == null ? null
                : referralRepository.findById(a.getOriginReferralId()).map(r -> toView(r, viewer)).orElse(null);
        boolean patientViewer = viewer.doctorId() == null && viewer.userId() != null;
        return new AppointmentStatusView(a.getId(), a.getStatus(), display, displayLabel(display),
                appointmentTimeline(a, refs, display),
                refs.stream().filter(r -> !patientViewer || visibleToPatient(r)).map(r -> toView(r, viewer)).toList(),
                referredFrom);
    }

    /** Batch: display status for many appointments in one referral query (for list screens). */
    @Transactional(readOnly = true)
    public Map<Long, String> displayStatuses(Collection<Appointment> appointments) {
        List<Long> ids = appointments.stream().map(Appointment::getId).toList();
        Map<Long, List<Referral>> byAppt = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Referral r : referralRepository.findByAppointmentIdIn(ids)) {
                byAppt.computeIfAbsent(r.getAppointment().getId(), k -> new ArrayList<>()).add(r);
            }
        }
        Map<Long, String> out = new HashMap<>();
        for (Appointment a : appointments) {
            out.put(a.getId(), displayStatus(a, byAppt.getOrDefault(a.getId(), List.of())));
        }
        return out;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATUS RULES — the ONLY place these are decided
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * confirmed | referred | feedback_received | completed | cancelled
     *  - explicit cancelled/completed win
     *  - a pending referral (awaiting review/acceptance) → referred
     *  - a responded consult not yet reviewed (visit not finalized) → feedback_received
     *  - otherwise past date → completed (legacy behaviour), else confirmed
     */
    public String displayStatus(Appointment a, List<Referral> refs) {
        if ("cancelled".equals(a.getStatus())) return "cancelled";
        List<Referral> real = refs.stream().filter(r -> !isSelfReferral(r)).toList();
        // Handed off to another doctor: the visit is completed, but shown as "referred".
        if (real.stream().anyMatch(ReferralService::isHandedOff)) return "referred";
        if ("completed".equals(a.getStatus())) return "completed";
        if (real.stream().anyMatch(r -> r.getStatus() == ReferralStatus.REQUESTED)) return "referred";
        if (real.stream().anyMatch(r -> r.getKind() == ReferralKind.CONSULT
                && r.getStatus() == ReferralStatus.RESPONDED && r.getClosedAt() == null)) {
            return "feedback_received";
        }
        if (isPast(a)) return "completed";
        return "confirmed";
    }

    public String displayLabel(String displayStatus) {
        return switch (displayStatus) {
            case "referred" -> "Referred";   // pending referral, or handed off (visit completed)
            case "feedback_received" -> "Feedback received";
            case "completed" -> "Completed";
            case "cancelled" -> "Cancelled";
            default -> "Confirmed";
        };
    }

    private List<TimelineStep> appointmentTimeline(Appointment a, List<Referral> refs, String display) {
        boolean hasReferral = refs.stream().anyMatch(r -> !isSelfReferral(r) && r.getStatus().grantsAccess());
        if (!hasReferral) {
            return steps(List.of("Scheduled", "Confirmed", "Completed"),
                    "completed".equals(display) ? 3 : 2, "cancelled".equals(display));
        }
        Optional<Referral> handOff = refs.stream().filter(r -> !isSelfReferral(r) && isHandedOff(r)).findFirst();
        if (handOff.isPresent()) {
            // Transfer accepted: this visit is finished — the case continues with the referred doctor.
            return steps(List.of("Scheduled", "Confirmed",
                    "Referred to " + handOff.get().getReferredToDoctor().getDoctorName()), 3, false);
        }
        String referredLabel = "feedback_received".equals(display) ? "Feedback received" : "Referred";
        int current = switch (display) {
            case "completed" -> 4;          // all done
            case "feedback_received" -> 3;  // referral done, awaiting finalize
            case "referred" -> 2;           // referral in progress
            default -> 2;
        };
        return steps(List.of("Scheduled", "Confirmed", referredLabel, "Completed"), current, "cancelled".equals(display));
    }

    private String referralLabel(Referral r) {
        boolean consult = r.getKind() == ReferralKind.CONSULT;
        return switch (r.getStatus()) {
            case REQUESTED -> consult ? "Awaiting review" : "Awaiting acceptance";
            case RESPONDED -> r.getClosedAt() != null ? "Feedback reviewed" : "Feedback sent";
            case ACCEPTED -> "Accepted — follow-up to be booked";
            case FOLLOW_UP_BOOKED -> "Follow-up booked";
            case DECLINED -> "Declined";
            case CANCELLED -> "Cancelled";
        };
    }

    private List<TimelineStep> referralTimeline(Referral r) {
        if (r.getStatus() == ReferralStatus.DECLINED || r.getStatus() == ReferralStatus.CANCELLED) {
            return List.of(new TimelineStep("Requested", "done"),
                    new TimelineStep(r.getStatus() == ReferralStatus.DECLINED ? "Declined" : "Cancelled", "done"));
        }
        if (r.getKind() == ReferralKind.CONSULT) {
            return steps(List.of("Requested", "Under review", "Feedback sent"),
                    r.getStatus() == ReferralStatus.RESPONDED ? 3 : 1, false);
        }
        int idx = switch (r.getStatus()) {
            case ACCEPTED -> 2;          // booking the follow-up is in progress
            case FOLLOW_UP_BOOKED -> 3;  // all done
            default -> 1;
        };
        return steps(List.of("Requested", "Accepted", "Follow-up booked"), idx, false);
    }

    /**
     * Second opinion: the referred doctor may add reports/prescriptions to the case while
     * reviewing it and after sending findings, until the referring doctor closes the visit.
     */
    public static boolean canAddConsultRecords(Referral r, Long doctorId) {
        return r.getKind() == ReferralKind.CONSULT
                && doctorId != null && doctorId.equals(r.getReferredToDoctor().getId())
                && (r.getStatus() == ReferralStatus.REQUESTED
                    || (r.getStatus() == ReferralStatus.RESPONDED && r.getClosedAt() == null));
    }

    private List<String> actionsFor(Referral r, Viewer v) {
        List<String> actions = new ArrayList<>();
        if (canAddConsultRecords(r, v.doctorId())) actions.add("add_records");
        boolean isTo = v.doctorId() != null && v.doctorId().equals(r.getReferredToDoctor().getId());
        boolean isFrom = v.doctorId() != null && v.doctorId().equals(r.getReferredByDoctor().getId());
        boolean isOwner = v.userId() != null && ownsPatient(v.userId(), r.getPatient());
        boolean transfer = r.getKind() == ReferralKind.TRANSFER;
        switch (r.getStatus()) {
            case REQUESTED -> {
                if (isTo && !isFrom) {
                    if (transfer) { actions.add("accept"); actions.add("book_follow_up"); }
                    else actions.add("respond");
                    actions.add("decline");
                }
                if (isFrom && !isTo) actions.add("cancel");
            }
            case ACCEPTED -> {
                if (transfer && (isTo || isOwner)) actions.add("book_follow_up");
            }
            default -> { }
        }
        return actions;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAPPING / HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private ReferralView toView(Referral r, Viewer viewer) {
        return new ReferralView(
                r.getId(), r.getKind().name(), r.getScope().name(), r.getStatus().name(),
                referralLabel(r), r.getNotes(), r.getResponseNotes(),
                r.getCreatedAt(), r.getRespondedAt(), r.getAcceptedAt(), r.getClosedAt(),
                patientRef(r.getPatient()),
                doctorRef(r.getReferredByDoctor()), doctorRef(r.getReferredToDoctor()),
                appointmentRef(r.getAppointment()), appointmentRef(r.getFollowUpAppointment()),
                referralTimeline(r), actionsFor(r, viewer));
    }

    public static PatientRef patientRef(Patient p) {
        if (p == null) return null;
        return new PatientRef(p.getId(), p.getFullName(), p.getAge(), p.getGender(), p.getBloodGroup(), p.getLocation());
    }

    public static DoctorRef doctorRef(Doctor d) {
        if (d == null) return null;
        HospitalDepartment dept = d.getDepartment();
        Hospital h = dept != null ? dept.getHospital() : null;
        return new DoctorRef(d.getId(), d.getDoctorName(), d.getQualification(),
                h != null ? h.getId() : null, h != null ? h.getName() : null,
                dept != null ? dept.getId() : null, dept != null ? dept.getDepartmentName() : null);
    }

    public AppointmentRef appointmentRef(Appointment a) {
        if (a == null) return null;
        return new AppointmentRef(a.getId(), a.getDateStr(), a.getStatus(), a.getTokenNum(),
                bookingFlowService.expectedTimeFor(a));
    }

    private void doAccept(Referral r) {
        r.setStatus(ReferralStatus.ACCEPTED);
        r.setAcceptedAt(LocalDateTime.now());
        Appointment source = r.getAppointment();
        if (source != null && "confirmed".equals(source.getStatus())) {
            source.setStatus("completed"); // handed off to the referred doctor
        }
        // Tell the patient to schedule with the new doctor (Records-tab unread badge).
        Notification n = new Notification();
        n.setPatientFk(r.getPatient().getId());
        n.setAppointmentId(source != null ? source.getId() : null);
        n.setType("referral_accepted");
        n.setMessage(r.getReferredToDoctor().getDoctorName()
                + " accepted your referral — please schedule your appointment.");
        notificationRepository.save(n);
    }

    /** currentIdx = index of the in-progress step; pass labels.size() when every step is done. */
    private static List<TimelineStep> steps(List<String> labels, int currentIdx, boolean cancelled) {
        List<TimelineStep> out = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            String state = cancelled ? (i == 0 ? "done" : "upcoming")
                    : i < currentIdx ? "done" : i == currentIdx ? "current" : "upcoming";
            out.add(new TimelineStep(labels.get(i), state));
        }
        return out;
    }

    /** TRANSFER accepted (booked or not): the source visit has been handed off. */
    private static boolean isHandedOff(Referral r) {
        return r.getKind() == ReferralKind.TRANSFER
                && (r.getStatus() == ReferralStatus.ACCEPTED || r.getStatus() == ReferralStatus.FOLLOW_UP_BOOKED);
    }

    private static boolean isSelfReferral(Referral r) {
        return r.getReferredByDoctor().getId().equals(r.getReferredToDoctor().getId());
    }

    private static boolean isPast(Appointment a) {
        try {
            return LocalDate.parse(a.getDateStr()).isBefore(LocalDate.now());
        } catch (Exception e) {
            return false;
        }
    }

    private boolean ownsPatient(Long userId, Patient p) {
        return p != null && userId.equals(p.getUserAccountId());
    }

    private Referral load(Long id) {
        return referralRepository.findById(id).orElseThrow(() -> notFound("Referral not found."));
    }

    private static void requireReferredDoctor(Referral r, Long doctorId) {
        if (doctorId == null || !doctorId.equals(r.getReferredToDoctor().getId())) {
            throw forbidden("Only the referred doctor can do this.");
        }
    }

    private static void requireKind(Referral r, ReferralKind kind, String msg) {
        if (r.getKind() != kind) throw bad(msg);
    }

    private static void requireStatus(Referral r, ReferralStatus expected) {
        if (r.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Referral is " + r.getStatus() + ", expected " + expected + ".");
        }
    }

    private static ResponseStatusException bad(String msg) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg); }
    private static ResponseStatusException forbidden(String msg) { return new ResponseStatusException(HttpStatus.FORBIDDEN, msg); }
    private static ResponseStatusException notFound(String msg) { return new ResponseStatusException(HttpStatus.NOT_FOUND, msg); }
}
