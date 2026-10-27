-- Job-seeker details collected by the public website and shown in the admin
-- "User Details" area. Resumes are stored as BLOBs in this database so they
-- move with the persistent database volume; they are never served publicly.

CREATE TABLE IF NOT EXISTS user_details (
  id                    TEXT PRIMARY KEY,
  kind                  TEXT NOT NULL DEFAULT 'job_alert'
                          CHECK (kind IN ('job_alert', 'job_application')),
  job_id                TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  job_title             TEXT,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  city                  TEXT,
  state                 TEXT,
  qualification         TEXT,
  experience            TEXT,
  preferred_departments TEXT,
  message               TEXT,
  resume_name           TEXT,
  resume_mime           TEXT,
  resume_size           INTEGER,
  resume_data           BLOB,
  status                TEXT NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'reviewed', 'shortlisted', 'archived')),
  admin_note            TEXT,
  ip_hash               TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_details_created
  ON user_details(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_details_kind
  ON user_details(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_details_status
  ON user_details(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_details_email
  ON user_details(email);
CREATE INDEX IF NOT EXISTS idx_user_details_job
  ON user_details(job_id);

CREATE TRIGGER IF NOT EXISTS trg_user_details_updated_at
AFTER UPDATE ON user_details
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE user_details
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
