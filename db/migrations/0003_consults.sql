-- 0003_consults.sql — additive: manual "book a consult" handling on teleconsults.
-- ALTER ... ADD COLUMN only. Apply via the --env-file libSQL runner, then read back.
-- Status stays requested|confirmed|done|cancelled. opinions.available_teleconsult is reused.

ALTER TABLE teleconsults ADD COLUMN contact_phone   TEXT;   -- patient-provided callback number (admin-only)
ALTER TABLE teleconsults ADD COLUMN preferred_times TEXT;   -- patient's preferred windows / note
ALTER TABLE teleconsults ADD COLUMN patient_note    TEXT;   -- optional message from the patient
ALTER TABLE teleconsults ADD COLUMN admin_note      TEXT;   -- internal scheduling note
ALTER TABLE teleconsults ADD COLUMN confirmed_at    INTEGER;
ALTER TABLE teleconsults ADD COLUMN updated_at      INTEGER;
