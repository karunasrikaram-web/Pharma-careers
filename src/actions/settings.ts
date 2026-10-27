"use server";

import { revalidatePath } from "next/cache";
import { saveSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";

export interface SettingsState {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateSettingsAction(
  _previousState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  const title = text(formData, "registration_popup_title");
  const privacyNote = text(formData, "registration_privacy_note");
  const contactEmail = text(formData, "contact_email");
  const delay = Number(text(formData, "registration_popup_delay_seconds") || "9");
  const errors: Record<string, string> = {};

  if (title.length < 3 || title.length > 120) {
    errors.registration_popup_title = "Enter a popup title between 3 and 120 characters.";
  }
  if (privacyNote.length > 600) {
    errors.registration_privacy_note = "Keep the privacy note under 600 characters.";
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    errors.contact_email = "Enter a valid email address.";
  }
  if (!Number.isFinite(delay) || delay < 8 || delay > 30) {
    errors.registration_popup_delay_seconds = "Choose a delay between 8 and 30 seconds.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  try {
    await saveSettings({
      registration_popup_enabled: formData.get("registration_popup_enabled") ? "1" : "0",
      registration_popup_delay_seconds: String(Math.round(delay)),
      registration_popup_title: title,
      registration_privacy_note: privacyNote,
      homepage_show_jobs: formData.get("homepage_show_jobs") ? "1" : "0",
      homepage_show_articles: formData.get("homepage_show_articles") ? "1" : "0",
      contact_email: contactEmail,
    });
  } catch (error) {
    console.error("Failed to save site settings.", error);
    return {
      ok: false,
      message: "Settings could not be saved. Please try again.",
      errors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/jobs");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/job-alerts");
  return { ok: true, message: "Website settings saved.", errors: {} };
}
