package com.medroute.repository;

import com.medroute.entity.HospitalDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HospitalDepartmentRepository extends JpaRepository<HospitalDepartment, Long> {

    @Query("SELECT DISTINCT hd.departmentName FROM HospitalDepartment hd ORDER BY hd.departmentName")
    List<String> findDistinctDepartments();
}
