-- Add referral_type column to distinguish full-patient vs single-case referrals
ALTER TABLE referral ADD COLUMN IF NOT EXISTS referral_type VARCHAR(20) NOT NULL DEFAULT 'FULL_PATIENT';

-- Add unique constraint to prevent duplicate referrals
-- For SINGLE_CASE: unique on (patient_id, referred_to_doctor_id, appointment_id)
-- For FULL_PATIENT: unique on (patient_id, referred_to_doctor_id) where appointment_id IS NULL
-- We use a unique index to handle both cases
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_case
    ON referral (patient_id, referred_to_doctor_id, appointment_id)
    WHERE appointment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_patient
    ON referral (patient_id, referred_to_doctor_id)
    WHERE appointment_id IS NULL AND referral_type = 'FULL_PATIENT';
