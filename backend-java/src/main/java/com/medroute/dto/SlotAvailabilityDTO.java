package com.medroute.dto;

import java.util.List;

/**
 * Slot availability for a single day in the booking wizard's calendar.
 * status: "available" | "full" | "holiday" | "not_open"
 */
public class SlotAvailabilityDTO {
    private String date;       // YYYY-MM-DD
    private String status;
    private int totalSlots;
    private int bookedSlots;
    private int remainingSlots;
    private String holidayName;  // null if not a holiday

    public SlotAvailabilityDTO() {}

    public SlotAvailabilityDTO(String date, String status, int totalSlots, int bookedSlots,
                               int remainingSlots, String holidayName) {
        this.date = date;
        this.status = status;
        this.totalSlots = totalSlots;
        this.bookedSlots = bookedSlots;
        this.remainingSlots = remainingSlots;
        this.holidayName = holidayName;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getTotalSlots() { return totalSlots; }
    public void setTotalSlots(int totalSlots) { this.totalSlots = totalSlots; }
    public int getBookedSlots() { return bookedSlots; }
    public void setBookedSlots(int bookedSlots) { this.bookedSlots = bookedSlots; }
    public int getRemainingSlots() { return remainingSlots; }
    public void setRemainingSlots(int remainingSlots) { this.remainingSlots = remainingSlots; }
    public String getHolidayName() { return holidayName; }
    public void setHolidayName(String holidayName) { this.holidayName = holidayName; }
}
