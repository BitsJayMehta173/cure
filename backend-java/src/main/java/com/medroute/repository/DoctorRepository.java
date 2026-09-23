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

    /**
     * Fetch all doctors with department AND hospital eagerly loaded — required for
     * the seeder when ddl-auto=create (session closes after schema creation,
     * lazy proxies fail).
     */
    @Query("SELECT d FROM Doctor d JOIN FETCH d.department dept JOIN FETCH dept.hospital")
    List<Doctor> findAllWithDepartment();

    /**
     * Fetch a single doctor with department AND hospital eagerly loaded.
     * Used by updateDoctorProfile to allow hospital/department edits.
     */
    @Query("SELECT d FROM Doctor d JOIN FETCH d.department dept JOIN FETCH dept.hospital WHERE d.id = :id")
    Optional<Doctor> findByIdWithDepartment(@Param("id") Long id);

    /**
     * Fetch doctors by hospital + department with full eager load (no lazy proxies).
     * Used by BookingFlowService to avoid N+1 in getMonthlySlots, previewToken, confirmBooking.
     */
    @Query("SELECT d FROM Doctor d " +
           "JOIN FETCH d.department dept " +
           "JOIN FETCH dept.hospital " +
           "WHERE dept.id = :deptId " +
           "AND dept.hospital.id = :hospitalId")
    List<Doctor> findByHospitalIdAndDepartmentId(@Param("hospitalId") Long hospitalId,
                                                 @Param("deptId") Long deptId);

    /**
     * Sum of all doctors' dailyLimit in a single query — used by StatsController.
     */
    @Query("SELECT COALESCE(SUM(d.dailyLimit), 0) FROM Doctor d")
    long sumDailyLimit();

    /**
     * Fuzzy doctor name search using PostgreSQL pg_trgm similarity().
     * Returns doctors ordered by similarity score (best match first).
     * Used by the Doctor Directory real-time search.
     *
     * Raw result columns: doctor_id, doctor_name, qualification, photo_url,
     *                     hospital_name, hospital_id, department_name, dept_id,
     *                     years_of_experience, total_patients_treated
     */
    @Query(value = """
            SELECT d.id, d.doctor_name, d.qualification, d.photo_url,
                   h.name AS hospital_name, h.id AS hospital_id,
                   hd.department_name, hd.id AS dept_id,
                   d.years_of_experience, d.total_patients_treated
            FROM doctor d
            JOIN hospital_department hd ON d.dept_id = hd.id
            JOIN hospital h ON hd.hospital_id = h.id
            WHERE similarity(d.doctor_name, :query) > 0.2
               OR d.doctor_name ILIKE '%' || :query || '%'
            ORDER BY similarity(d.doctor_name, :query) DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> searchDoctorsByName(@Param("query") String query,
                                     @Param("limit") int limit);
}
