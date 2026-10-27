"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { dbGet, dbRun, isReadOnlyFallback } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/config";
import { todayIST } from "@/lib/dates";
import { checkFormRateLimit } from "@/lib/rate-limit";
import { fieldErrors, contactSchema, reportSchema } from "@/lib/validation";
import type { ContactState, ReportState } from "@/lib/forms";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function contactAction(
  _previousState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    subject: text(formData, "subject"),
    message: text(formData, "message"),
  };

  const parsed = contactSchema.safeParse({
    ...values,
    website: text(formData, "website"),
  });

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) {
      return {
        ok: false,
        message: "Submission could not be completed.",
        errors: {},
        values,
      };
    }
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors,
      values,
    };
  }

  if (isReadOnlyFallback()) {
    return {
      ok: false,
      message:
        "This site is currently running in read-only demo mode, so messages cannot be saved. Please try again once storage is configured.",
      errors: {},
      values,
    };
  }

  let ipHash: string;
  try {
    const requestHeaders = await headers();
    ipHash = hashIp(getClientIp(requestHeaders));
  } catch (error) {
    console.error("Contact form unavailable: unable to hash client address.", error);
    return {
      ok: false,
      message: "The contact form is temporarily unavailable. Please try again later.",
      errors: {},
      values,
    };
  }

  if (!checkFormRateLimit(`contact:${ipHash}`, 5, 10 * 60 * 1000)) {
    return {
      ok: false,
      message: "Too many messages have been sent. Please try again later.",
      errors: {},
      values,
    };
  }

  try {
    await dbRun(
      `INSERT INTO contact_messages (id, name, email, subject, message, status, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`,
      [
        randomUUID(),
        parsed.data.name,
        parsed.data.email.toLowerCase(),
        parsed.data.subject,
        parsed.data.message,
        ipHash,
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    console.error("Failed to store contact message.", error);
    return {
      ok: false,
      message: "Your message could not be saved. Please try again.",
      errors: {},
      values,
    };
  }

  revalidatePath("/admin/messages");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      "Your message has been received and stored for review by the site owner.",
    errors: {},
    values: { name: "", email: "", subject: "", message: "" },
  };
}

export async function reportJobAction(
  _previousState: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = reportSchema.safeParse({
    job_id: text(formData, "job_id"),
    reason: text(formData, "reason"),
    details: text(formData, "details"),
    reporter_email: text(formData, "reporter_email"),
    website: text(formData, "website"),
  });

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) {
      return { ok: false, message: "Submission could not be completed.", errors: {} };
    }
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      errors,
    };
  }

  if (isReadOnlyFallback()) {
    return {
      ok: false,
      message:
        "This site is currently running in read-only demo mode, so job reports cannot be submitted.",
      errors: {},
    };
  }

  const job = await dbGet<{ id: string }>(
    `SELECT id FROM jobs
     WHERE id = ? AND status = 'published'
       AND (application_deadline IS NULL OR application_deadline >= ?)`,
    [parsed.data.job_id, todayIST()],
  );

  if (!job) {
    return {
      ok: false,
      message: "This listing is no longer available to report.",
      errors: {},
    };
  }

  let ipHash: string;
  try {
    const requestHeaders = await headers();
    ipHash = hashIp(getClientIp(requestHeaders));
  } catch (error) {
    console.error("Report form unavailable: unable to hash client address.", error);
    return {
      ok: false,
      message: "The report form is temporarily unavailable. Please try again later.",
      errors: {},
    };
  }

  if (!checkFormRateLimit(`report:${ipHash}`, 5, 10 * 60 * 1000)) {
    return {
      ok: false,
      message: "Too many reports have been submitted. Please try again later.",
      errors: {},
    };
  }

  try {
    await dbRun(
      `INSERT INTO job_reports (id, job_id, reason, details, reporter_email, status, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        randomUUID(),
        job.id,
        parsed.data.reason,
        parsed.data.details?.trim() || null,
        parsed.data.reporter_email?.toLowerCase() || null,
        ipHash,
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    console.error("Failed to store job report.", error);
    return {
      ok: false,
      message: "Your report could not be saved. Please try again.",
      errors: {},
    };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      "Thank you. Your report has been stored for review by the site owner.",
    errors: {},
  };
}
