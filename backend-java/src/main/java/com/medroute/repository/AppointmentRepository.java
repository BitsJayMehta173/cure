package com.medroute.repository;

import com.medroute.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    
    long countByDoctorIdAndDateStr(Long doctorId, String dateStr);
}
