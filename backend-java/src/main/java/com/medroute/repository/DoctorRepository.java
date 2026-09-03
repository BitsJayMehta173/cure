package com.medroute.repository;

import com.medroute.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    /**
     * Fetch all doctors in a given state and department, performing a JPA join
     * across Doctor -> HospitalDepartment -> Hospital.
     * This is the core "dynamic search" query.
     */
    @Query("SELECT d FROM Doctor d JOIN d.department hd JOIN hd.hospital h " +
           "WHERE LOWER(h.state) = LOWER(:state) " +
           "AND LOWER(hd.departmentName) = LOWER(:department)")
    List<Doctor> findByStateAndDepartment(@Param("state") String state,
                                          @Param("department") String department);

    /**
     * Same as above, but without state filter (for "Expand Radius" mode).
     */
    @Query("SELECT d FROM Doctor d JOIN d.department hd " +
           "WHERE LOWER(hd.departmentName) = LOWER(:department)")
    List<Doctor> findByDepartment(@Param("department") String department);

    /**
     * Pessimistic lock for booking — prevents double-booking under concurrency.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Doctor d WHERE d.id = :id")
    Optional<Doctor> findByIdWithLock(@Param("id") Long id);
}
