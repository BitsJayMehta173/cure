package com.medroute.controller;

import com.medroute.dto.ReferralViews.*;
import com.medroute.entity.ReferralKind;
import com.medroute.service.ReferralService;
import com.medroute.service.ReferralService.Viewer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * Referral pipeline API (redesign). All state changes go through ReferralService,
 * which validates the actor and the current state.
 *
 * Viewer/actor identity is passed as doctorId (doctor portal) or userId (patient app).
 *
 * Base path: /api/referrals
 */
@RestController
@RequestMapping("/api/referrals")
@CrossOrigin(origins = "*")
public class ReferralController {

    @Autowired
    private ReferralService referralService;

    /** POST /api/referrals — body: { patientId, fromDoctorId, toDoctorId, appointmentId?, kind: CONSULT|TRANSFER, notes } */
    @PostMapping
    public ResponseEntity<ReferralView> create(@RequestBody CreateReferralRequest req) {
        ReferralKind kind;
        try {
            kind = ReferralKind.valueOf(req.kind() == null ? "CONSULT" : req.kind().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "kind must be CONSULT or TRANSFER.");
        }
        var created = referralService.create(req.patientId(), req.fromDoctorId(), req.toDoctorId(),
                req.appointmentId(), kind, req.notes());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(referralService.get(created.getId(), Viewer.doctor(req.fromDoctorId())));
    }

    /** GET /api/referrals/incoming?doctorId= — referrals sent TO this doctor. */
    @GetMapping("/incoming")
    public List<ReferralView> incoming(@RequestParam Long doctorId) {
        return referralService.incoming(doctorId);
    }

    /** GET /api/referrals/outgoing?doctorId= — referrals sent BY this doctor. */
    @GetMapping("/outgoing")
    public List<ReferralView> outgoing(@RequestParam Long doctorId) {
        return referralService.outgoing(doctorId);
    }

    /** GET /api/referrals/patient?userId= — referrals for all of this account's patient profiles. */
    @GetMapping("/patient")
    public List<ReferralView> forPatient(@RequestParam Long userId) {
        return referralService.forUser(userId);
    }

    /** GET /api/referrals/{id}?doctorId=|userId= */
    @GetMapping("/{id}")
    public ReferralView get(@PathVariable Long id,
                            @RequestParam(required = false) Long doctorId,
                            @RequestParam(required = false) Long userId) {
        return referralService.get(id, new Viewer(doctorId, userId));
    }

    /** GET /api/referrals/appointment-status/{appointmentId}?doctorId=|userId= — server-computed status + timeline. */
    @GetMapping("/appointment-status/{appointmentId}")
    public AppointmentStatusView appointmentStatus(@PathVariable Long appointmentId,
                                                   @RequestParam(required = false) Long doctorId,
                                                   @RequestParam(required = false) Long userId) {
        return referralService.appointmentStatus(appointmentId, new Viewer(doctorId, userId));
    }

    /** POST /api/referrals/{id}/respond — body: { doctorId, findings } (CONSULT, referred doctor) */
    @PostMapping("/{id}/respond")
    public ReferralView respond(@PathVariable Long id, @RequestBody ActorRequest req) {
        referralService.respond(id, req.doctorId(), req.findings());
        return referralService.get(id, Viewer.doctor(req.doctorId()));
    }

    /** POST /api/referrals/{id}/accept — body: { doctorId } (TRANSFER, referred doctor) */
    @PostMapping("/{id}/accept")
    public ReferralView accept(@PathVariable Long id, @RequestBody ActorRequest req) {
        referralService.accept(id, req.doctorId());
        return referralService.get(id, Viewer.doctor(req.doctorId()));
    }

    /** POST /api/referrals/{id}/decline — body: { doctorId, reason } (referred doctor) */
    @PostMapping("/{id}/decline")
    public ReferralView decline(@PathVariable Long id, @RequestBody ActorRequest req) {
        referralService.decline(id, req.doctorId(), req.reason());
        return referralService.get(id, Viewer.doctor(req.doctorId()));
    }

    /** POST /api/referrals/{id}/cancel — body: { doctorId } (referring doctor) */
    @PostMapping("/{id}/cancel")
    public ReferralView cancel(@PathVariable Long id, @RequestBody ActorRequest req) {
        referralService.cancel(id, req.doctorId());
        return referralService.get(id, Viewer.doctor(req.doctorId()));
    }

    /**
     * POST /api/referrals/{id}/book-follow-up — body: { doctorId | userId, date: YYYY-MM-DD }
     * Books with the referred doctor at their own hospital and links it, atomically.
     */
    @PostMapping("/{id}/book-follow-up")
    public ReferralView bookFollowUp(@PathVariable Long id, @RequestBody ActorRequest req) {
        Viewer actor = new Viewer(req.doctorId(), req.userId());
        referralService.bookFollowUp(id, actor, parseDate(req.date()));
        return referralService.get(id, actor);
    }

    static LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date must be YYYY-MM-DD.");
        }
    }
}
