"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbGet, dbRun } from "@/lib/db";
import { getClientIp, hashIp } from "@/lib/config";
import { todayIST } from "@/lib/dates";
import { checkFormRateLimit } from "@/lib/rate-limit";
import { fieldErrors, userDetailsSchema } from "@/lib/validation";
import { isUserDetailStatus } from "@/lib/user-details";
import { RESUME_EXTENSIONS, RESUME_MAX_BYTES } from "@/lib/constants";
import { requireAdmin } from "@/lib/session";
import type { UserDetailsFormState, UserDetailsFormValues } from "@/lib/forms";

const RESUME_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function valuesFromFormData(formData: FormData): UserDetailsFormValues {
  return {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    qualification: text(formData, "qualification"),
    experience: text(formData, "experience"),
    preferred_departments: text(formData, "preferred_departments"),
    message: text(formData, "message"),
    consent: text(formData, "consent") === "on",
  };
}

function fail(
  message: string,
  errors: Record<string, string>,
  values: UserDetailsFormValues,
): UserDetailsFormState {
  return { ok: false, message, errors, values };
}

function resumeExtension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

function magicBytesMatch(buffer: Buffer, extension: string): boolean {
  if (extension === "pdf") {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  }
  if (extension === "docx") {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }
  if (extension === "doc") {
    const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    return (
      buffer.length >= signature.length &&
      signature.every((byte, index) => buffer[index] === byte)
    );
  }
  return false;
}

function safeFileName(name: string, extension: string): string {
  const base = name
    .replace(/[\\/]+/g, "_")
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  if (!base || base === "." || base === "..") return `resume.${extension}`;
  return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

interface ResumePayload {
  name: string;
  mime: string;
  extension: string;
  size: number;
  data: Buffer;
}

async function readResume(
  formData: FormData,
): Promise<{ resume: ResumePayload | null; error: string | null }> {
  const value = formData.get("resume");
  if (!value || typeof value !== "object" || !("arrayBuffer" in value) || !("size" in value)) {
    return { resume: null, error: null };
  }

  const file = value as File;
  if (!file.size) return { resume: null, error: null };

  if (file.size > RESUME_MAX_BYTES) {
    return {
      resume: null,
      error: "Your resume must be 5 MB or smaller.",
    };
  }

  const extension = resumeExtension(file.name);
  if (!(RESUME_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      resume: null,
      error: "Attach your resume as a PDF, DOC or DOCX file.",
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return { resume: null, error: "The attached resume is empty. Please choose another file." };
    }
    if (buffer.length > RESUME_MAX_BYTES) {
      return { resume: null, error: "Your resume must be 5 MB or smaller." };
    }
    if (!magicBytesMatch(buffer, extension)) {
      return {
        resume: null,
        error:
          "The attached file does not look like a valid PDF, DOC or DOCX document. Please re-save it and try again.",
      };
    }

    return {
      resume: {
        name: safeFileName(file.name, extension),
        mime: RESUME_MIME[extension],
        extension,
        size: buffer.length,
        data: buffer,
      },
      error: null,
    };
  } catch (error) {
    console.error("Failed to read the submitted resume.", error);
    return {
      resume: null,
      error: "The attached resume could not be read. Please try again.",
    };
  }
}

export async function saveUserDetailsAction(
  _previousState: UserDetailsFormState,
  formData: FormData,
): Promise<UserDetailsFormState> {
  const values = valuesFromFormData(formData);
  const kindInput = text(formData, "kind");
  const kind = kindInput === "job_application" ? "job_application" : "job_alert";

  const parsed = userDetailsSchema.safeParse({
    kind,
    job_id: text(formData, "job_id"),
    name: values.name,
    email: values.email,
    phone: values.phone,
    city: values.city,
    state: values.state,
    qualification: values.qualification,
    experience: values.experience,
    preferred_departments: values.preferred_departments,
    message: values.message,
    consent: text(formData, "consent"),
    website: text(formData, "website"),
  });

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) {
      return fail("Submission could not be completed.", {}, values);
    }
    return fail("Please correct the highlighted fields.", errors, values);
  }

  const data = parsed.data;

  let job: { id: string; title: string } | null = null;
  if (data.kind === "job_application") {
    if (!data.job_id) {
      return fail("The job opening could not be identified. Please reload the page.", {}, values);
    }
    job = await dbGet<{ id: string; title: string }>(
      `SELECT id, title FROM jobs
       WHERE id = ? AND status = 'published'
         AND (application_deadline IS NULL OR application_deadline >= ?)`,
      [data.job_id, todayIST()],
    );

    if (!job) {
      return fail(
        "This job opening is no longer accepting applications. Please browse the current vacancies.",
        {},
        values,
      );
    }
  }

  let ipHash: string;
  try {
    const requestHeaders = await headers();
    ipHash = hashIp(getClientIp(requestHeaders));
  } catch (error) {
    console.error("User details form unavailable: unable to hash client address.", error);
    return fail("The form is temporarily unavailable. Please try again later.", {}, values);
  }

  if (!checkFormRateLimit(`user-details:${ipHash}`, 6, 10 * 60 * 1000)) {
    return fail("Too many submissions have been received. Please try again later.", {}, values);
  }

  const { resume, error: resumeError } = await readResume(formData);
  if (resumeError) {
    return fail("Please check the attached resume.", { resume: resumeError }, values);
  }

  try {
    await dbRun(
      `INSERT INTO user_details (
         id, kind, job_id, job_title, name, email, phone, city, state,
         qualification, experience, preferred_departments, message,
         resume_name, resume_mime, resume_size, resume_data,
         status, ip_hash, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      [
        randomUUID(),
        data.kind,
        job?.id ?? null,
        job?.title ?? null,
        data.name,
        data.email.toLowerCase(),
        data.phone,
        data.city,
        data.state,
        data.qualification,
        data.experience,
        data.preferred_departments ?? null,
        data.message ?? null,
        resume?.name ?? null,
        resume?.mime ?? null,
        resume?.size ?? null,
        resume?.data ?? null,
        ipHash,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    console.error("Failed to store submitted user details.", error);
    return fail(
      "Your details could not be saved. Please try again in a moment.",
      {},
      values,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/user-details");

  return {
    ok: true,
    message:
      data.kind === "job_application"
        ? "Your details and resume have been saved for the site owner to review. This form does not contact the employer directly."
        : "Your details have been saved. The site owner can now review them for relevant job alerts and career updates.",
    errors: {},
    values: {
      name: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      qualification: "",
      experience: "",
      preferred_departments: "",
      message: "",
      consent: false,
    },
  };
}

function safeAdminReturn(formData: FormData): string | null {
  const value = String(formData.get("return_to") ?? "").trim();
  if (!value.startsWith("/admin/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}

export async function updateUserDetailAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("admin_note") ?? "").trim();
  const returnTo = safeAdminReturn(formData);

  if (!id || !isUserDetailStatus(status)) {
    redirect("/admin/user-details?error=invalid");
  }

  if (note.length > 2000) {
    redirect(`/admin/user-details/${encodeURIComponent(id)}?error=invalid`);
  }

  const existing = await dbGet<{ id: string }>(
    "SELECT id FROM user_details WHERE id = ?",
    [id],
  );
  if (!existing) redirect("/admin/user-details?error=not-found");

  try {
    await dbRun(
      "UPDATE user_details SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?",
      [status, note || null, new Date().toISOString(), id],
    );
  } catch (error) {
    console.error("Failed to update user details record.", error);
    redirect(`/admin/user-details/${encodeURIComponent(id)}?error=update`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/user-details");
  revalidatePath(`/admin/user-details/${id}`);
  redirect(returnTo ? `${returnTo}?saved=1` : `/admin/user-details/${id}?saved=1`);
}

export async function deleteUserDetailAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/user-details?error=invalid");

  const existing = await dbGet<{ id: string }>(
    "SELECT id FROM user_details WHERE id = ?",
    [id],
  );
  if (!existing) redirect("/admin/user-details?error=not-found");

  try {
    await dbRun("DELETE FROM user_details WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete user details record.", error);
    redirect(`/admin/user-details/${encodeURIComponent(id)}?error=delete`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/user-details");
  redirect("/admin/user-details?deleted=1");
}
