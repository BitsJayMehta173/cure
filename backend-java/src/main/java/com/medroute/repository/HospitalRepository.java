package com.medroute.repository;

import com.medroute.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    @Query("SELECT DISTINCT h.state FROM Hospital h ORDER BY h.state")
    List<String> findDistinctStates();
}

