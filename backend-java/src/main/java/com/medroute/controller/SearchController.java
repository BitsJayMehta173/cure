package com.medroute.controller;

import com.medroute.dto.AppointmentDTO;
import com.medroute.dto.HospitalDTO;
import com.medroute.entity.Doctor;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import com.medroute.service.OptimizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Dynamic search controller — no hardcoded strings.
 * All data comes from PostgreSQL via JPA queries.
 */
@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private OptimizationService optimizationService;

    @GetMapping("/state")
    public List<HospitalDTO> searchByState(
            @RequestParam String state,
            @RequestParam String condition,
            @RequestParam Integer urgency,
            @RequestParam(required = false, defaultValue = "false") Boolean expandRadius,
            @RequestParam(required = false, defaultValue = "false") Boolean aiOptimize,
            @RequestParam(required = false, defaultValue = "false") Boolean lowestQueueTime,
            @RequestParam(required = false, defaultValue = "false") Boolean customFilter,
            @RequestParam(required = false, defaultValue = "0") Integer maxWait,
            @RequestParam(required = false, defaultValue = "0") Integer maxTravel,
            @RequestParam(required = false) String journeyDate,
            @RequestParam(required = false) String journeyTime,
            @RequestParam(required = false) String travelMode,
            @RequestParam(required = false, defaultValue = "false") Boolean requireSenior,
            @RequestParam(required = false, defaultValue = "false") Boolean requireFastQueue,
            @RequestParam(required = false) String patientCity) {

        // 1. Fetch matching doctors dynamically from DB (no hardcoded names!)
        List<Doctor> doctors;
        if (expandRadius || aiOptimize) {
            // Expand across ALL states for the given department
            doctors = doctorRepository.findByDepartment(condition);
        } else {
            doctors = doctorRepository.findByStateAndDepartment(state, condition);
        }

        // 2. Convert urgency integer (1-10) to label for ML service
        String urgencyStr = "ROUTINE";
        if (urgency >= 8) urgencyStr = "CRITICAL";
        else if (urgency >= 5) urgencyStr = "URGENT";

        // 3. Group doctors by their hospital into HospitalDTO objects
        //    Use LinkedHashMap to preserve insertion order
        Map<Long, HospitalDTO> hospitalMap = new LinkedHashMap<>();

        for (Doctor doctor : doctors) {
            var dept = doctor.getDepartment();
            var hospital = dept.getHospital();
            Long hospitalId = hospital.getId();

            // Get or create HospitalDTO for this hospital
            HospitalDTO hospitalDTO = hospitalMap.computeIfAbsent(hospitalId, id -> {
                HospitalDTO dto = new HospitalDTO();
                dto.setHospitalId(hospitalId);
                dto.setName(hospital.getName());
                dto.setState(hospital.getState());
                dto.setAppointments(new ArrayList<>());
                dto.setCount(0);
                return dto;
            });

            // 4. Compute Distance and Transport First (so we can check reachability)
            double distanceKm = 0;
            if (hospital.getLatitude() != null && hospital.getLongitude() != null) {
                // Use custom patient city coords if provided, else fall back to state center
                double[] patientCoords = (patientCity != null && !patientCity.isEmpty() && OptimizationService.CITY_COORDINATES.containsKey(patientCity))
                        ? OptimizationService.CITY_COORDINATES.get(patientCity)
                        : OptimizationService.STATE_COORDINATES.getOrDefault(state, new double[]{26.9124, 75.7873});
                distanceKm = optimizationService.haversine(
                        patientCoords[0], patientCoords[1],
                        hospital.getLatitude(), hospital.getLongitude());
            }
            OptimizationService.TransportInfo transport = optimizationService.getTransportInfo(distanceKm, urgencyStr, travelMode);

            // Senior/FastQueue filter — skip this doctor if they don't qualify
            int exp = (doctor.getYearsOfExperience() != null) ? doctor.getYearsOfExperience() : 0;
            int avgMins = (doctor.getAvgMinutesPerPatient() != null) ? doctor.getAvgMinutesPerPatient() : 15;
            if (requireSenior && exp < 15) continue;
            if (requireFastQueue && avgMins > 15) continue;

            // 5. Find the NEXT AVAILABLE DATE by scanning forward from today (or custom journeyDate)
            LocalDate targetDate = journeyDate != null && !journeyDate.isEmpty() 
                    ? LocalDate.parse(journeyDate) 
                    : LocalDate.now();
            long bookedOnTarget = 0;
            int daysToWait = 0;
            java.time.LocalTime now = journeyTime != null && !journeyTime.isEmpty()
                    ? java.time.LocalTime.parse(journeyTime)
                    : java.time.LocalTime.now();

            // Scan up to 30 days forward to find an open AND REACHABLE slot
            for (int d = 0; d < 30; d++) {
                LocalDate currentDate = targetDate.plusDays(d);
                bookedOnTarget = appointmentRepository.countByDoctorIdAndDateStr(
                        doctor.getId(), currentDate.toString());
                
                if (bookedOnTarget < doctor.getDailyLimit()) {
                    if (d == 0) {
                        // Today: verify patient can reach hospital before appointment time
                        int currentToken = (int) bookedOnTarget + 1;
                        int totalMinutes = (currentToken - 1) * avgMins;
                        java.time.LocalTime apptTime = java.time.LocalTime.of(9, 0).plusMinutes(totalMinutes);
                        java.time.LocalTime arrivalTime = now.plusMinutes((long) (transport.estimatedHours * 60));
                        
                        // If arrival wraps midnight or is after appointment time, skip to next day
                        if (arrivalTime.isBefore(now) || arrivalTime.isAfter(apptTime)) {
                            continue; 
                        }
                    }
                    
                    daysToWait = d;
                    // Fix: Update targetDate to the actual found date so the DTO gets the right date
                    targetDate = currentDate; 
                    break;
                }
            }

            // Re-count for the chosen target date (final accurate value)
            bookedOnTarget = appointmentRepository.countByDoctorIdAndDateStr(
                    doctor.getId(), targetDate.toString());
            int remainingSlots = doctor.getDailyLimit() - (int) bookedOnTarget;

            // Score now uses realistic transport time + doctor intelligence bonuses
            double score = optimizationService.calculateScore(daysToWait, distanceKm, urgencyStr, travelMode, exp, avgMins);
            double displayScore = Math.max(0, 100 - score * 5);

            // 6. Build AppointmentDTO for this doctor
            AppointmentDTO appt = new AppointmentDTO();
            appt.setDoctorId(doctor.getId());
            appt.setName(doctor.getDoctorName());
            appt.setInitials(getInitials(doctor.getDoctorName()));
            appt.setQualification("MD, " + dept.getDepartmentName());
            appt.setDepartment(dept.getDepartmentName());
            appt.setHospitalName(hospital.getName());
            appt.setDate(targetDate.toString());

            int currentToken = (int) bookedOnTarget + 1;
            appt.setToken(currentToken);

            // Use dynamic avgMins instead of hardcoded 15
            String appointmentTime = calculateTime(currentToken, 9, avgMins);
            appt.setTime(appointmentTime);

            // Shift end uses dynamic avgMins
            String shiftEndTime = calculateTime(doctor.getDailyLimit() + 1, 9, avgMins);
            appt.setShiftHours("09:00 AM - " + shiftEndTime);

            appt.setDistanceKm(distanceKm);
            appt.setWaitDays(daysToWait);
            appt.setAiScore(displayScore);
            appt.setTransportMode(transport.mode);
            appt.setTransportEmoji(transport.emoji);
            appt.setTransportTimeHrs(transport.estimatedHours);
            appt.setTransportDescription(transport.description);
            appt.setIsLongDistance(transport.isLongDistance);
            // Doctor intelligence fields
            appt.setYearsOfExperience(exp);
            appt.setTotalPatientsTreated(doctor.getTotalPatientsTreated());
            appt.setAvgMinutesPerPatient(avgMins);


            if (remainingSlots <= 0) {
                appt.setStatus("Full");
                appt.setStatusType("error");
            } else if (remainingSlots <= 2) {
                appt.setStatus("Almost Full");
                appt.setStatusType("warning");
            } else {
                appt.setStatus("Available");
                appt.setStatusType("success");
            }

            if (aiOptimize) {
                appt.setTradeoffLabel(String.format("AI Score: %.0f | Wait: %d day(s) | Dist: %.0f km",
                        displayScore, daysToWait, distanceKm));
            } else {
                appt.setTradeoffLabel(String.format("%d slot(s) left | %.0f km away", remainingSlots, distanceKm));
            }

            // Custom Filter: Exclude if wait or travel is too high
            if (customFilter) {
                if (daysToWait > maxWait || distanceKm > maxTravel) {
                    continue; // Skip this appointment
                }
                appt.setTradeoffLabel(String.format("Matches Custom Filter | Wait: %d day(s) | Dist: %.0f km", daysToWait, distanceKm));
            }

            hospitalDTO.getAppointments().add(appt);
            hospitalDTO.setCount(hospitalDTO.getAppointments().size());
        }

        List<HospitalDTO> resultList = new ArrayList<>(hospitalMap.values());
        
        // Remove hospitals that have no appointments matching the filters
        resultList.removeIf(dto -> dto.getAppointments().isEmpty());

        // ALWAYS sort results based on the optimization goal
        for (HospitalDTO dto : resultList) {
            dto.getAppointments().sort((a, b) -> {
                if (lowestQueueTime || urgency == 10) {
                    // Nearest possible time
                    int waitCompare = a.getWaitDays().compareTo(b.getWaitDays());
                    if (waitCompare != 0) return waitCompare;
                    return a.getDistanceKm().compareTo(b.getDistanceKm());
                } else if (urgency == 1) {
                    // Nearest possible distance
                    int distCompare = a.getDistanceKm().compareTo(b.getDistanceKm());
                    if (distCompare != 0) return distCompare;
                    return a.getWaitDays().compareTo(b.getWaitDays());
                } else {
                    // Both (Urgency = 5) - Use AI Score
                    return b.getAiScore().compareTo(a.getAiScore()); // Descending AI Score
                }
            });
        }

        resultList.sort((h1, h2) -> {
            if (h1.getAppointments().isEmpty()) return 1;
            if (h2.getAppointments().isEmpty()) return -1;
            var a = h1.getAppointments().get(0);
            var b = h2.getAppointments().get(0);
            
            if (lowestQueueTime || urgency == 10) {
                int waitCompare = a.getWaitDays().compareTo(b.getWaitDays());
                if (waitCompare != 0) return waitCompare;
                return a.getDistanceKm().compareTo(b.getDistanceKm());
            } else if (urgency == 1) {
                int distCompare = a.getDistanceKm().compareTo(b.getDistanceKm());
                if (distCompare != 0) return distCompare;
                return a.getWaitDays().compareTo(b.getWaitDays());
            } else {
                return b.getAiScore().compareTo(a.getAiScore());
            }
        });

        return resultList;
    }

    private String getInitials(String name) {
        if (name == null || name.isEmpty()) return "";
        String[] parts = name.replace("Dr.", "").trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return parts[0].substring(0, 1).toUpperCase();
    }

    private String calculateTime(int token, int startHour, int avgMins) {
        int totalMinutes = (token - 1) * avgMins;
        int hoursToAdd = totalMinutes / 60;
        int minutesToAdd = totalMinutes % 60;

        int finalHour = startHour + hoursToAdd;
        String amPm = finalHour >= 12 ? "PM" : "AM";
        int displayHour = finalHour > 12 ? finalHour - 12 : finalHour;
        if (displayHour == 0) displayHour = 12;

        return String.format("%02d:%02d %s", displayHour, minutesToAdd, amPm);
    }
}
