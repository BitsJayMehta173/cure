package com.medroute.controller;

import com.medroute.entity.Appointment;
import com.medroute.entity.Doctor;
import com.medroute.entity.Patient;
import com.medroute.entity.Referral;
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

        // Get distinct patient IDs from referrals to this doctor
        List<Referral> referrals = referralRepository.findByReferredToDoctorId(doctorId);
        referrals.stream()
                .filter(r -> r.getPatient() != null)
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

        List<Map<String, Object>> result = appointments.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
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
     * PUT /api/doctor-portal/appointments/{id}/advice
     * Updates the general advice for an appointment.
     */
    @PutMapping("/appointments/{id}/advice")
    public ResponseEntity<Map<String, String>> updateAdvice(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return appointmentRepository.findById(id)
                .map(a -> {
                    a.setGeneralAdvice(body.getOrDefault("advice", ""));
                    appointmentRepository.save(a);
                    return ResponseEntity.ok(Map.of("advice", a.getGeneralAdvice() != null ? a.getGeneralAdvice() : ""));
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
            
        // Check referrals for this doctor and patient
        List<Referral> doctorReferrals = referralRepository.findByPatientId(id).stream()
                .filter(r -> r.getReferredToDoctor() != null && r.getReferredToDoctor().getId().equals(doctorId))
                .collect(Collectors.toList());
                
        boolean hasFullPatientAccess = doctorReferrals.stream()
                .anyMatch(r -> "FULL_PATIENT".equals(r.getReferralType()));
                
        List<Long> singleCaseApptIds = doctorReferrals.stream()
                .filter(r -> "SINGLE_CASE".equals(r.getReferralType()) && r.getAppointment() != null)
                .map(r -> r.getAppointment().getId())
                .collect(Collectors.toList());

        List<Appointment> appointments = appointmentRepository.findAll().stream()
                .filter(a -> id.equals(a.getPatientFk()))
                // Filter by permission:
                // 1. Doctor is the attending doctor
                // 2. Doctor has FULL_PATIENT referral
                // 3. Appointment was explicitly referred as SINGLE_CASE to this doctor
                .filter(a -> hasFullPatientAccess 
                        || (a.getDoctor() != null && a.getDoctor().getId().equals(doctorId))
                        || singleCaseApptIds.contains(a.getId()))
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
     * POST /api/doctor-portal/referrals
     * Creates a new referral. Prevents duplicates.
     * referralType: "FULL_PATIENT" (whole history) or "SINGLE_CASE" (one appointment)
     */
    @PostMapping("/referrals")
    public ResponseEntity<?> createReferral(@RequestBody Map<String, Object> payload) {
        try {
            Long patientId = Long.valueOf(payload.get("patientId").toString());
            Long referredByDoctorId = Long.valueOf(payload.get("referredByDoctorId").toString());
            Long referredToDoctorId = Long.valueOf(payload.get("referredToDoctorId").toString());
            String notes = payload.containsKey("notes") ? payload.get("notes").toString() : "";
            Long appointmentId = payload.containsKey("appointmentId") && payload.get("appointmentId") != null 
                ? Long.valueOf(payload.get("appointmentId").toString()) 
                : null;
            String referralType = payload.containsKey("referralType") 
                ? payload.get("referralType").toString() 
                : (appointmentId != null ? "SINGLE_CASE" : "FULL_PATIENT");

            Optional<Patient> patient = patientRepository.findById(patientId);
            Optional<Doctor> byDoctor = doctorRepository.findById(referredByDoctorId);
            Optional<Doctor> toDoctor = doctorRepository.findById(referredToDoctorId);

            if (patient.isEmpty() || byDoctor.isEmpty() || toDoctor.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid patient or doctor IDs"));
            }

            // Duplicate check
            if (appointmentId != null) {
                // SINGLE_CASE: check if same appointment already referred to same doctor
                Optional<Referral> existing = referralRepository
                        .findByPatientIdAndReferredToDoctorIdAndAppointmentId(patientId, referredToDoctorId, appointmentId);
                if (existing.isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "This case has already been referred to this doctor."));
                }
            } else {
                // FULL_PATIENT: check if full patient referral already exists
                Optional<Referral> existing = referralRepository
                        .findByPatientIdAndReferredToDoctorIdAndReferralType(patientId, referredToDoctorId, "FULL_PATIENT");
                if (existing.isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "This patient has already been referred to this doctor."));
                }
            }

            Referral referral = new Referral();
            referral.setPatient(patient.get());
            referral.setReferredByDoctor(byDoctor.get());
            referral.setReferredToDoctor(toDoctor.get());
            referral.setNotes(notes);
            referral.setReferralType(referralType);
            
            if (appointmentId != null) {
                appointmentRepository.findById(appointmentId).ifPresent(a -> {
                    referral.setAppointment(a);
                    a.setStatus("completed"); // Auto-complete when referred
                    appointmentRepository.save(a);
                });
            }

            referralRepository.save(referral);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Referral sent successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/doctor-portal/referrals?doctorId=
     * Returns all referrals sent TO this doctor, with patient and referring doctor info.
     */
    @GetMapping("/referrals")
    public ResponseEntity<List<Map<String, Object>>> getReferrals(@RequestParam Long doctorId) {
        List<Referral> referrals = referralRepository.findByReferredToDoctorId(doctorId);

        List<Map<String, Object>> result = referrals.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("notes", r.getNotes() != null ? r.getNotes() : "");
            map.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            map.put("referralType", r.getReferralType() != null ? r.getReferralType() : "FULL_PATIENT");
            map.put("referralStatus", r.getReferralStatus() != null ? r.getReferralStatus() : "pending");

            // Patient info
            if (r.getPatient() != null) {
                map.put("patientId", r.getPatient().getId());
                map.put("patientName", r.getPatient().getFullName() != null ? r.getPatient().getFullName() : "Unknown");
                map.put("patientAge", r.getPatient().getAge());
                map.put("patientGender", r.getPatient().getGender() != null ? r.getPatient().getGender() : "");
                map.put("patientBloodGroup", r.getPatient().getBloodGroup() != null ? r.getPatient().getBloodGroup() : "");
                map.put("patientLocation", r.getPatient().getLocation() != null ? r.getPatient().getLocation() : "");
            }

            // Referring doctor info
            if (r.getReferredByDoctor() != null) {
                map.put("referredByDoctorId", r.getReferredByDoctor().getId());
                map.put("referredByDoctorName", r.getReferredByDoctor().getDoctorName());
                String hospName = "";
                String deptName = "";
                if (r.getReferredByDoctor().getDepartment() != null) {
                    deptName = r.getReferredByDoctor().getDepartment().getDepartmentName();
                    if (r.getReferredByDoctor().getDepartment().getHospital() != null) {
                        hospName = r.getReferredByDoctor().getDepartment().getHospital().getName();
                    }
                }
                map.put("referredByHospital", hospName);
                map.put("referredByDepartment", deptName);
            }

            // Appointment info if linked
            if (r.getAppointment() != null) {
                map.put("appointmentId", r.getAppointment().getId());
                map.put("appointmentDate", r.getAppointment().getDateStr() != null ? r.getAppointment().getDateStr() : "");
            }

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/doctor-portal/referrals/{id}/complete-analysis
     * Marks a referral as analysed.
     */
    @PostMapping("/referrals/{id}/complete-analysis")
    public ResponseEntity<?> completeAnalysis(@PathVariable Long id) {
        return referralRepository.findById(id).map(r -> {
            r.setReferralStatus("analysed");
            referralRepository.save(r);
            return ResponseEntity.ok(Map.of("success", true, "message", "Analysis complete"));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/doctor-portal/referrals/clear-all
     * Deletes all referrals from the database (for testing purposes).
     */
    @DeleteMapping("/referrals/clear-all")
    public ResponseEntity<?> clearAllReferrals() {
        try {
            referralRepository.deleteAll();
            return ResponseEntity.ok(Map.of("success", true, "message", "All referrals have been cleared from the database."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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
