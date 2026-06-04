-- 0004_doctor_invites.sql — additive: admin-initiated doctor invites.
-- ALTER ... ADD COLUMN only. Apply via the --env-file libSQL runner, then read back.
--
-- An invite is a doctors row in a new 'invited' state. No DDL is needed for the new
-- value: application_status is TEXT (pending|approved|rejected → + invited). Likewise
-- auth_tokens.purpose is TEXT and gains a new value 'doctor_invite' with NO schema change.

ALTER TABLE doctors ADD COLUMN invited_by TEXT;     -- admin user id who sent the invite
ALTER TABLE doctors ADD COLUMN invited_at INTEGER;  -- when the invite was sent
