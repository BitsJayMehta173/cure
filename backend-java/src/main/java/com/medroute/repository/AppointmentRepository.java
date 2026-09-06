package com.medroute.repository;

import com.medroute.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // ─── Original Method (used by recommendation system) ──────────────────────
    // Counts ALL appointments (including cancelled) for a doctor on a date.
    // Kept for backward compatibility with the simulator and older callers.
    long countByDoctorIdAndDateStr(Long doctorId, String dateStr);

    // ─── New Methods (used by booking wizard) ────────────────────────────────

    /**
     * Count bookings for a doctor on a date, EXCLUDING cancelled ones.
     * This is the correct method for slot availability — cancelled bookings
     * have freed up the slot.
     */
    long countByDoctorIdAndDateStrAndStatusNot(Long doctorId, String dateStr, String status);

    /**
     * Fetch all appointments for a patient profile, newest first.
     * Used by the booking wizard's "Your Appointments" view.
     */
    @Query("SELECT a FROM Appointment a " +
           "WHERE a.patientFk = :patientId " +
           "ORDER BY a.id DESC")
    List<Appointment> findByPatientFkOrderByDateStrDesc(@Param("patientId") Long patientId);

    List<Appointment> findAllByOrderByIdDesc();

    /**
     * Fetch all bookings for a doctor on a date (for token preview/display).
     */
    List<Appointment> findByDoctorIdAndDateStrOrderByTokenNumAsc(Long doctorId, String dateStr);

    /**
     * Batch-count non-cancelled bookings per doctor for a single date.
     * Returns [doctorId, count] pairs. Used by getMonthlySlots/previewToken/confirmBooking
     * to avoid N+1 queries.
     */
    @Query("SELECT a.doctor.id, COUNT(a) FROM Appointment a " +
           "WHERE a.dateStr = :dateStr " +
           "AND a.status <> 'cancelled' " +
           "AND a.doctor.id IN :doctorIds " +
           "GROUP BY a.doctor.id")
    List<Object[]> countActiveByDoctorIdsAndDate(@Param("doctorIds") List<Long> doctorIds,
                                                  @Param("dateStr") String dateStr);

    /**
     * Batch-count non-cancelled bookings per doctor for ALL days in a month range.
     * Returns [doctorId, dateStr, count] triples. Used by getMonthlySlots
     * to compute slot availability for the entire month in 1 query.
     */
    @Query("SELECT a.doctor.id, a.dateStr, COUNT(a) FROM Appointment a " +
           "WHERE a.dateStr >= :startDate " +
           "AND a.dateStr <= :endDate " +
           "AND a.status <> 'cancelled' " +
           "AND a.doctor.id IN :doctorIds " +
           "GROUP BY a.doctor.id, a.dateStr")
    List<Object[]> countActiveByDoctorIdsInRange(@Param("doctorIds") List<Long> doctorIds,
                                                 @Param("startDate") String startDate,
                                                 @Param("endDate") String endDate);

    /**
     * Count active (non-cancelled) bookings for a specific date — used by StatsController
     * to compute "Available Slots Today" without loading all rows into memory.
     */
    long countByDateStrAndStatusNot(String dateStr, String status);

    /**
     * Count active (non-cancelled) bookings system-wide — used by StatsController
     * for the "Total Bookings Made" metric.
     */
    long countByStatusNot(String status);

    /**
     * Fetch the set of token numbers already taken by a doctor on a date.
     * Only confirmed bookings are considered (cancelled tokens become free).
     * Returns the token numbers in ascending order. Used by confirmBooking
     * and the preview endpoints to assign the next available gap instead of
     * naive `count + 1`, so cancelling token #1 doesn't cause two patients
     * to be assigned the same token number.
     */
    @Query("SELECT a.tokenNum FROM Appointment a " +
           "WHERE a.doctor.id = :doctorId " +
           "AND a.dateStr = :dateStr " +
           "AND a.status <> 'cancelled' " +
           "AND a.tokenNum IS NOT NULL " +
           "ORDER BY a.tokenNum ASC")
    List<Integer> findTakenTokensByDoctorAndDate(@Param("doctorId") Long doctorId,
                                                 @Param("dateStr") String dateStr);
}
