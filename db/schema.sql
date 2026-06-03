-- DocFriends — schema.sql
-- SQLite/libSQL (Turso). Idempotent: safe to re-run. Run with `npm run db:push`.
-- Times are epoch milliseconds (INTEGER). Money is US cents (INTEGER).

-- ─── Reference: packages (Single / Council / Board) ──────────────────
CREATE TABLE IF NOT EXISTS packages (
  slug          TEXT PRIMARY KEY,          -- 'single' | 'council' | 'board'
  name          TEXT NOT NULL,
  opinion_count INTEGER NOT NULL,          -- doctors on the panel
  price_cents   INTEGER NOT NULL,          -- one-time, USD cents
  blurb         TEXT,
  featured      INTEGER NOT NULL DEFAULT 0,
  position      INTEGER NOT NULL DEFAULT 0
);

-- ─── Reference: specialties ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS specialties (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

-- ─── Users (clients, doctors, admins all live here) ──────────────────
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,       -- ULID
  email             TEXT NOT NULL UNIQUE,
  name              TEXT,
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'client',   -- 'client' | 'doctor' | 'admin'
  email_verified_at INTEGER,
  password_hash     TEXT,                    -- pbkdf2$...; NULL = link-only (no password set)
  created_at        INTEGER NOT NULL,
  last_seen_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── Doctor profiles (1:1 with a 'doctor' user) ──────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id              TEXT PRIMARY KEY,         -- ULID
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  initials        TEXT,
  specialty_slug  TEXT REFERENCES specialties(slug),
  subspecialty    TEXT,
  hospital        TEXT,                     -- e.g. 'NYU Langone'
  location        TEXT,
  years_practice  INTEGER,
  rating          REAL DEFAULT 0,           -- avg, 0–5
  review_count    INTEGER DEFAULT 0,
  verified        INTEGER NOT NULL DEFAULT 0,
  active          INTEGER NOT NULL DEFAULT 1,
  bio             TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty_slug);
CREATE INDEX IF NOT EXISTS idx_doctors_active    ON doctors(active);

-- ─── Cases ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  id              TEXT PRIMARY KEY,         -- ULID
  ref             TEXT UNIQUE,              -- short human ref e.g. '4821'
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT,                     -- short title e.g. 'Persistent chest pain'
  status          TEXT NOT NULL DEFAULT 'draft',
                  -- draft | submitted | assigning | matched | in_progress | delivered | closed
  package_slug    TEXT REFERENCES packages(slug),
  specialty_slug  TEXT REFERENCES specialties(slug),

  -- intake fields (from the homepage / flow)
  symptoms        TEXT,                     -- "what is going on", client's own words
  diagnosis       TEXT,                     -- existing diagnosis, if any
  medications     TEXT,                     -- free text / comma list
  questions_json  TEXT,                     -- JSON array (max 3)
  demographics_json TEXT,                   -- {name, age, sex}
  family_history  TEXT,
  lifestyle       TEXT,
  doctor_pref     TEXT,                     -- free-text preference ("research background")

  -- commerce
  price_cents     INTEGER,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid',   -- unpaid | paid | refunded

  -- delivery
  consensus       TEXT,                     -- short summary once delivered
  delivered_at    INTEGER,

  source          TEXT DEFAULT 'web',
  client_ip       TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_user   ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_ref    ON cases(ref);

-- ─── Case attachments (reports & scans) ──────────────────────────────
CREATE TABLE IF NOT EXISTS case_attachments (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  size_bytes  INTEGER,
  r2_key      TEXT,                          -- set when real object storage lands
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attach_case ON case_attachments(case_id);

-- ─── Case ⇄ doctor assignments (the panel) ───────────────────────────
CREATE TABLE IF NOT EXISTS case_doctors (
  id            TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doctor_id     TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'offered',
                -- offered | accepted | declined | drafting | submitted
  fit_score     INTEGER,                     -- algo match score 0–100
  commission_cents INTEGER,                  -- paid to doctor on submit
  offered_at    INTEGER,
  responded_at  INTEGER,
  submitted_at  INTEGER,
  UNIQUE(case_id, doctor_id)
);
CREATE INDEX IF NOT EXISTS idx_cd_case   ON case_doctors(case_id);
CREATE INDEX IF NOT EXISTS idx_cd_doctor ON case_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_cd_status ON case_doctors(status);

-- ─── Opinions (one per doctor per case) ──────────────────────────────
CREATE TABLE IF NOT EXISTS opinions (
  id            TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doctor_id     TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  verdict       TEXT,                        -- one-line verdict
  diagnosis_review TEXT,
  next_steps    TEXT,
  answers_json  TEXT,                        -- JSON array, answers to client questions
  red_flags     TEXT,
  available_teleconsult INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft | submitted
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  submitted_at  INTEGER,
  UNIQUE(case_id, doctor_id)
);
CREATE INDEX IF NOT EXISTS idx_op_case ON opinions(case_id);

-- ─── Q&A messages between client and a doctor on a case ──────────────
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doctor_id   TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  sender      TEXT NOT NULL,                 -- 'doctor' | 'patient'
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg_case ON messages(case_id, created_at);

-- ─── Teleconsults ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teleconsults (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doctor_id   TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at INTEGER,
  status      TEXT NOT NULL DEFAULT 'requested',  -- requested | confirmed | done | cancelled
  created_at  INTEGER NOT NULL
);

-- ─── Payments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  amount_cents  INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | refunded | failed
  provider      TEXT NOT NULL DEFAULT 'stub',      -- 'stripe' | 'stub'
  provider_id   TEXT,
  payload_json  TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pay_case ON payments(case_id);

-- ─── Feedback (client rating of an experience) ───────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating      INTEGER,                        -- 1–5
  comment     TEXT,
  created_at  INTEGER NOT NULL
);

-- ─── Journal (CMS posts) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_posts (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,                           -- decisions | patient_guides | stories | inside
  excerpt     TEXT,
  body        TEXT,
  author_name TEXT,
  author_initials TEXT,
  read_minutes INTEGER,
  featured    INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  published_at INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_pub ON journal_posts(published, published_at);

-- ─── FAQs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,                  -- getting_started | doctors_matching | billing
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

-- ─── Contact messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  email       TEXT,
  topic       TEXT,
  body        TEXT,
  created_at  INTEGER NOT NULL
);

-- ─── Auth: sessions + magic-link tokens ──────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,             -- opaque token, stored as cookie
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    INTEGER NOT NULL,
  user_agent    TEXT,
  ip            TEXT,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash    TEXT PRIMARY KEY,             -- sha256 of the raw token
  email         TEXT NOT NULL,
  next_url      TEXT,
  expires_at    INTEGER NOT NULL,
  used_at       INTEGER,
  client_ip     TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL,
  purpose       TEXT NOT NULL DEFAULT 'login' -- login | verify | reset
);
CREATE INDEX IF NOT EXISTS idx_tokens_email ON auth_tokens(email);

-- ─── Audit log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  entity      TEXT,
  entity_id   TEXT,
  action      TEXT,
  actor       TEXT,
  payload     TEXT,
  created_at  INTEGER NOT NULL
);
