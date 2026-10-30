import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./_lib/db";
import { consume, getClientIp } from "./_lib/rate-limit";
import { createApplicationSchema } from "./_lib/validate";

/**
 * Public job-application endpoint (no auth). Candidates apply on a job's page
 * with their details and a resume file (PDF/DOC/DOCX, base64-encoded in the
 * JSON body). Flow:
 *
 *   1. per-IP rate limit (5/min — same strictness as the contact form);
 *   2. Zod validation;
 *   3. the target job must exist and be PUBLISHED (anonymous users cannot
 *      apply to drafts — RLS hides them, and this check mirrors that);
 *   4. resume is decoded, magic-byte checked (a .pdf must really be a PDF),
 *      size-checked (≤ 3 MB), then stored in the PRIVATE `resumes` bucket
 *      via the service role — the anon key has no storage access at all;
 *   5. the application row is inserted (service role; the table has no
 *      public policies, so this endpoint is the only write path).
 *
 * Admins fetch resumes later through short-lived signed URLs minted by the
 * admin API.
 */
const MAX_RESUME_BYTES = 3 * 1024 * 1024;

type AllowedType = { mime: string; ext: RegExp; magic: (b: Buffer) => boolean };

const ALLOWED_TYPES: AllowedType[] = [
  {
    mime: "application/pdf",
    ext: /\.pdf$/i,
    magic: (b) => b.length > 4 && b.subarray(0, 5).toString("latin1") === "%PDF-",
  },
  {
    mime: "application/msword",
    ext: /\.doc$/i,
    // Legacy OLE2 compound file: D0 CF 11 E0 A1 B1 1A E1
    magic: (b) =>
      b.length > 7 &&
      b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 &&
      b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1,
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: /\.docx$/i,
    // ZIP container: PK\x03\x04
    magic: (b) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
];

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "resume";
  const cleaned = base.replace(/[^A-Za-z0-9._ -]/g, "").trim().slice(0, 120);
  return cleaned || "resume";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = consume(`applications:${getClientIp(req)}`, 5, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "Too many submissions. Please try again in a minute." });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const parsed = createApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  const { jobId, name, surname, email, phone, location, coverNote, resume } = parsed.data;

  const db = getSupabaseAdmin();

  // The job must be live — anonymous users may only apply to published roles.
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, title, company, status")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) {
    return res.status(500).json({ error: "Could not verify the job. Please try again later." });
  }
  if (!job || job.status !== "published") {
    return res.status(404).json({ error: "This job is no longer accepting applications." });
  }

  // One application per email per ROLE TITLE — even when the same role is
  // offered by a different company. The unique index in the migration is the
  // hard backstop; this check turns the violation into a friendly message
  // instead of a database error. Matching is done in JS on purpose: it also
  // catches the same job re-applied under a slightly edited title.
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = job.title.trim().toLowerCase();
  const { data: existing, error: dupError } = await db
    .from("applications")
    .select("id, job_id, job_title, company")
    .eq("email", normalizedEmail);
  if (!dupError && existing && existing.length > 0) {
    const hit = (existing as Array<{ job_id: string | null; job_title: string; company: string }>).find(
      (row) => row.job_id === jobId || row.job_title.trim().toLowerCase() === normalizedRole
    );
    if (hit) {
      const atOtherCompany =
        (hit.company ?? "").trim().toLowerCase() !== (job.company ?? "").trim().toLowerCase() &&
        hit.job_id !== jobId;
      return res.status(409).json({
        error: atOtherCompany
          ? `You have already applied for the "${job.title}" role at ${hit.company}. You can apply only once per role.`
          : `You have already applied for the "${job.title}" role. You can apply only once per role.`,
        appliedRole: normalizedRole,
      });
    }
  }

  // Decode and verify the resume.
  const filename = sanitizeFilename(resume.filename);
  const buffer = Buffer.from(resume.dataBase64, "base64");
  if (buffer.length === 0) {
    return res.status(400).json({ error: "Your resume file could not be read. Please re-attach it." });
  }
  if (buffer.length > MAX_RESUME_BYTES) {
    return res.status(400).json({ error: "Resume is too large. The maximum size is 3 MB." });
  }
  const allowed = ALLOWED_TYPES.find(
    (t) => t.ext.test(filename) && t.mime === (resume.contentType || t.mime) && t.magic(buffer)
  );
  if (!allowed) {
    return res.status(400).json({ error: "Resume must be a PDF, DOC or DOCX file." });
  }

  // Store the file in the private bucket (service role only).
  // NOTE: Supabase serves signed URLs with `expires: +1h` and Cloudflare caches
  // them, so an already-minted URL may keep answering for up to an hour after
  // the object is deleted. That is platform behaviour, not a leak path we can
  // close from here: the URL is unguessable, admin-only and expires anyway.
  // Actual deletion is asserted in scripts/smoke-applications.ts by re-signing
  // the path (which fails once the object is gone).
  const objectPath = `applications/${jobId}/${randomUUID()}-${filename}`;
  const { error: uploadError } = await db.storage
    .from("resumes")
    .upload(objectPath, buffer, { contentType: allowed.mime, upsert: false });
  if (uploadError) {
    return res.status(500).json({ error: "Could not store your resume. Please try again later." });
  }

  const { error: insertError } = await db.from("applications").insert({
    job_id: jobId,
    job_title: job.title,
    company: job.company,
    applicant_name: name.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    location: location.trim(),
    cover_note: coverNote ?? null,
    resume_path: objectPath,
    resume_filename: filename,
    resume_size: buffer.length,
    resume_type: allowed.mime,
    status: "new",
  });
  if (insertError) {
    // Best-effort cleanup so orphaned files don't accumulate.
    await db.storage.from("resumes").remove([objectPath]).catch(() => undefined);
    // 23505 = unique violation (applications_email_role_uniq): someone beat
    // us to it between the pre-check above and this insert.
    if ((insertError as { code?: string }).code === "23505") {
      return res.status(409).json({
        error: `You have already applied for the "${job.title}" role. You can apply only once per role.`,
        appliedRole: normalizedRole,
      });
    }
    return res.status(500).json({ error: "Could not submit your application. Please try again later." });
  }

  return res.status(201).json({ ok: true });
}
