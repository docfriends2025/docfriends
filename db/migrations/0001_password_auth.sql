-- 0001_password_auth.sql — additive: email+password auth alongside the magic-link system.
-- Apply with: turso db shell <db> < db/migrations/0001_password_auth.sql
-- (or the project's --env-file libSQL runner). ALTER ... ADD COLUMN only — nothing destructive.

-- Password hash for email+password login. NULL = link-only account (no password set yet).
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- What an auth token is for. Existing rows default to 'login' (magic-link sign-in).
-- Purposes: login | verify | reset.
ALTER TABLE auth_tokens ADD COLUMN purpose TEXT NOT NULL DEFAULT 'login';
