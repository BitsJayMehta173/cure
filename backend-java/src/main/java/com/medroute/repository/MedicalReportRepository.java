package com.medroute.repository;

import com.medroute.entity.MedicalReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalReportRepository extends JpaRepository<MedicalReport, Long> {

    /**
     * All reports for one appointment, most recent first — used by the
     * Reports tab / slider in the Patient Records appointment detail view.
     */
    List<MedicalReport> findByAppointmentIdOrderByReportDateDesc(Long appointmentId);

    /**
     * Idempotency check for the seeder backfill — skip appointments that
     * already have at least one report attached.
     */
    boolean existsByAppointmentId(Long appointmentId);
}
