package com.medroute.controller;

import com.medroute.dto.ReferralViews.*;
import com.medroute.service.FollowUpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Same-doctor follow-ups (replaces self-referrals).
 *
 * Base path: /api/follow-ups
 */
@RestController
@RequestMapping("/api/follow-ups")
@CrossOrigin(origins = "*")
public class FollowUpController {

    @Autowired
    private FollowUpService followUpService;

    /**
     * POST /api/follow-ups — body: { sourceAppointmentId, doctorId, date?, notes }
     * Finalizes the source visit; books immediately when date is given, else leaves it OPEN for the patient.
     */
    @PostMapping
    public ResponseEntity<FollowUpView> create(@RequestBody CreateFollowUpRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(followUpService.create(
                req.sourceAppointmentId(), req.doctorId(), ReferralController.parseDate(req.date()), req.notes()));
    }

    /** GET /api/follow-ups/patient?userId= */
    @GetMapping("/patient")
    public List<FollowUpView> forPatient(@RequestParam Long userId) {
        return followUpService.forUser(userId);
    }

    /** POST /api/follow-ups/{id}/book — body: { userId, date } */
    @PostMapping("/{id}/book")
    public FollowUpView book(@PathVariable Long id, @RequestBody ActorRequest req) {
        return followUpService.bookByPatient(id, req.userId(), ReferralController.parseDate(req.date()));
    }
}
