"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbRun } from "@/lib/db";
import {
  findPotentialDuplicate,
  getJobById,
  isJobStatus,
  slugExists,
} from "@/lib/jobs";
import { requireAdmin } from "@/lib/session";
import { parseJobForm, type JobFormValues } from "@/lib/validation";
import { slugify } from "@/lib/urls";

export interface JobFormState {
  errors: Record<string, string>;
  values: JobFormValues;
  message?: string;
}

async function createUniqueSlug(title: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `${slugify(title)}-${randomBytes(3).toString("hex")}`;
    if (!(await slugExists(candidate))) return candidate;
  }
  return `${slugify(title)}-${randomUUID()}`;
}

function revalidateJobPaths(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/jobs");
  if (slug) revalidatePath(`/jobs/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/job-alerts");
}

function safeAdminReturn(formData: FormData): string | null {
  const value = String(formData.get("return_to") ?? "").trim();
  if (value === "/admin/jobs" || value === "/admin/job-alerts") return value;
  return null;
}

export async function saveJobAction(
  _previousState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireAdmin();
  const parsed = parseJobForm(formData);

  if (!parsed.success) {
    return {
      errors: parsed.errors,
      values: parsed.values,
      message: "Please correct the highlighted fields.",
    };
  }

  const data = parsed.data;
  const values = parsed.values;
  const jobId = values.id.trim() || null;
  const intent = values.intent;
  const now = new Date().toISOString();

  let savedId = jobId;
  let savedSlug: string | undefined;

  try {
    const duplicate = await findPotentialDuplicate(
      data.title,
      data.company_name,
      data.city,
      jobId ?? undefined,
    );

    if (duplicate) {
      return {
        errors: {
          title:
            "A draft or published job with this title, company and city already exists. Edit that listing instead.",
        },
        values,
        message: "A similar job already exists.",
      };
    }

    if (jobId) {
      const existing = await getJobById(jobId);
      if (!existing) {
        return {
          errors: { form: "This job no longer exists." },
          values,
          message: "This job no longer exists.",
        };
      }

      const publishedAt =
        data.status === "published" ? existing.published_at ?? now : existing.published_at;

      await dbRun(
        `UPDATE jobs SET
           title = ?, company_name = ?, department = ?, city = ?, state = ?,
           experience_min = ?, experience_max = ?, employment_type = ?, salary_range = ?,
           description = ?, responsibilities = ?, qualifications = ?, skills = ?,
           application_instructions = ?, application_url = ?, published_at = ?,
           application_deadline = ?, status = ?, is_featured = ?, updated_at = ?
         WHERE id = ?`,
        [
        data.title,
        data.company_name,
        data.department,
        data.city,
        data.state,
        data.experience_min ?? null,
        data.experience_max ?? null,
        data.employment_type ?? null,
        data.salary_range ?? null,
        data.description,
        data.responsibilities ?? null,
        data.qualifications ?? null,
        data.skills ?? null,
        data.application_instructions ?? null,
        data.application_url ?? null,
        publishedAt,
        data.application_deadline ?? null,
        data.status,
        data.is_featured ? 1 : 0,
        now,
        jobId,
        ],
      );

      savedSlug = existing.slug;
    } else {
      savedId = randomUUID();
      savedSlug = await createUniqueSlug(data.title);

      await dbRun(
        `INSERT INTO jobs (
           id, slug, title, company_name, department, city, state,
           experience_min, experience_max, employment_type, salary_range,
           description, responsibilities, qualifications, skills,
           application_instructions, application_url, published_at,
           application_deadline, status, is_featured, is_demo,
           created_by, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
        savedId,
        savedSlug,
        data.title,
        data.company_name,
        data.department,
        data.city,
        data.state,
        data.experience_min ?? null,
        data.experience_max ?? null,
        data.employment_type ?? null,
        data.salary_range ?? null,
        data.description,
        data.responsibilities ?? null,
        data.qualifications ?? null,
        data.skills ?? null,
        data.application_instructions ?? null,
        data.application_url ?? null,
        data.status === "published" ? now : null,
        data.application_deadline ?? null,
        data.status,
        data.is_featured ? 1 : 0,
        session.id,
        now,
        now,
        ],
      );
    }
  } catch (error) {
    console.error("Failed to save job.", error);
    return {
      errors: { form: "The job could not be saved. Please try again." },
      values,
      message: "The job could not be saved.",
    };
  }

  if (!savedId) {
    return {
      errors: { form: "The job could not be saved." },
      values,
      message: "The job could not be saved.",
    };
  }

  revalidateJobPaths(savedSlug);

  redirect(
    `/admin/jobs/${savedId}/edit?saved=1${data.status === "published" ? "&published=1" : ""}`,
  );
}

export async function setJobStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const returnTo = safeAdminReturn(formData);

  if (!id || !isJobStatus(status)) {
    redirect("/admin/jobs?error=invalid");
  }

  const job = await getJobById(id);
  if (!job) redirect("/admin/jobs?error=not-found");

  const now = new Date().toISOString();
  const publishedAt =
    status === "published" ? job.published_at ?? now : job.published_at;

  try {
    await dbRun(
      "UPDATE jobs SET status = ?, published_at = ?, updated_at = ? WHERE id = ?",
      [status, publishedAt, now, id],
    );
  } catch (error) {
    console.error("Failed to update job status.", error);
    redirect(`/admin/jobs/${id}/edit?error=status`);
  }

  revalidateJobPaths(job.slug);
  redirect(returnTo ? `${returnTo}?saved=1` : `/admin/jobs/${id}/edit?saved=1`);
}

export async function toggleFeaturedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const returnTo = safeAdminReturn(formData);
  if (!id) redirect("/admin/jobs?error=invalid");

  const job = await getJobById(id);
  if (!job) redirect("/admin/jobs?error=not-found");

  try {
    await dbRun("UPDATE jobs SET is_featured = ?, updated_at = ? WHERE id = ?", [
      job.is_featured ? 0 : 1,
      new Date().toISOString(),
      id,
    ]);
  } catch (error) {
    console.error("Failed to toggle featured status.", error);
    redirect(`/admin/jobs/${id}/edit?error=status`);
  }

  revalidateJobPaths(job.slug);
  redirect(returnTo ? `${returnTo}?saved=1` : `/admin/jobs/${id}/edit?saved=1`);
}

export async function deleteJobAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/jobs?error=invalid");

  const job = await getJobById(id);
  if (!job) redirect("/admin/jobs?error=not-found");

  try {
    await dbRun("DELETE FROM jobs WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete job.", error);
    redirect(`/admin/jobs/${id}/edit?error=delete`);
  }

  revalidateJobPaths(job.slug);
  redirect("/admin/jobs?deleted=1");
}
