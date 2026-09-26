-- V12: Referred doctors add reports/prescriptions to a second-opinion case.
-- For a CASE referral they attach to the shared visit (appointment_id + referral_id).
-- For a FULL_HISTORY referral there is no single visit, so the record belongs to the
-- referral alone — appointment_id becomes optional, but a record must belong to one of the two.
ALTER TABLE medical_report ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE medical_report DROP CONSTRAINT IF EXISTS chk_medical_report_owner;
ALTER TABLE medical_report ADD CONSTRAINT chk_medical_report_owner
    CHECK (appointment_id IS NOT NULL OR referral_id IS NOT NULL);

ALTER TABLE prescription ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE prescription DROP CONSTRAINT IF EXISTS chk_prescription_owner;
ALTER TABLE prescription ADD CONSTRAINT chk_prescription_owner
    CHECK (appointment_id IS NOT NULL OR referral_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_medical_report_appointment ON medical_report (appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_report_referral ON medical_report (referral_id);
CREATE INDEX IF NOT EXISTS idx_prescription_appointment ON prescription (appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescription_referral ON prescription (referral_id);
