package com.medroute.repository;

import com.medroute.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    /**
     * Find all patient profiles for a specific user, newest first.
     * Used by the booking wizard to enforce per-user isolation.
     */
    List<Patient> findByUserAccountIdOrderByIdDesc(Long userAccountId);

    /**
     * Find the default patient profile for a user (created at signup).
     * Returns Optional.empty() if the user has no default profile yet.
     */
    Optional<Patient> findByUserAccountIdAndRelation(Long userAccountId, String relation);

    Optional<Patient> findFirstByFullNameIgnoreCase(String fullName);
}
