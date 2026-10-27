-- The job-alerts form now stores details in this application instead of using
-- a Google Form. Replace the old email-era default popup title with copy that
-- matches what the form actually does. Custom titles are left untouched.

UPDATE site_settings
SET value = 'Share your details for pharma job updates',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'registration_popup_title'
  AND value = 'Get the latest pharma jobs in your inbox';
