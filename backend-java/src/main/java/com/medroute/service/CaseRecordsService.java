package com.medroute.service;

import com.medroute.dto.PrescriptionDTO;
import com.medroute.dto.MedicalReportDTO;
import com.medroute.dto.ReferralViews.*;
import com.medroute.entity.*;
import com.medroute.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * The case file doctors work on: reports, prescriptions and notes of a visit, with an
 * owner on every item.
 *
 * Sharing rules:
 *   - Same-doctor follow-ups: the visit shows its ancestors' records (live, read-only).
 *   - Second opinion (CONSULT): live shared case — the referred doctor adds records onto the
 *     shared visit (CASE) or the referral (FULL_HISTORY) while the referral is open.
 *   - Handover (TRANSFER): COPY, never a live link.
 *       1. On referral creation the referring doctor's case file is frozen into a packet
 *          (is_snapshot rows on the referral) — the referred doctor reviews that packet.
 *       2. When the follow-up is booked the packet is imported into the new visit as the
 *          new doctor's starting records (imported_from_referral_id, read-only like all records). Later additions by the referring
 *          doctor stay on their own visit and never reach the new one.
 *
 * Records are IMMUTABLE: once written (by anyone, or imported from a handover) they are
 * never edited. Writes are append-only: a visit's doctor adds records to their visit; a
 * CONSULT doctor adds contributions while the referral is open.
 */
@Service
public class CaseRecordsService {

    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private MedicalReportRepository reportRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private ReferralRepository referralRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ReferralService referralService;

    // ═══════════════════════════════════════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════════════════════════════════════

    /** Case file of one visit, as seen by a doctor who may view it. */
    @Transactional(readOnly = true)
    public CaseRecordsView forAppointment(Long appointmentId, Long doctorId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
        if (!referralService.canView(doctorId, appt)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this visit.");
        }
        boolean canAdd = isVisitDoctor(appt, doctorId) && !"cancelled".equals(appt.getStatus());
        List<Appointment> chain = chainOf(appt);
        List<Long> ids = chain.stream().map(Appointment::getId).toList();
        return build(chain, appt.getId(), null, doctorId, canAdd,
                reportRepository.findByAppointmentIdIn(ids), prescriptionRepository.findByAppointmentIdIn(ids), true);
    }

    /** Case file of a referral (the referral workspace), for either of its doctors. */
    @Transactional(readOnly = true)
    public CaseRecordsView forReferral(Long referralId, Long doctorId) {
        Referral r = loadReferral(referralId);
        boolean party = doctorId != null && (doctorId.equals(r.getReferredToDoctor().getId())
                || doctorId.equals(r.getReferredByDoctor().getId()));
        if (!party) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this referral.");

        if (r.getKind() == ReferralKind.TRANSFER) {
            // Handover packet: the frozen copy taken when the case was referred. Read-only.
            return build(List.of(), null, r, doctorId, false,
                    reportRepository.findByReferralIdAndSnapshotTrue(r.getId()),
                    prescriptionRepository.findByReferralIdAndSnapshotTrue(r.getId()), false);
        }
        List<Appointment> chain = r.getAppointment() != null ? chainOf(r.getAppointment()) : List.of();
        List<Long> ids = chain.stream().map(Appointment::getId).toList();
        List<MedicalReport> reports = new ArrayList<>(ids.isEmpty() ? List.of() : reportRepository.findByAppointmentIdIn(ids));
        List<Prescription> rx = new ArrayList<>(ids.isEmpty() ? List.of() : prescriptionRepository.findByAppointmentIdIn(ids));
        if (r.getAppointment() == null) {
            // FULL_HISTORY second opinion: contributions live on the referral only
            reports.addAll(reportRepository.findByReferralIdAndSnapshotFalse(r.getId()));
            rx.addAll(prescriptionRepository.findByReferralIdAndSnapshotFalse(r.getId()));
        }
        return build(chain, r.getAppointment() != null ? r.getAppointment().getId() : null, r, doctorId,
                ReferralService.canAddConsultRecords(r, doctorId), reports, rx, true);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMANDS — add (records are append-only)
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional
    public MedicalReportDTO addReport(AddReportRequest req) {
        if (req.title() == null || req.title().isBlank()) throw bad("Report title is required.");
        Target t = resolveTarget(req.doctorId(), req.appointmentId(), req.referralId());
        MedicalReport m = new MedicalReport();
        m.setAppointmentId(t.appointmentId());
        m.setReferralId(t.referralId());
        m.setReportType(req.reportType() != null && !req.reportType().isBlank() ? req.reportType() : "text");
        m.setTitle(req.title().trim());
        m.setTextContent(req.textContent());
        m.setFileUrl(req.fileUrl());
        m.setReportDate(LocalDate.now());
        m.setCreatedAt(LocalDateTime.now());
        m.setAuthorDoctorId(t.doctor().getId());
        m.setAuthorName(t.doctor().getDoctorName());
        reportRepository.save(m);
        notifyPatient(t.patientId(), t.appointmentId(), "report_added",
                "New report \"" + m.getTitle() + "\" from " + t.doctor().getDoctorName() + ".");
        return toDTO(m);
    }

    @Transactional
    public PrescriptionDTO addPrescription(AddPrescriptionRequest req) {
        if (req.medicineName() == null || req.medicineName().isBlank()) throw bad("Medicine name is required.");
        Target t = resolveTarget(req.doctorId(), req.appointmentId(), req.referralId());
        Prescription p = new Prescription();
        p.setAppointmentId(t.appointmentId());
        p.setReferralId(t.referralId());
        p.setMedicineName(req.medicineName().trim());
        p.setDosage(req.dosage());
        p.setFrequency(req.frequency());
        p.setDuration(req.duration());
        p.setInstructions(req.instructions());
        p.setPrescribedDate(LocalDate.now());
        p.setAuthorDoctorId(t.doctor().getId());
        p.setAuthorName(t.doctor().getDoctorName());
        prescriptionRepository.save(p);
        notifyPatient(t.patientId(), t.appointmentId(), "prescription_added",
                t.doctor().getDoctorName() + " prescribed " + p.getMedicineName() + ".");
        return toDTO(p);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HANDOVER — snapshot on referral, import on booking
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Freeze the referring doctor's case file into the handover packet: reports and
     * prescriptions as they are now, plus general advice / second-opinion findings as text
     * reports. Authors and original visits are preserved on every copy.
     */
    @EventListener
    public void onHandoverCreated(HandoverEvents.Created event) {
        Referral r = loadReferral(event.referralId());
        Long fromDoctorId = r.getReferredByDoctor().getId();
        List<Appointment> visits;
        if (r.getAppointment() != null) {
            visits = chainOf(r.getAppointment());
        } else {
            Set<Long> visible = referralService.viewableAppointmentIds(fromDoctorId, r.getPatient().getId());
            visits = appointmentRepository.findAllById(visible);
        }
        List<Long> ids = visits.stream().map(Appointment::getId).toList();
        if (ids.isEmpty()) return;

        for (MedicalReport src : reportRepository.findByAppointmentIdIn(ids)) {
            MedicalReport c = copyOf(src);
            c.setSnapshot(true);
            c.setReferralId(r.getId());
            reportRepository.save(c);
        }
        for (Prescription src : prescriptionRepository.findByAppointmentIdIn(ids)) {
            Prescription c = copyOf(src);
            c.setSnapshot(true);
            c.setReferralId(r.getId());
            prescriptionRepository.save(c);
        }
        for (Appointment a : visits) {
            if (a.getGeneralAdvice() != null && !a.getGeneralAdvice().isBlank() && a.getDoctor() != null) {
                reportRepository.save(noteSnapshot(r, a, "General advice", a.getGeneralAdvice(),
                        a.getDoctor().getId(), a.getDoctor().getDoctorName()));
            }
        }
        for (Referral consult : referralRepository.findByAppointmentIdIn(ids)) {
            if (consult.getKind() == ReferralKind.CONSULT && consult.getStatus() == ReferralStatus.RESPONDED
                    && consult.getResponseNotes() != null && !consult.getResponseNotes().isBlank()) {
                reportRepository.save(noteSnapshot(r, consult.getAppointment(), "Second-opinion findings",
                        consult.getResponseNotes(), consult.getReferredToDoctor().getId(),
                        consult.getReferredToDoctor().getDoctorName()));
            }
        }
    }

    /** Import the handover packet into the newly booked visit as the new doctor's starting records. */
    @EventListener
    public void onHandoverFollowUpBooked(HandoverEvents.FollowUpBooked event) {
        for (MedicalReport pkt : reportRepository.findByReferralIdAndSnapshotTrue(event.referralId())) {
            MedicalReport c = copyOf(pkt);
            c.setSourceRecordId(pkt.getSourceRecordId());
            c.setAppointmentId(event.appointmentId());
            c.setImportedFromReferralId(event.referralId());
            reportRepository.save(c);
        }
        for (Prescription pkt : prescriptionRepository.findByReferralIdAndSnapshotTrue(event.referralId())) {
            Prescription c = copyOf(pkt);
            c.setSourceRecordId(pkt.getSourceRecordId());
            c.setAppointmentId(event.appointmentId());
            c.setImportedFromReferralId(event.referralId());
            prescriptionRepository.save(c);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNALS
    // ═══════════════════════════════════════════════════════════════════════

    /** Where a new record goes, and who writes it. */
    private record Target(Doctor doctor, Long appointmentId, Long referralId, Long patientId) {}

    private Target resolveTarget(Long doctorId, Long appointmentId, Long referralId) {
        Doctor doctor = loadDoctor(doctorId);
        if (referralId != null) {
            Referral r = loadReferral(referralId);
            if (!ReferralService.canAddConsultRecords(r, doctorId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only the second-opinion doctor can add records, while the referral is open.");
            }
            Long apptId = r.getAppointment() != null ? r.getAppointment().getId() : null;
            return new Target(doctor, apptId, r.getId(), r.getPatient().getId());
        }
        if (appointmentId == null) throw bad("appointmentId or referralId is required.");
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found."));
        if (!isVisitDoctor(appt, doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only this visit's doctor can add records to it. Earlier doctors' records are read-only.");
        }
        if ("cancelled".equals(appt.getStatus())) throw bad("Cannot add records to a cancelled visit.");
        return new Target(doctor, appt.getId(), null, appt.getPatientFk());
    }

    /**
     * The visit plus its ancestors via parent_appointment_id, newest first. Stops at a
     * handover-booked visit: its history arrives as imported copies, not live records.
     */
    private List<Appointment> chainOf(Appointment start) {
        List<Appointment> chain = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        Appointment cur = start;
        while (cur != null && seen.add(cur.getId())) {
            chain.add(cur);
            if (cur.getOriginReferralId() != null) break;
            cur = cur.getParentAppointmentId() != null
                    ? appointmentRepository.findById(cur.getParentAppointmentId()).orElse(null) : null;
        }
        return chain;
    }

    private CaseRecordsView build(List<Appointment> chain, Long focusApptId, Referral focusReferral,
                                  Long viewerDoctorId, boolean canAdd,
                                  List<MedicalReport> reportRows, List<Prescription> rxRows, boolean includeNotes) {
        Map<Long, Appointment> visits = new LinkedHashMap<>();
        chain.forEach(a -> visits.put(a.getId(), a));
        // Original visits of copied records (for provenance dates)
        Set<Long> sourceVisitIds = new HashSet<>();
        reportRows.forEach(m -> { if (m.getSourceAppointmentId() != null) sourceVisitIds.add(m.getSourceAppointmentId()); });
        rxRows.forEach(p -> { if (p.getSourceAppointmentId() != null) sourceVisitIds.add(p.getSourceAppointmentId()); });
        sourceVisitIds.removeAll(visits.keySet());
        appointmentRepository.findAllById(sourceVisitIds).forEach(a -> visits.putIfAbsent(a.getId(), a));

        Map<Long, Referral> referrals = new HashMap<>();
        List<Long> chainIds = chain.stream().map(Appointment::getId).toList();
        if (!chainIds.isEmpty()) referralRepository.findByAppointmentIdIn(chainIds).forEach(r -> referrals.put(r.getId(), r));
        if (focusReferral != null) referrals.put(focusReferral.getId(), focusReferral);

        List<CaseReport> reports = reportRows.stream()
                .sorted(Comparator.comparing(MedicalReport::getReportDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(MedicalReport::getId, Comparator.reverseOrder()))
                .map(m -> new CaseReport(m.getId(), m.getReportType(), m.getTitle(), m.getTextContent(),
                        m.getFileUrl(), m.getReportDate(),
                        owner(m.getAuthorDoctorId(), m.getAuthorName(), m.getAppointmentId(), m.getReferralId(),
                                m.getSourceAppointmentId(), m.getImportedFromReferralId() != null,
                                visits, referrals, focusApptId, viewerDoctorId)))
                .toList();

        List<CasePrescription> prescriptions = rxRows.stream()
                .sorted(Comparator.comparing(Prescription::getPrescribedDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Prescription::getId))
                .map(p -> new CasePrescription(p.getId(), p.getMedicineName(), p.getDosage(), p.getFrequency(),
                        p.getDuration(), p.getInstructions(), p.getPrescribedDate(),
                        owner(p.getAuthorDoctorId(), p.getAuthorName(), p.getAppointmentId(), p.getReferralId(),
                                p.getSourceAppointmentId(), p.getImportedFromReferralId() != null,
                                visits, referrals, focusApptId, viewerDoctorId)))
                .toList();

        List<CaseNote> notes = new ArrayList<>();
        if (includeNotes) {
            for (Appointment a : chain) {
                if (a.getGeneralAdvice() != null && !a.getGeneralAdvice().isBlank() && a.getDoctor() != null) {
                    notes.add(new CaseNote("advice", a.getGeneralAdvice(),
                            owner(a.getDoctor().getId(), a.getDoctor().getDoctorName(), a.getId(), null, null,
                                    false, visits, referrals, focusApptId, viewerDoctorId)));
                }
            }
            for (Referral r : referrals.values()) {
                if (r.getKind() == ReferralKind.CONSULT && r.getStatus() == ReferralStatus.RESPONDED
                        && r.getResponseNotes() != null && !r.getResponseNotes().isBlank()) {
                    Long apptId = r.getAppointment() != null ? r.getAppointment().getId() : null;
                    notes.add(new CaseNote("findings", r.getResponseNotes(),
                            owner(r.getReferredToDoctor().getId(), r.getReferredToDoctor().getDoctorName(), apptId,
                                    r.getId(), null, false, visits, referrals, focusApptId, viewerDoctorId)));
                }
            }
        }

        return new CaseRecordsView(focusApptId, focusReferral != null ? focusReferral.getId() : null,
                canAdd, reports, prescriptions, notes);
    }

    private Ownership owner(Long authorDoctorId, String authorName, Long appointmentId, Long referralId,
                            Long sourceAppointmentId, boolean imported,
                            Map<Long, Appointment> visits, Map<Long, Referral> referrals,
                            Long focusApptId, Long viewerDoctorId) {
        Appointment visit = appointmentId != null ? visits.get(appointmentId) : null;
        Appointment originalVisit = sourceAppointmentId != null ? visits.get(sourceAppointmentId) : visit;
        // Seeded/demo records may lack an author id — fall back to the visit's doctor.
        Long authorId = authorDoctorId != null ? authorDoctorId
                : (referralId == null && visit != null && visit.getDoctor() != null ? visit.getDoctor().getId() : null);
        String name = authorName != null && !authorName.isBlank() ? authorName
                : (visit != null && visit.getDoctor() != null ? visit.getDoctor().getDoctorName() : "Unknown");

        Referral ref = referralId != null ? referrals.get(referralId) : null;
        String role;
        if (imported || sourceAppointmentId != null) role = "imported";
        else if (ref != null && ref.getKind() == ReferralKind.CONSULT) role = "second_opinion";
        else role = "visit_doctor";

        boolean mine = viewerDoctorId != null && viewerDoctorId.equals(authorId);
        boolean inherited = focusApptId != null && appointmentId != null && !focusApptId.equals(appointmentId);
        return new Ownership(authorId, name, role, appointmentId,
                originalVisit != null ? originalVisit.getDateStr() : null, referralId, inherited, mine);
    }

    private MedicalReport copyOf(MedicalReport src) {
        MedicalReport c = new MedicalReport();
        c.setReportType(src.getReportType());
        c.setTitle(src.getTitle());
        c.setTextContent(src.getTextContent());
        c.setFileUrl(src.getFileUrl());
        c.setReportDate(src.getReportDate());
        c.setCreatedAt(LocalDateTime.now());
        c.setAuthorDoctorId(src.getAuthorDoctorId());
        c.setAuthorName(src.getAuthorName());
        c.setSourceRecordId(src.getId());
        c.setSourceAppointmentId(src.getSourceAppointmentId() != null ? src.getSourceAppointmentId() : src.getAppointmentId());
        return c;
    }

    private Prescription copyOf(Prescription src) {
        Prescription c = new Prescription();
        c.setMedicineName(src.getMedicineName());
        c.setDosage(src.getDosage());
        c.setFrequency(src.getFrequency());
        c.setDuration(src.getDuration());
        c.setInstructions(src.getInstructions());
        c.setPrescribedDate(src.getPrescribedDate());
        c.setAuthorDoctorId(src.getAuthorDoctorId());
        c.setAuthorName(src.getAuthorName());
        c.setSourceRecordId(src.getId());
        c.setSourceAppointmentId(src.getSourceAppointmentId() != null ? src.getSourceAppointmentId() : src.getAppointmentId());
        return c;
    }

    /** Advice / findings frozen into the packet as a text report (so they import with the other records). */
    private MedicalReport noteSnapshot(Referral packet, Appointment visit, String title, String text,
                                       Long authorId, String authorName) {
        MedicalReport m = new MedicalReport();
        m.setSnapshot(true);
        m.setReferralId(packet.getId());
        m.setReportType("text");
        m.setTitle(title);
        m.setTextContent(text);
        m.setReportDate(visit != null && visit.getDateStr() != null ? LocalDate.parse(visit.getDateStr()) : LocalDate.now());
        m.setCreatedAt(LocalDateTime.now());
        m.setAuthorDoctorId(authorId);
        m.setAuthorName(authorName);
        m.setSourceAppointmentId(visit != null ? visit.getId() : null);
        return m;
    }

    private void notifyPatient(Long patientId, Long appointmentId, String type, String message) {
        if (patientId == null) return;
        Notification n = new Notification();
        n.setPatientFk(patientId);
        n.setAppointmentId(appointmentId);
        n.setType(type);
        n.setMessage(message);
        notificationRepository.save(n);
    }

    private MedicalReportDTO toDTO(MedicalReport m) {
        MedicalReportDTO dto = new MedicalReportDTO();
        dto.setId(m.getId());
        dto.setReportType(m.getReportType());
        dto.setTitle(m.getTitle());
        dto.setTextContent(m.getTextContent());
        dto.setFileUrl(m.getFileUrl());
        dto.setReportDate(m.getReportDate());
        dto.setAuthorName(m.getAuthorName());
        dto.setAuthorDoctorId(m.getAuthorDoctorId());
        dto.setReferralId(m.getReferralId());
        return dto;
    }

    private PrescriptionDTO toDTO(Prescription p) {
        PrescriptionDTO dto = new PrescriptionDTO();
        dto.setId(p.getId());
        dto.setMedicineName(p.getMedicineName());
        dto.setDosage(p.getDosage());
        dto.setFrequency(p.getFrequency());
        dto.setDuration(p.getDuration());
        dto.setInstructions(p.getInstructions());
        dto.setPrescribedDate(p.getPrescribedDate());
        dto.setAuthorName(p.getAuthorName());
        dto.setAuthorDoctorId(p.getAuthorDoctorId());
        dto.setReferralId(p.getReferralId());
        return dto;
    }

    private static boolean isVisitDoctor(Appointment a, Long doctorId) {
        return doctorId != null && a.getDoctor() != null && doctorId.equals(a.getDoctor().getId());
    }

    private Doctor loadDoctor(Long doctorId) {
        if (doctorId == null) throw bad("doctorId is required.");
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found."));
    }

    private Referral loadReferral(Long id) {
        return referralRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Referral not found."));
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
