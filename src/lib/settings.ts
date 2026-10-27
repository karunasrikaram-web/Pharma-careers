import { getDb } from "@/lib/db";

export interface SiteSettings {
  registration_popup_enabled: string;
  registration_popup_delay_seconds: string;
  registration_popup_title: string;
  registration_privacy_note: string;
  homepage_show_jobs: string;
  homepage_show_articles: string;
  contact_email: string;
}

const DEFAULTS: SiteSettings = {
  registration_popup_enabled: "1",
  registration_popup_delay_seconds: "9",
  registration_popup_title: "Share your details for pharma job updates",
  registration_privacy_note: "",
  homepage_show_jobs: "1",
  homepage_show_articles: "1",
  contact_email: "",
};

export function getSettings(): SiteSettings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM site_settings").all() as Array<{
    key: string;
    value: string;
  }>;
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key as keyof SiteSettings] = row.value;
    }
  }
  return settings;
}

export function getSetting(key: keyof SiteSettings): string {
  return getSettings()[key] ?? DEFAULTS[key];
}

export function saveSettings(values: Partial<SiteSettings>): void {
  const db = getDb();
  const now = new Date().toISOString();
  const statement = db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in DEFAULTS) || typeof value !== "string") continue;
      statement.run(key, value, now);
    }
  });
  transaction();
}

export function isEnabled(value: string): boolean {
  return value === "1" || value.toLowerCase() === "true";
}

export interface RegistrationConfig {
  enabled: boolean;
  delaySeconds: number;
  title: string;
  privacyNote: string;
}

export function getRegistrationConfig(): RegistrationConfig {
  const settings = getSettings();

  const parsedDelay = Number(settings.registration_popup_delay_seconds);
  const delaySeconds = Number.isFinite(parsedDelay)
    ? Math.min(30, Math.max(8, Math.round(parsedDelay)))
    : 9;

  return {
    enabled: isEnabled(settings.registration_popup_enabled),
    delaySeconds,
    title: settings.registration_popup_title.trim() || DEFAULTS.registration_popup_title,
    privacyNote: settings.registration_privacy_note.trim(),
  };
}
