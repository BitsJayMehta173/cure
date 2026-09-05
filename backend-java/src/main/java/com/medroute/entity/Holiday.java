package com.medroute.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Calendar holiday — blocks slot availability on a given date.
 * If `state` is null, the holiday applies to all states (national holiday).
 * If `state` is set, it only applies to that specific state.
 *
 * This is used by BOTH the booking wizard (calendar cell shows "holiday")
 * AND the recommendation system (skips holiday dates when finding next slot).
 */
@Entity
@Table(name = "holiday")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String name;  // e.g. "Diwali", "Republic Day", "Maharashtra Day"

    /** Null = national holiday. Non-null = state-specific. */
    private String state;

    public Holiday() {}

    public Holiday(LocalDate date, String name, String state) {
        this.date = date;
        this.name = name;
        this.state = state;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}
