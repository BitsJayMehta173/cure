package com.medroute.repository;

import com.medroute.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    /**
     * All prescribed medicines for one appointment, in the order they were
     * entered — used by the Medicine tab in the Patient Records detail view.
     */
    List<Prescription> findByAppointmentIdOrderByIdAsc(Long appointmentId);

    /**
     * Idempotency check for the seeder backfill.
     */
    boolean existsByAppointmentId(Long appointmentId);
}
