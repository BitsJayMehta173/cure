package com.medroute.controller;

import com.medroute.entity.Appointment;
import com.medroute.entity.Doctor;
import com.medroute.entity.Patient;
import com.medroute.repository.FollowUpRequestRepository;
import com.medroute.service.ReferralService;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.CancellationRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.MedicalReportRepository;
import com.medroute.repository.NotificationRepository;
import com.medroute.repository.PatientRepository;
import com.medroute.repository.PrescriptionRepository;
import com.medroute.repository.ReferralRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Doctor Portal API — doctor-facing data endpoints.
 * Used by the Doctor Dashboard for the Patient Directory and Appointments tabs.
 *
 * Base path: /api/doctor-portal
 */
@RestController
@RequestMapping("/api/doctor-portal")
@CrossOrigin(origins = "*")
public class DoctorPortalController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ReferralRepository referralRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private CancellationRepository cancellationRepository;

    @Autowired
    private MedicalReportRepository medicalReportRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private FollowUpRequestRepository followUpRequestRepository;

    @Autowired
    private ReferralService referralService;

    /**
     * GET /api/doctor-portal/patients?doctorId=
     * Returns distinct patients who have had an appointment with this doctor.
     * Only includes appointments with a linked patient profile (patientFk != null).
     */
    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getDoctorPatients(
            @RequestParam Long doctorId,
            @RequestParam(required = false) String search) {

        List<Appointment> appointments = appointmentRepository.findByDoctorIdOrderByIdDesc(doctorId);

        // Get distinct patient IDs from appointments
        Set<Long> patientIds = appointments.stream()
                .filter(a -> a.getPatientFk() != null)
                .map(Appointment::getPatientFk)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        // Plus patients referred to this doctor (referrals that still grant record access)
        referralRepository.findByReferredToDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .filter(r -> r.getPatient() != null && r.getStatus().grantsAccess())
                .forEach(r -> patientIds.add(r.getPatient().getId()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Long patientId : patientIds) {
            patientRepository.findById(patientId).ifPresent(p -> {
                // Find latest appointment for this patient with this doctor
                Optional<Appointment> lastAppt = appointments.stream()
                        .filter(a -> patientId.equals(a.getPatientFk()))
                        .findFirst();

                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("fullName", p.getFullName() != null ? p.getFullName() : "Unknown");
                map.put("age", p.getAge());
                map.put("gender", p.getGender() != null ? p.getGender() : "");
                map.put("bloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
                map.put("mobile", p.getMobile() != null ? p.getMobile() : "");
                map.put("relation", p.getRelation() != null ? p.getRelation() : "");
                map.put("lastVisitDate", lastAppt.map(Appointment::getDateStr).orElse(""));
                map.put("lastVisitStatus", lastAppt.map(Appointment::getStatus).orElse(""));
                result.add(map);
            });
        }

        // Apply search filter
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            return ResponseEntity.ok(result.stream()
                    .filter(m -> {
                        String name = ((String) m.get("fullName")).toLowerCase();
                        String mobile = ((String) m.get("mobile")).toLowerCase();
                        String bg = ((String) m.get("bloodGroup")).toLowerCase();
                        return name.contains(q) || mobile.contains(q) || bg.contains(q);
                    })
                    .collect(Collectors.toList()));
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/doctor-portal/appointments?doctorId=&date=YYYY-MM-DD
     * Returns appointments for this doctor on the given date, ordered by token number.
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<Map<String, Object>>> getDoctorAppointments(
            @RequestParam Long doctorId,
            @RequestParam String date) {

        List<Appointment> appointments =
                appointmentRepository.findByDoctorIdAndDateStrOrderByTokenNumAsc(doctorId, date);
        Map<Long, String> displayStatuses = referralService.displayStatuses(appointments);

        List<Map<String, Object>> result = appointments.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("displayStatus", displayStatuses.get(a.getId()));
            map.put("patientName", a.getPatientName() != null ? a.getPatientName() : "Walk-in Patient");
            map.put("patientFk", a.getPatientFk());
            map.put("tokenNum", a.getTokenNum());
            map.put("tokenCode", a.getTokenCode());
            map.put("dateStr", a.getDateStr());
            map.put("status", a.getStatus());
            map.put("generalAdvice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "");

            // Calculate expected time from token number and avg minutes
            int avgMins = 15;
            if (a.getDoctor() != null && a.getDoctor().getAvgMinutesPerPatient() != null) {
                avgMins = a.getDoctor().getAvgMinutesPerPatient();
            }
            int tokenNum = a.getTokenNum() != null ? a.getTokenNum() : 1;
            int minutesFromStart = (tokenNum - 1) * avgMins;
            int startHour = 9; // 9:00 AM
            int totalMinutes = startHour * 60 + minutesFromStart;
            int hour = totalMinutes / 60;
            int min = totalMinutes % 60;
            String ampm = hour >= 12 ? "PM" : "AM";
            int displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
            map.put("expectedTimeStr", String.format("%02d:%02d %s", displayHour, min, ampm));

            // Hospital & department
            String hospName = "";
            String deptName = "";
            if (a.getDoctor() != null && a.getDoctor().getDepartment() != null) {
                deptName = a.getDoctor().getDepartment().getDepartmentName();
                if (a.getDoctor().getDepartment().getHospital() != null) {
                    hospName = a.getDoctor().getDepartment().getHospital().getName();
                }
            }
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            map.put("doctorName", a.getDoctor() != null ? a.getDoctor().getDoctorName() : "");
            map.put("hospitalId", a.getHospitalId());
            map.put("departmentId", a.getDepartmentId());

            // Patient info if linked
            if (a.getPatientFk() != null) {
                patientRepository.findById(a.getPatientFk()).ifPresent(p -> {
                    map.put("patientAge", p.getAge());
                    map.put("patientGender", p.getGender() != null ? p.getGender() : "");
                    map.put("patientBloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
                    map.put("patientMobile", p.getMobile() != null ? p.getMobile() : "");
                });
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/doctor-portal/appointment-dates?doctorId=
     * Returns distinct dates (YYYY-MM-DD) on which this doctor has appointments, newest first.
     */
    @GetMapping("/appointment-dates")
    public ResponseEntity<List<String>> getAppointmentDates(@RequestParam Long doctorId) {
        List<Appointment> appointments = appointmentRepository.findByDoctorIdOrderByIdDesc(doctorId);
        List<String> dates = appointments.stream()
                .map(Appointment::getDateStr)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dates);
    }

    /**
     * GET /api/doctor-portal/appointments/{id}
     * Returns the details of a single appointment (for referred cases).
     */
    @GetMapping("/appointments/{id}")
    public ResponseEntity<Map<String, Object>> getAppointmentById(@PathVariable Long id) {
        return appointmentRepository.findById(id).map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("displayStatus", referralService.displayStatuses(List.of(a)).get(a.getId()));
            map.put("patientName", a.getPatientName() != null ? a.getPatientName() : "Unknown");
            map.put("tokenNum", a.getTokenNum() != null ? a.getTokenNum() : 0);
            map.put("expectedTimeStr", a.getTokenNum() != null ? "Token #" + a.getTokenNum() : "TBD");
            map.put("status", a.getStatus() != null ? a.getStatus() : "scheduled");
            map.put("dateStr", a.getDateStr() != null ? a.getDateStr() : "");
            map.put("generalAdvice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "");
            
            String hospName = "";
            String deptName = "";
            if (a.getDoctor() != null && a.getDoctor().getDepartment() != null) {
                deptName = a.getDoctor().getDepartment().getDepartmentName();
                if (a.getDoctor().getDepartment().getHospital() != null) {
                    hospName = a.getDoctor().getDepartment().getHospital().getName();
                }
            }
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            map.put("doctorName", a.getDoctor() != null ? a.getDoctor().getDoctorName() : "");
            map.put("hospitalId", a.getHospitalId());
            map.put("departmentId", a.getDepartmentId());

            if (a.getPatientFk() != null) {
                patientRepository.findById(a.getPatientFk()).ifPresent(p -> {
                    map.put("patientAge", p.getAge());
                    map.put("patientGender", p.getGender() != null ? p.getGender() : "");
                    map.put("patientBloodGroup", p.getBloodGroup() != null ? p.getBloodGroup() : "");
                    map.put("patientMobile", p.getMobile() != null ? p.getMobile() : "");
                });
            }
            return ResponseEntity.ok(map);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/doctor-portal/appointments/{id}/advice
     * Returns the general advice for an appointment.
     */
    @GetMapping("/appointments/{id}/advice")
    public ResponseEntity<Map<String, String>> getAdvice(@PathVariable Long id) {
        return appointmentRepository.findById(id)
                .map(a -> ResponseEntity.ok(Map.of("advice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "")))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/doctor-portal/appointments/{id}/complete
     * Marks an appointment as completed.
     */
    @PostMapping("/appointments/{id}/complete")
    public ResponseEntity<?> completeAppointment(@PathVariable Long id) {
        return appointmentRepository.findById(id).map(a -> {
            a.setStatus("completed");
            appointmentRepository.save(a);
            referralService.onVisitFinalized(id); // withdraws pending referrals, closes answered second opinions
            return ResponseEntity.ok(Map.of("success", true, "message", "Appointment marked as completed"));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT /api/doctor-portal/appointments/{id}/advice
     * Saves the general advice for an appointment. Write-once: like all medical records,
     * advice cannot be changed after it has been saved (409).
     */
    @PutMapping("/appointments/{id}/advice")
    public ResponseEntity<Map<String, String>> updateAdvice(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return appointmentRepository.findById(id)
                .map(a -> {
                    if (a.getGeneralAdvice() != null && !a.getGeneralAdvice().isBlank()) {
                        throw new org.springframework.web.server.ResponseStatusException(
                                org.springframework.http.HttpStatus.CONFLICT,
                                "General advice has already been saved and can't be changed.");
                    }
                    String advice = body.getOrDefault("advice", "");
                    if (advice == null || advice.isBlank()) {
                        throw new org.springframework.web.server.ResponseStatusException(
                                org.springframework.http.HttpStatus.BAD_REQUEST, "Advice is empty.");
                    }
                    a.setGeneralAdvice(advice.trim());
                    appointmentRepository.save(a);
                    return ResponseEntity.ok(Map.of("advice", a.getGeneralAdvice()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/doctor-portal/patients/{id}/profile
     * Returns full bio/profile of a patient.
     */
    @GetMapping("/patients/{id}/profile")
    public ResponseEntity<Patient> getPatientProfile(@PathVariable Long id) {
        return patientRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/doctor-portal/patients/{id}/history?doctorId=
     * Returns past appointments for a patient that this doctor is allowed to see.
     */
    @GetMapping("/patients/{id}/history")
    public ResponseEntity<List<Map<String, Object>>> getPatientHistory(
            @PathVariable Long id,
            @RequestParam Long doctorId) {
            
        // Access rule lives in ReferralService.canView (attending doctor, or an
        // access-granting referral covering this appointment / the full history).
        Set<Long> visible = referralService.viewableAppointmentIds(doctorId, id);
        List<Appointment> appointments = appointmentRepository.findByPatientFkOrderByDateStrDesc(id).stream()
                .filter(a -> visible.contains(a.getId()))
                .sorted(Comparator.comparing(Appointment::getId).reversed())
                .collect(Collectors.toList());

        List<Map<String, Object>> result = appointments.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("dateStr", a.getDateStr());
            map.put("status", a.getStatus());
            map.put("generalAdvice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : "");
            
            String hospName = "";
            String deptName = "";
            String docName = "";
            if (a.getDoctor() != null) {
                docName = a.getDoctor().getDoctorName();
                if (a.getDoctor().getDepartment() != null) {
                    deptName = a.getDoctor().getDepartment().getDepartmentName();
                    if (a.getDoctor().getDepartment().getHospital() != null) {
                        hospName = a.getDoctor().getDepartment().getHospital().getName();
                    }
                }
            }
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            map.put("doctorName", docName);
            // Ownership / provenance of this record in the care chain
            map.put("doctorId", a.getDoctor() != null ? a.getDoctor().getId() : null);
            map.put("ownRecord", a.getDoctor() != null && a.getDoctor().getId().equals(doctorId));
            map.put("parentAppointmentId", a.getParentAppointmentId());
            map.put("originReferralId", a.getOriginReferralId());
            
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/doctor-portal/doctors/search?q=
     * Searches doctors by name (for referrals)
     */
    @GetMapping("/doctors/search")
    public ResponseEntity<List<Map<String, Object>>> searchDoctors(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        String query = q.trim().toLowerCase();
        
        List<Doctor> doctors = doctorRepository.findAll().stream()
                .filter(d -> d.getDoctorName() != null && d.getDoctorName().toLowerCase().contains(query))
                .limit(20) // Limit results
                .collect(Collectors.toList());
                
        List<Map<String, Object>> result = doctors.stream().map(d -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            map.put("name", d.getDoctorName());
            map.put("qualification", d.getQualification());
            
            String hospName = "";
            String deptName = "";
            if (d.getDepartment() != null) {
                deptName = d.getDepartment().getDepartmentName();
                if (d.getDepartment().getHospital() != null) {
                    hospName = d.getDepartment().getHospital().getName();
                }
            }
            map.put("hospitalName", hospName);
            map.put("departmentName", deptName);
            
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/doctor-portal/test-data/clear-all
     * Wipes ALL transactional test data: referrals, appointments, cancellations,
     * medical reports, prescriptions and notifications. Does NOT touch master data
     * (hospitals, doctors, patients/profiles, users).
     */
    @DeleteMapping("/test-data/clear-all")
    @Transactional
    public ResponseEntity<?> clearAllTestData() {
        try {
            notificationRepository.deleteAll();
            followUpRequestRepository.deleteAll();
            prescriptionRepository.deleteAll();
            medicalReportRepository.deleteAll();
            cancellationRepository.deleteAll();
            referralRepository.deleteAll();
            appointmentRepository.deleteAll();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All test data cleared: appointments, referrals, reports, prescriptions, cancellations, notifications."
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
