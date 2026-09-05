package com.medroute.repository;

import com.medroute.entity.HospitalDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HospitalDepartmentRepository extends JpaRepository<HospitalDepartment, Long> {

    @Query("SELECT DISTINCT hd.departmentName FROM HospitalDepartment hd ORDER BY hd.departmentName")
    List<String> findDistinctDepartments();

    /**
     * Fetch all departments for a given hospital.
     * Used by the booking wizard's department step.
     */
    @Query("SELECT hd FROM HospitalDepartment hd " +
           "JOIN FETCH hd.hospital " +
           "WHERE hd.hospital.id = :hospitalId " +
           "ORDER BY hd.departmentName")
    List<HospitalDepartment> findByHospitalId(@org.springframework.data.repository.query.Param("hospitalId") Long hospitalId);

    /**
     * Fetch all departments (with their hospitals) for a given department name.
     * Used by the recommendation system to find doctors in a department.
     */
    @Query("SELECT hd FROM HospitalDepartment hd " +
           "JOIN FETCH hd.hospital " +
           "WHERE LOWER(hd.departmentName) = LOWER(:name)")
    List<HospitalDepartment> findByDepartmentName(@org.springframework.data.repository.query.Param("name") String name);
}
