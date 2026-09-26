package com.medroute.repository;

import com.medroute.entity.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, Long> {
    // Lookup referrals for an appointment (from the originating doctor's side)
    List<Referral> findByAppointmentId(Long appointmentId);

    // ─── ReferralService queries ─────────────────────────────────────────
    List<Referral> findByReferredToDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<Referral> findByReferredByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<Referral> findByPatientIdInOrderByCreatedAtDesc(List<Long> patientIds);
    List<Referral> findByAppointmentIdIn(List<Long> appointmentIds);
    List<Referral> findByPatientIdAndReferredToDoctorId(Long patientId, Long doctorId);
}
