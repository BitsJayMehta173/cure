package com.medroute.repository;

import com.medroute.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    /**
     * Find a holiday on a specific date. A holiday is a match if:
     *   - The date matches AND the state matches (state-specific holiday)
     *   - OR the date matches AND the state is null (national holiday)
     *
     * This single query is used by both the booking wizard (calendar) and
     * the recommendation system (slot finder) to ensure they agree.
     */
    @Query("SELECT h FROM Holiday h " +
           "WHERE h.date = :date " +
           "AND (h.state = :state OR h.state IS NULL)")
    List<Holiday> findHolidaysForDate(@Param("date") LocalDate date,
                                       @Param("state") String state);

    /**
     * Get all holidays in a date range (used by the monthly calendar view).
     * Same OR logic as above.
     */
    @Query("SELECT h FROM Holiday h " +
           "WHERE h.date BETWEEN :startDate AND :endDate " +
           "AND (h.state = :state OR h.state IS NULL) " +
           "ORDER BY h.date")
    List<Holiday> findHolidaysInRange(@Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate,
                                       @Param("state") String state);
}
