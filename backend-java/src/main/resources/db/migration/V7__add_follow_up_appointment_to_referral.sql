-- V7: Add follow_up_appointment_id to referral table
-- Stores the appointment booked by the patient after a referral is analysed.
ALTER TABLE referral
    ADD COLUMN IF NOT EXISTS follow_up_appointment_id BIGINT REFERENCES appointment(id) ON DELETE SET NULL;
