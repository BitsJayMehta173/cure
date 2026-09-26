-- V14: Medical records are immutable once written — no edits by anyone, including on
-- handover copies. Drop the edit-tracking columns added in V13.
ALTER TABLE medical_report
    DROP COLUMN IF EXISTS edited_by_doctor_id,
    DROP COLUMN IF EXISTS edited_by_name,
    DROP COLUMN IF EXISTS edited_at;

ALTER TABLE prescription
    DROP COLUMN IF EXISTS edited_by_doctor_id,
    DROP COLUMN IF EXISTS edited_by_name,
    DROP COLUMN IF EXISTS edited_at;
