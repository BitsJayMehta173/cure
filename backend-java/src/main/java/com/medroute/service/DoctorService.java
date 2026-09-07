package com.medroute.service;

import com.medroute.dto.DoctorProfileDTO;
import com.medroute.dto.DoctorSearchResultDTO;
import com.medroute.entity.Doctor;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
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
     * Retrieve the full profile for a single doctor, including hospital info
     * and a check for upcoming availability.
     */
    public DoctorProfileDTO getDoctorProfile(Long doctorId) {
        // fetch with department + hospital eagerly (no lazy proxy)
        Optional<Doctor> opt = doctorRepository.findById(doctorId);
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
