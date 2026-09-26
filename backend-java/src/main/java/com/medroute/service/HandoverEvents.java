package com.medroute.service;

/**
 * Handover (TRANSFER) lifecycle events, published synchronously inside ReferralService's
 * transaction. CaseRecordsService listens to snapshot and import the case file, which
 * keeps ReferralService free of a dependency on it.
 */
public final class HandoverEvents {
    private HandoverEvents() {}

    /** A TRANSFER referral was created → freeze a copy of the referring doctor's case file. */
    public record Created(Long referralId) {}

    /** The handover's follow-up visit was booked → import the frozen copy into it. */
    public record FollowUpBooked(Long referralId, Long appointmentId) {}
}
