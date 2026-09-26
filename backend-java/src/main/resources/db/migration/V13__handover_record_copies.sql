-- V13: Handover = copy, not a live link.
--   * When a TRANSFER referral is created, the referring doctor's case file is copied
--     into a frozen "handover packet" (is_snapshot = true, referral_id = the referral).
--   * When the follow-up is booked, the packet is imported into the new visit as normal,
--     editable records (imported_from_referral_id), so the two doctors' files stay separate.
--   * Records can now be edited by their visit's doctor; edits are attributed.
ALTER TABLE medical_report
    ADD COLUMN is_snapshot               BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN source_record_id          BIGINT,
    ADD COLUMN source_appointment_id     BIGINT,
    ADD COLUMN imported_from_referral_id BIGINT REFERENCES referral (id) ON DELETE SET NULL,
    ADD COLUMN edited_by_doctor_id       BIGINT,
    ADD COLUMN edited_by_name            VARCHAR(255),
    ADD COLUMN edited_at                 TIMESTAMP;

ALTER TABLE prescription
    ADD COLUMN is_snapshot               BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN source_record_id          BIGINT,
    ADD COLUMN source_appointment_id     BIGINT,
    ADD COLUMN imported_from_referral_id BIGINT REFERENCES referral (id) ON DELETE SET NULL,
    ADD COLUMN edited_by_doctor_id       BIGINT,
    ADD COLUMN edited_by_name            VARCHAR(255),
    ADD COLUMN edited_at                 TIMESTAMP;
