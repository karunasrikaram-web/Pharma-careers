-- Pharma Careers — initial schema
-- All timestamps are stored as ISO-8601 UTC strings (e.g. 2026-10-27T09:30:00.000Z).
-- Application deadlines are date-only strings in the YYYY-MM-DD format.

CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY, -- SHA-256 hash of the opaque session token
  admin_id     TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  ip_hash      TEXT,
  user_agent   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  success    INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS jobs (
  id                      TEXT PRIMARY KEY,
  slug                    TEXT NOT NULL UNIQUE,
  title                   TEXT NOT NULL,
  company_name            TEXT NOT NULL,
  department              TEXT NOT NULL,
  city                    TEXT NOT NULL,
  state                   TEXT NOT NULL,
  experience_min          INTEGER CHECK (experience_min IS NULL OR experience_min >= 0),
  experience_max          INTEGER CHECK (experience_max IS NULL OR experience_max >= 0),
  employment_type         TEXT,
  salary_range            TEXT,
  description             TEXT NOT NULL,
  responsibilities        TEXT,
  qualifications          TEXT,
  skills                  TEXT,
  application_instructions TEXT,
  application_url         TEXT,
  published_at            TEXT,
  application_deadline    TEXT CHECK (
                            application_deadline IS NULL OR
                            application_deadline GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                          ),
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived')),
  is_featured             INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_demo                 INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  source_name             TEXT,
  source_url              TEXT,
  external_id             TEXT,
  created_by              TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  CHECK (
    experience_min IS NULL OR experience_max IS NULL OR experience_min <= experience_max
  )
);

CREATE INDEX IF NOT EXISTS idx_jobs_public ON jobs(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_updated ON jobs(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external
  ON jobs(source_name, external_id)
  WHERE source_name IS NOT NULL AND external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  ip_hash    TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

CREATE TABLE IF NOT EXISTS job_reports (
  id             TEXT PRIMARY KEY,
  job_id         TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  details        TEXT,
  reporter_email TEXT,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  ip_hash        TEXT,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_reports_job ON job_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reports_status ON job_reports(status, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_jobs_updated_at
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE jobs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_admins_updated_at
AFTER UPDATE ON admins
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE admins SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;
