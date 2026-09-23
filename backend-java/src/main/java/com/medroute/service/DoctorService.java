package com.medroute.service;

import com.medroute.dto.DoctorProfileDTO;
import com.medroute.dto.DoctorSearchResultDTO;
import com.medroute.entity.Doctor;
import com.medroute.entity.Hospital;
import com.medroute.entity.HospitalDepartment;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.repository.HospitalRepository;
import com.medroute.repository.HospitalDepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for the Doctor Directory feature.
 * Handles fuzzy name search and full profile retrieval.
 */
@Service
public class DoctorService {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private HospitalDepartmentRepository hospitalDepartmentRepository;

    /**
     * Search doctors by name using PostgreSQL pg_trgm similarity.
     * Returns compact search results suitable for card rendering.
     */
    public List<DoctorSearchResultDTO> searchDoctors(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        String trimmed = query.trim();
        int safeLimit = Math.max(1, Math.min(limit, 50));

        List<Object[]> rows = doctorRepository.searchDoctorsByName(trimmed, safeLimit);

        return rows.stream().map(row -> {
            DoctorSearchResultDTO dto = new DoctorSearchResultDTO();
            dto.setId(((Number) row[0]).longValue());
            dto.setName((String) row[1]);
            dto.setQualification((String) row[2]);
            dto.setPhotoUrl((String) row[3]);
            dto.setHospitalName((String) row[4]);
            dto.setHospitalId(((Number) row[5]).longValue());
            dto.setDepartmentName((String) row[6]);
            dto.setDepartmentId(((Number) row[7]).longValue());
            dto.setYearsOfExperience(row[8] != null ? ((Number) row[8]).intValue() : null);
            dto.setTotalPatientsTreated(row[9] != null ? ((Number) row[9]).intValue() : null);
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Retrieve all doctors for onboarding / listing.
     */
    public List<DoctorSearchResultDTO> getAllDoctorsBasic() {
        List<Doctor> doctors = doctorRepository.findAllWithDepartment();
        return doctors.stream().map(doctor -> {
            var dept = doctor.getDepartment();
            var hospital = dept.getHospital();
            DoctorSearchResultDTO dto = new DoctorSearchResultDTO();
            dto.setId(doctor.getId());
            dto.setName(doctor.getDoctorName());
            dto.setQualification(doctor.getQualification());
            dto.setPhotoUrl(doctor.getPhotoUrl());
            dto.setHospitalName(hospital != null ? hospital.getName() : "");
            dto.setHospitalId(hospital != null ? hospital.getId() : 0L);
            dto.setDepartmentName(dept != null ? dept.getDepartmentName() : "");
            dto.setDepartmentId(dept != null ? dept.getId() : 0L);
            dto.setYearsOfExperience(doctor.getYearsOfExperience());
            dto.setTotalPatientsTreated(doctor.getTotalPatientsTreated());
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Retrieve the full profile for a single doctor, including hospital info
     * and a check for upcoming availability.
     */
    public DoctorProfileDTO getDoctorProfile(Long doctorId) {
        // fetch with department + hospital eagerly (no lazy proxy)
        Optional<Doctor> opt = doctorRepository.findByIdWithDepartment(doctorId);
        if (opt.isEmpty()) {
            return null;
        }

        Doctor doctor = opt.get();
        var dept = doctor.getDepartment();
        var hospital = dept.getHospital();

        // Check if this doctor has any open slots in the next 30 days
        boolean hasUpcomingSlots = hasUpcomingSlots(doctor);

        DoctorProfileDTO dto = new DoctorProfileDTO();
        dto.setId(doctor.getId());
        dto.setName(doctor.getDoctorName());
        dto.setQualification(doctor.getQualification());
        dto.setPhotoUrl(doctor.getPhotoUrl());
        dto.setBio(doctor.getBio());
        dto.setHospitalName(hospital.getName());
        dto.setHospitalId(hospital.getId());
        dto.setHospitalAddress(hospital.getAddress());
        dto.setHospitalState(hospital.getState());
        dto.setDepartmentName(dept.getDepartmentName());
        dto.setDepartmentId(dept.getId());
        dto.setYearsOfExperience(doctor.getYearsOfExperience());
        dto.setTotalPatientsTreated(doctor.getTotalPatientsTreated());
        dto.setAvgMinutesPerPatient(doctor.getAvgMinutesPerPatient());
        dto.setDailyLimit(doctor.getDailyLimit());
        dto.setHasUpcomingSlots(hasUpcomingSlots);

        return dto;
    }

    /**
     * Update doctor profile fields from Doctor UI.
     */
    public DoctorProfileDTO updateDoctorProfile(Long doctorId, com.medroute.dto.DoctorProfileUpdateRequest req) {
        Doctor doctor = doctorRepository.findByIdWithDepartment(doctorId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Doctor not found"));

        if (req.name != null && !req.name.isBlank()) {
            doctor.setDoctorName(req.name.trim());
        }
        if (req.qualification != null) {
            doctor.setQualification(req.qualification.trim());
        }
        if (req.photoUrl != null) {
            doctor.setPhotoUrl(req.photoUrl.trim());
        }
        if (req.bio != null) {
            doctor.setBio(req.bio.trim());
        }
        if (req.yearsOfExperience != null) {
            doctor.setYearsOfExperience(Math.max(0, req.yearsOfExperience));
        }
        if (req.totalPatientsTreated != null) {
            doctor.setTotalPatientsTreated(Math.max(0, req.totalPatientsTreated));
        }
        if (req.avgMinutesPerPatient != null) {
            doctor.setAvgMinutesPerPatient(Math.max(5, req.avgMinutesPerPatient));
        }
        if (req.dailyLimit != null) {
            doctor.setDailyLimit(Math.max(0, req.dailyLimit));
        }

        // Update hospital and department assignment if provided
        if (req.hospitalName != null && !req.hospitalName.isBlank()) {
            String targetHospName = req.hospitalName.trim();
            String targetDeptName = (req.departmentName != null && !req.departmentName.isBlank())
                    ? req.departmentName.trim()
                    : (doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentName() : "General Medicine");

            List<Hospital> hospitals = hospitalRepository.findAll();
            Hospital targetHospital = hospitals.stream()
                    .filter(h -> h.getName().equalsIgnoreCase(targetHospName))
                    .findFirst()
                    .orElse(null);

            if (targetHospital == null) {
                targetHospital = new Hospital();
                targetHospital.setName(targetHospName);
                if (req.hospitalAddress != null) targetHospital.setAddress(req.hospitalAddress.trim());
                if (req.hospitalState != null) targetHospital.setState(req.hospitalState.trim());
                targetHospital = hospitalRepository.save(targetHospital);
            } else {
                boolean changed = false;
                if (req.hospitalAddress != null && !req.hospitalAddress.isBlank() && !req.hospitalAddress.trim().equals(targetHospital.getAddress())) {
                    targetHospital.setAddress(req.hospitalAddress.trim());
                    changed = true;
                }
                if (req.hospitalState != null && !req.hospitalState.isBlank() && !req.hospitalState.trim().equals(targetHospital.getState())) {
                    targetHospital.setState(req.hospitalState.trim());
                    changed = true;
                }
                if (changed) {
                    targetHospital = hospitalRepository.save(targetHospital);
                }
            }

            List<HospitalDepartment> depts = hospitalDepartmentRepository.findByHospitalId(targetHospital.getId());
            HospitalDepartment targetDept = depts.stream()
                    .filter(d -> d.getDepartmentName().equalsIgnoreCase(targetDeptName))
                    .findFirst()
                    .orElse(null);

            if (targetDept == null) {
                targetDept = new HospitalDepartment();
                targetDept.setHospital(targetHospital);
                targetDept.setDepartmentName(targetDeptName);
                targetDept = hospitalDepartmentRepository.save(targetDept);
            }

            doctor.setDepartment(targetDept);
        } else if (req.departmentName != null && !req.departmentName.isBlank()) {
            if (doctor.getDepartment() != null && doctor.getDepartment().getHospital() != null) {
                var currentHosp = doctor.getDepartment().getHospital();
                String targetDeptName = req.departmentName.trim();
                List<HospitalDepartment> depts = hospitalDepartmentRepository.findByHospitalId(currentHosp.getId());
                HospitalDepartment targetDept = depts.stream()
                        .filter(d -> d.getDepartmentName().equalsIgnoreCase(targetDeptName))
                        .findFirst()
                        .orElse(null);
                if (targetDept == null) {
                    targetDept = new HospitalDepartment();
                    targetDept.setHospital(currentHosp);
                    targetDept.setDepartmentName(targetDeptName);
                    targetDept = hospitalDepartmentRepository.save(targetDept);
                }
                doctor.setDepartment(targetDept);
            }
        }

        doctorRepository.save(doctor);
        return getDoctorProfile(doctorId);
    }

    /**
     * Clear / reset customizable profile fields.
     */
    public DoctorProfileDTO deleteOrResetDoctorProfile(Long doctorId) {
        Doctor doctor = doctorRepository.findByIdWithDepartment(doctorId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Doctor not found"));

        doctor.setBio("");
        doctor.setPhotoUrl("");
        doctor.setYearsOfExperience(0);
        doctor.setTotalPatientsTreated(0);
        doctor.setAvgMinutesPerPatient(15);
        doctor.setDailyLimit(0);

        doctorRepository.save(doctor);
        return getDoctorProfile(doctorId);
    }

    /**
     * Returns true if the doctor has at least one open slot in the next 30 days.
     */
    private boolean hasUpcomingSlots(Doctor doctor) {
        LocalDate today = LocalDate.now();
        int dailyLimit = Optional.ofNullable(doctor.getDailyLimit()).orElse(0);
        if (dailyLimit <= 0) return false;

        for (int i = 0; i < 30; i++) {
            LocalDate date = today.plusDays(i);
            // Skip Sundays
            if (date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) continue;

            long booked = appointmentRepository.countByDoctorIdAndDateStrAndStatusNot(
                    doctor.getId(), date.toString(), "cancelled");
            if (booked < dailyLimit) {
                return true; // at least one open slot found
            }
        }
        return false;
    }
}
