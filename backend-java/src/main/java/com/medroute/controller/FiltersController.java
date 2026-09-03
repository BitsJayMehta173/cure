package com.medroute.controller;

import com.medroute.repository.HospitalDepartmentRepository;
import com.medroute.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Returns dynamic filter options (states, conditions) populated
 * directly from the PostgreSQL database.
 * Frontend hits this once on page load to populate dropdowns.
 */
@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class FiltersController {

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private HospitalDepartmentRepository departmentRepository;

    @GetMapping("/filters")
    public Map<String, List<String>> getFilters() {
        Map<String, List<String>> filters = new HashMap<>();
        filters.put("states", hospitalRepository.findDistinctStates());
        filters.put("conditions", departmentRepository.findDistinctDepartments());
        return filters;
    }
}
