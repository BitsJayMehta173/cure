package com.medroute.repository;

import com.medroute.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    // findAll() returns patients ordered by id desc
    // For booking wizard, the frontend wants newest first
    // Override with a custom method:
    List<Patient> findAllByOrderByIdDesc();
}
