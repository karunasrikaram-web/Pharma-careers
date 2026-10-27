import { dbAll, dbBatch } from "@/lib/db";

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

export async function getSettings(): Promise<SiteSettings> {
  const rows = await dbAll<{ key: string; value: string }>(
    "SELECT key, value FROM site_settings",
  );
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key as keyof SiteSettings] = row.value;
    }
  }
  return settings;
}

export async function getSetting(key: keyof SiteSettings): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? DEFAULTS[key];
}

export async function saveSettings(values: Partial<SiteSettings>): Promise<void> {
  const now = new Date().toISOString();
  const statements = [];

  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULTS) || typeof value !== "string") continue;
    statements.push({
      sql: `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, value, now],
    });
  }

  if (statements.length > 0) {
    await dbBatch(statements);
  }
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

export async function getRegistrationConfig(): Promise<RegistrationConfig> {
  const settings = await getSettings();

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
