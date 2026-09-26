package com.medroute.repository;

import com.medroute.entity.FollowUpRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FollowUpRequestRepository extends JpaRepository<FollowUpRequest, Long> {
    List<FollowUpRequest> findByPatientIdInOrderByCreatedAtDesc(List<Long> patientIds);
    List<FollowUpRequest> findBySourceAppointmentId(Long sourceAppointmentId);
    List<FollowUpRequest> findByBookedAppointmentId(Long bookedAppointmentId);
}
