package com.medroute.repository;

import com.medroute.entity.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, Long> {
    List<Referral> findByReferredToDoctorId(Long doctorId);
    List<Referral> findByPatientId(Long patientId);

    // Duplicate checks
    Optional<Referral> findByPatientIdAndReferredToDoctorIdAndAppointmentId(
            Long patientId, Long referredToDoctorId, Long appointmentId);
    Optional<Referral> findByPatientIdAndReferredToDoctorIdAndReferralType(
            Long patientId, Long referredToDoctorId, String referralType);
}
