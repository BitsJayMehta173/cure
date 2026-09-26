-- Add referral_mode to distinguish FEEDBACK vs FORWARD referrals
ALTER TABLE referral ADD COLUMN IF NOT EXISTS referral_mode VARCHAR(20) NOT NULL DEFAULT 'FEEDBACK';
