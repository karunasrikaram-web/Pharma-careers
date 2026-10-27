-- Articles, categories and editable site settings.

CREATE TABLE IF NOT EXISTS categories (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article'
                 CHECK (content_type IN ('article', 'job')),
  created_at   TEXT NOT NULL,
  UNIQUE (slug, content_type)
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(content_type, name);

CREATE TABLE IF NOT EXISTS articles (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  excerpt           TEXT,
  content           TEXT NOT NULL,
  cover_image_url   TEXT,
  category_id       TEXT REFERENCES categories(id) ON DELETE SET NULL,
  author_name       TEXT,
  tags              TEXT,
  seo_title         TEXT,
  seo_description   TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
  is_featured       INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_demo           INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  scheduled_at      TEXT,
  published_at      TEXT,
  created_by        TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_public
  ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category
  ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_updated
  ON articles(updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_articles_updated_at
AFTER UPDATE ON articles
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE articles SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO categories (id, name, slug, content_type, created_at) VALUES
  ('cat-pharma-career-news', 'Pharma Career News', 'pharma-career-news', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-job-preparation', 'Job Preparation', 'job-preparation', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-interview-tips', 'Interview Tips', 'interview-tips', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-industry-updates', 'Pharmaceutical Industry Updates', 'pharmaceutical-industry-updates', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-clinical-research', 'Clinical Research', 'clinical-research', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-qc-qa', 'Quality Control and Quality Assurance', 'quality-control-and-quality-assurance', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-regulatory-affairs', 'Regulatory Affairs', 'regulatory-affairs', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('cat-skills-certifications', 'Skills and Certifications', 'skills-and-certifications', 'article', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
  ('google_form_url', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('registration_popup_enabled', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('registration_popup_delay_seconds', '9', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('registration_popup_title', 'Get the latest pharma jobs in your inbox', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('registration_privacy_note', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('homepage_show_jobs', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('homepage_show_articles', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('contact_email', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
