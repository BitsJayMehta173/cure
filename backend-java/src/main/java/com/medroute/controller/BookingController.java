package com.medroute.controller;

import com.medroute.dto.BookingRequestDTO;
import com.medroute.entity.Appointment;
import com.medroute.entity.Doctor;
import com.medroute.repository.AppointmentRepository;
import com.medroute.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @PostMapping("/book")
    @Transactional
    public ResponseEntity<?> bookAppointment(@Valid @RequestBody BookingRequestDTO request) {
        // 1. Pessimistic lock on the doctor to prevent concurrent double bookings
        Doctor doctor = doctorRepository.findByIdWithLock(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        // 2. Check current booked appointments for the given date
        long currentBookings = appointmentRepository.countByDoctorIdAndDateStr(doctor.getId(), request.getDateStr());

        // 3. Enforce daily limit
        if (currentBookings >= doctor.getDailyLimit()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Daily limit reached for doctor on " + request.getDateStr());
        }

        // 4. Create appointment
        Appointment appointment = new Appointment();
        appointment.setDoctor(doctor);
        appointment.setDateStr(request.getDateStr());
        appointment.setPatientName(request.getPatientName());
        appointment.setSource(request.getSource());
        
        // Generate unique token code
        String tokenCode = "TKN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        appointment.setTokenCode(tokenCode);
        appointment.setTokenNum((int) currentBookings + 1);

        Appointment savedAppointment = appointmentRepository.save(appointment);

        com.medroute.dto.AppointmentDTO dto = new com.medroute.dto.AppointmentDTO();
        dto.setName(savedAppointment.getDoctor().getDoctorName());
        dto.setDate(savedAppointment.getDateStr());
        dto.setToken(savedAppointment.getTokenNum());
        dto.setStatus("Confirmed");
        dto.setTradeoffLabel("Token: " + savedAppointment.getTokenCode());

        return ResponseEntity.ok(dto);
    }
}
