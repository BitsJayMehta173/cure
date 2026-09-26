-- V10: Referral pipeline redesign.
--   * referral gets explicit kind / scope / status (state machine owned by ReferralService)
--     plus the referred doctor's response. Legacy referral_type/referral_mode/referral_status
--     are kept (and kept in sync by the entity) until the frontend is migrated.
--   * Work done by the referred doctor is linked to the referral, not written onto
--     the referring doctor's appointment.
--   * Same-doctor follow-ups move out of the referral table into follow_up_request.
--   * Appointments record where they came from (parent visit / originating referral).

-- 1. Referral state machine columns
ALTER TABLE referral
    ADD COLUMN IF NOT EXISTS kind           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS scope          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS status         VARCHAR(30),
    ADD COLUMN IF NOT EXISTS response_notes TEXT,
    ADD COLUMN IF NOT EXISTS responded_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS accepted_at    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMP;

UPDATE referral SET
    kind   = COALESCE(kind, CASE WHEN referral_mode = 'FORWARD' OR referred_by_doctor_id = referred_to_doctor_id
                  THEN 'TRANSFER' ELSE 'CONSULT' END),
    scope  = COALESCE(scope, CASE WHEN appointment_id IS NOT NULL THEN 'CASE' ELSE 'FULL_HISTORY' END),
    status = COALESCE(status, CASE
                 WHEN referral_status = 'booked' THEN 'FOLLOW_UP_BOOKED'
                 WHEN referral_status = 'analysed' AND (referral_mode = 'FORWARD' OR referred_by_doctor_id = referred_to_doctor_id)
                      THEN 'ACCEPTED'
                 WHEN referral_status = 'analysed' THEN 'RESPONDED'
                 ELSE 'REQUESTED'
             END);

ALTER TABLE referral
    ALTER COLUMN kind   SET NOT NULL, ALTER COLUMN kind   SET DEFAULT 'CONSULT',
    ALTER COLUMN scope  SET NOT NULL, ALTER COLUMN scope  SET DEFAULT 'CASE',
    ALTER COLUMN status SET NOT NULL, ALTER COLUMN status SET DEFAULT 'REQUESTED';

-- Old uniqueness blocked re-referring after a decline/cancel. Uniqueness now only
-- applies to *active* referrals (enforced here and in ReferralService).
DROP INDEX IF EXISTS uq_referral_case;
DROP INDEX IF EXISTS uq_referral_patient;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_active_case
    ON referral (appointment_id, referred_to_doctor_id)
    WHERE appointment_id IS NOT NULL AND status IN ('REQUESTED', 'ACCEPTED');

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_active_full_history
    ON referral (patient_id, referred_to_doctor_id)
    WHERE scope = 'FULL_HISTORY' AND status IN ('REQUESTED', 'ACCEPTED');

CREATE INDEX IF NOT EXISTS idx_referral_to_doctor   ON referral (referred_to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referral_by_doctor   ON referral (referred_by_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referral_appointment ON referral (appointment_id);

-- 2. Records authored by the referred doctor belong to the referral
ALTER TABLE medical_report
    ADD COLUMN IF NOT EXISTS referral_id      BIGINT REFERENCES referral (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS author_doctor_id BIGINT;
ALTER TABLE prescription
    ADD COLUMN IF NOT EXISTS referral_id      BIGINT REFERENCES referral (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS author_doctor_id BIGINT;

-- 3. Appointment provenance
ALTER TABLE appointment
    ADD COLUMN IF NOT EXISTS parent_appointment_id BIGINT REFERENCES appointment (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS origin_referral_id    BIGINT REFERENCES referral (id) ON DELETE SET NULL;

UPDATE appointment a SET origin_referral_id = r.id, parent_appointment_id = r.appointment_id
FROM referral r WHERE r.follow_up_appointment_id = a.id AND a.origin_referral_id IS NULL;

-- 4. Same-doctor follow-ups
CREATE TABLE IF NOT EXISTS follow_up_request (
    id                    BIGSERIAL PRIMARY KEY,
    source_appointment_id BIGINT      NOT NULL REFERENCES appointment (id) ON DELETE CASCADE,
    patient_id            BIGINT      NOT NULL REFERENCES patient (id) ON DELETE CASCADE,
    doctor_id             BIGINT      NOT NULL REFERENCES doctor (id),
    status                VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    notes                 TEXT,
    booked_appointment_id BIGINT REFERENCES appointment (id) ON DELETE SET NULL,
    created_at            TIMESTAMP   NOT NULL,
    booked_at             TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_follow_up_patient ON follow_up_request (patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_doctor  ON follow_up_request (doctor_id);
