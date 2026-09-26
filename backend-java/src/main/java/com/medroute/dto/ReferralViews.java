package com.medroute.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Read models for the referral / follow-up pipeline. Every status the UI shows is
 * computed server-side (displayStatus + timeline + actions) so screens only render.
 */
public final class ReferralViews {

    private ReferralViews() {}

    /** One step of a progress stepper. state: "done" | "current" | "upcoming". */
    public record TimelineStep(String label, String state) {}

    public record PatientRef(Long id, String fullName, Integer age, String gender, String bloodGroup, String location) {}

    public record DoctorRef(Long id, String name, String qualification,
                            Long hospitalId, String hospitalName,
                            Long departmentId, String departmentName) {}

    public record AppointmentRef(Long id, String date, String status, Integer tokenNumber, String expectedTime) {}

    public record ReferralView(
            Long id,
            String kind,           // CONSULT | TRANSFER
            String scope,          // CASE | FULL_HISTORY
            String status,         // ReferralStatus name
            String displayStatus,  // human label, e.g. "Awaiting review"
            String notes,
            String responseNotes,
            LocalDateTime createdAt,
            LocalDateTime respondedAt,
            LocalDateTime acceptedAt,
            LocalDateTime closedAt,
            PatientRef patient,
            DoctorRef fromDoctor,
            DoctorRef toDoctor,
            AppointmentRef sourceAppointment,   // null for FULL_HISTORY
            AppointmentRef followUpAppointment, // TRANSFER once booked
            List<TimelineStep> timeline,
            List<String> actions                // what the requesting viewer may do: respond, accept, decline, cancel, book_follow_up
    ) {}

    /** Server-computed status of an appointment, including the effect of its referrals. */
    public record AppointmentStatusView(
            Long appointmentId,
            String status,         // raw appointment.status
            String displayStatus,  // confirmed | referred | feedback_received | completed | cancelled
            String displayLabel,
            List<TimelineStep> timeline,
            List<ReferralView> referrals,      // referrals sent FROM this visit
            ReferralView referredFrom          // handover this visit was booked from (null if a normal booking)
    ) {}

    public record FollowUpView(
            Long id,
            String status,         // OPEN | BOOKED | CANCELLED
            String notes,
            LocalDateTime createdAt,
            PatientRef patient,
            DoctorRef doctor,
            AppointmentRef sourceAppointment,
            AppointmentRef bookedAppointment,
            List<String> actions   // book
    ) {}

    // ─── Case records (reports / prescriptions / notes along the care chain) ─

    /** Who wrote a record and where it came from — shown next to every item. */
    public record Ownership(
            Long authorDoctorId,
            String authorName,
            String authorRole,     // "visit_doctor" | "second_opinion" | "imported" (copied in from a handover)
            Long appointmentId,    // visit it belongs to (null for referral-only records / handover packet)
            String visitDate,      // date of the visit it was ORIGINALLY recorded on
            Long referralId,
            boolean inherited,     // from an earlier visit in the (same-doctor) care chain
            boolean mine           // written by the viewing doctor
    ) {}

    public record CaseReport(Long id, String reportType, String title, String textContent,
                             String fileUrl, java.time.LocalDate reportDate, Ownership owner) {}

    public record CasePrescription(Long id, String medicineName, String dosage, String frequency,
                                   String duration, String instructions,
                                   java.time.LocalDate prescribedDate, Ownership owner) {}

    /** General advice written on a visit, or findings sent back on a second opinion. */
    public record CaseNote(String kind /* advice | findings */, String text, Ownership owner) {}

    public record CaseRecordsView(
            Long appointmentId,    // the visit being viewed (null when viewing a FULL_HISTORY referral)
            Long referralId,       // set when viewed as a referral workspace
            boolean canAdd,        // may the viewer add records here
            List<CaseReport> reports,
            List<CasePrescription> prescriptions,
            List<CaseNote> notes
    ) {}

    // ─── Requests ─────────────────────────────────────────────────────────

    /** Add a record either to a visit (appointmentId, by its doctor) or to a second opinion (referralId, by the referred doctor). */
    public record AddReportRequest(Long doctorId, Long appointmentId, Long referralId,
                                   String reportType, String title, String textContent, String fileUrl) {}

    public record AddPrescriptionRequest(Long doctorId, Long appointmentId, Long referralId,
                                         String medicineName, String dosage, String frequency,
                                         String duration, String instructions) {}

    public record CreateReferralRequest(Long patientId, Long fromDoctorId, Long toDoctorId,
                                        Long appointmentId, String kind, String notes) {}

    /** Identifies who is acting. Exactly one of doctorId / userId (patient's account). */
    public record ActorRequest(Long doctorId, Long userId, String findings, String reason, String date) {}

    public record CreateFollowUpRequest(Long sourceAppointmentId, Long doctorId, String date, String notes) {}
}
