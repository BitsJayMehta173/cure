-- Add bio fields to patient table
ALTER TABLE patient
ADD COLUMN location VARCHAR(255),
ADD COLUMN address TEXT,
ADD COLUMN health_profile TEXT;

-- Create referral table
CREATE TABLE referral (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    referred_by_doctor_id BIGINT NOT NULL,
    referred_to_doctor_id BIGINT NOT NULL,
    appointment_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_referral_patient FOREIGN KEY (patient_id) REFERENCES patient (id),
    CONSTRAINT fk_referral_by_doctor FOREIGN KEY (referred_by_doctor_id) REFERENCES doctor (id),
    CONSTRAINT fk_referral_to_doctor FOREIGN KEY (referred_to_doctor_id) REFERENCES doctor (id),
    CONSTRAINT fk_referral_appointment FOREIGN KEY (appointment_id) REFERENCES appointment (id)
);
