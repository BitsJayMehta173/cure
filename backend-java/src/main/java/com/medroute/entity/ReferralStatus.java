package com.medroute.entity;

/**
 * Referral lifecycle — transitions are enforced only by ReferralService.
 *   CONSULT : REQUESTED → RESPONDED            (closed when the referring doctor finalizes the visit)
 *   TRANSFER: REQUESTED → ACCEPTED → FOLLOW_UP_BOOKED
 *   either  : REQUESTED → DECLINED (by referred doctor) | CANCELLED (by referring doctor)
 */
public enum ReferralStatus {
    REQUESTED, RESPONDED, ACCEPTED, FOLLOW_UP_BOOKED, DECLINED, CANCELLED;

    /** Active = still grants record access and blocks a duplicate referral. */
    public boolean isActive() { return this == REQUESTED || this == ACCEPTED; }

    /** Grants the referred doctor read access to the shared records. */
    public boolean grantsAccess() { return this != DECLINED && this != CANCELLED; }
}
