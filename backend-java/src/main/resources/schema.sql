-- Doctor Directory feature: add photo_url and bio to doctor table.
-- Also enable pg_trgm for typo-tolerant doctor name search.
-- Run this in pgAdmin or via psql after the schema is live.

-- 1. Enable pg_trgm extension (PostgreSQL built-in, no extra install needed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add Doctor Directory columns to the doctor table
ALTER TABLE doctor ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE doctor ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. Create a GIN trigram index on doctor_name for fast fuzzy search.
--    This makes "similarity(doctor_name, 'jain')" queries sub-millisecond
--    even with thousands of doctors.
CREATE INDEX IF NOT EXISTS doctor_name_trgm_idx ON doctor USING gin (doctor_name gin_trgm_ops);

-- 4. (Optional) Backfill sample bio data for existing doctors.
--    Replace these with real bios as needed.
-- UPDATE doctor SET bio = 'Experienced specialist in internal medicine with expertise in chronic disease management.' WHERE bio IS NULL;
