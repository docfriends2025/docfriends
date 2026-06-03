-- 0002_doctor_applications.sql — additive: a doctor application IS a pending doctors row.
-- ALTER ... ADD COLUMN only. Apply via the --env-file libSQL runner, then read back.

ALTER TABLE doctors ADD COLUMN license_number    TEXT;
ALTER TABLE doctors ADD COLUMN license_authority TEXT;   -- council/board/state/country
ALTER TABLE doctors ADD COLUMN registry_id       TEXT;   -- optional, e.g. NPI
ALTER TABLE doctors ADD COLUMN credential_note   TEXT;   -- optional free text
ALTER TABLE doctors ADD COLUMN application_status TEXT NOT NULL DEFAULT 'pending'; -- pending|approved|rejected
ALTER TABLE doctors ADD COLUMN applied_at        INTEGER;
ALTER TABLE doctors ADD COLUMN reviewed_by       TEXT;   -- admin user id
ALTER TABLE doctors ADD COLUMN reviewed_at       INTEGER;
ALTER TABLE doctors ADD COLUMN review_notes      TEXT;

-- Existing verified doctors are already approved.
UPDATE doctors SET application_status = 'approved' WHERE verified = 1;
