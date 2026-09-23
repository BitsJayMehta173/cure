package com.medroute.controller;

import com.medroute.dto.DoctorProfileDTO;
import com.medroute.dto.DoctorSearchResultDTO;
import com.medroute.service.DoctorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Doctor Directory API.
 * Provides fuzzy name search and full profile retrieval for the Doctor Directory tab.
 *
 * Base path: /api/doctors
 */
@RestController
@RequestMapping("/api/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    @Autowired
    private DoctorService doctorService;

    /**
     * GET /api/doctors/search?q=<query>&limit=<limit>
     * Real-time fuzzy search for doctors by name.
     * Results are ordered by similarity score (best match first).
     */
    @GetMapping("/search")
    public ResponseEntity<List<DoctorSearchResultDTO>> searchDoctors(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit) {
        List<DoctorSearchResultDTO> results = doctorService.searchDoctors(q, limit);
        return ResponseEntity.ok(results);
    }

    /**
     * GET /api/doctors/{id}
     * Returns the full profile of a doctor, including hospital info
     * and an "upcoming slots" availability flag.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DoctorProfileDTO> getDoctorProfile(@PathVariable Long id) {
        DoctorProfileDTO profile = doctorService.getDoctorProfile(id);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }

    /**
     * PUT /api/doctors/{id}
     * Updates doctor profile details (name, qualification, bio, photoUrl, experience, capacity, etc.).
     */
    @PutMapping("/{id}")
    public ResponseEntity<DoctorProfileDTO> updateDoctorProfile(
            @PathVariable Long id,
            @RequestBody com.medroute.dto.DoctorProfileUpdateRequest req) {
        DoctorProfileDTO updated = doctorService.updateDoctorProfile(id, req);
        return ResponseEntity.ok(updated);
    }

    /**
     * DELETE /api/doctors/{id}
     * Clears/resets customizable doctor profile fields.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DoctorProfileDTO> resetDoctorProfile(@PathVariable Long id) {
        DoctorProfileDTO reset = doctorService.deleteOrResetDoctorProfile(id);
        return ResponseEntity.ok(reset);
    }

    /**
     * GET /api/doctors/list
     * Returns all doctors with basic info for doctor onboarding/claiming.
     */
    @GetMapping("/list")
    public ResponseEntity<List<DoctorSearchResultDTO>> getAllDoctors() {
        List<DoctorSearchResultDTO> results = doctorService.getAllDoctorsBasic();
        return ResponseEntity.ok(results);
    }
}
