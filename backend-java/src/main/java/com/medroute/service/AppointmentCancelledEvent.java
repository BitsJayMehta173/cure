package com.medroute.service;

/**
 * Published (synchronously, inside the cancelling transaction) whenever an appointment
 * is cancelled — by the patient or by staff. Lets the referral/follow-up pipeline react
 * without BookingFlowService depending on it.
 */
public record AppointmentCancelledEvent(Long appointmentId) {}
