-- V11: The referral redesign (V10) is fully rolled out — the frontend now uses
-- kind / scope / status via /api/referrals. Drop the pre-redesign columns that
-- were kept in sync during the transition.
ALTER TABLE referral
    DROP COLUMN IF EXISTS referral_type,
    DROP COLUMN IF EXISTS referral_mode,
    DROP COLUMN IF EXISTS referral_status;
