import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/db";
import { updateApplicationSchema } from "../_lib/validate";

/**
 * Admin applications API.
 *
 *   GET    → every application, grouped by the job (role) it belongs to, so
 *            the console can show candidates separately under each role.
 *           Query: ?jobId=<uuid> limits the result to one role.
 *   GET    → ?resume=<applicationId> mints a short-lived signed URL for the
 *            candidate's resume in the private bucket and returns it.
 *   PATCH  → change an application's status (new → reviewing → …).
 *   DELETE → remove an application and its stored resume file.
 *
 * Same server-side authorization as every admin endpoint: Firebase admin
 * claim AND ADMIN_EMAILS allowlist.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const db = getSupabaseAdmin();

  if (req.method === "GET") {
    const resumeId = typeof req.query?.resume === "string" ? req.query.resume : undefined;
    if (resumeId) {
      const { data, error } = await db.from("applications").select("resume_path, resume_filename").eq("id", resumeId).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data?.resume_path) return res.status(404).json({ error: "No resume on this application" });
      const { data: signed, error: signError } = await db.storage
        .from("resumes")
        .createSignedUrl(data.resume_path, 3600);
      if (signError || !signed?.signedUrl) {
        return res.status(500).json({ error: signError?.message ?? "Could not create resume link" });
      }
      return res.status(200).json({ url: signed.signedUrl, filename: data.resume_filename });
    }

    const jobId = typeof req.query?.jobId === "string" ? req.query.jobId : undefined;
    let query = db.from("applications").select("*").order("created_at", { ascending: false });
    if (jobId) query = query.eq("job_id", jobId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const jobsRes = jobId
      ? await db.from("jobs").select("id, title, company, status").eq("id", jobId).maybeSingle()
      : await db.from("jobs").select("id, title, company, status").order("created_at", { ascending: false });
    const jobsList = (jobsRes as { data?: unknown }).data;
    const jobsError = (jobsRes as { error?: { message: string } }).error;
    if (jobsError) return res.status(500).json({ error: jobsError.message });

    const items = (data ?? []) as Array<Record<string, unknown> & { job_id?: string | null; job_title?: string; company?: string | null }>;
    const jobRows = (Array.isArray(jobsList) ? jobsList : jobsList ? [jobsList] : []) as Array<{
      id: string;
      title: string;
      company: string | null;
      status: string;
    }>;

    interface CompanyGroup {
      company: string;
      applications: Array<Record<string, unknown>>;
    }
    interface RoleGroup {
      title: string;
      jobs: Array<{ id: string; title: string; company: string | null; status: string }>;
      companies: CompanyGroup[];
      count: number;
      latest: string | null;
    }

    // ── group: ROLE → COMPANY → candidates ────────────────────────────────
    // Every published/draft vacancy contributes a role section even with zero
    // applicants, so the admin always sees each role separately. Applications
    // whose job was deleted keep their own role section (title snapshot).
    const roleMap = new Map<string, RoleGroup>();

    const roleKey = (title: string) => title.trim().toLowerCase();
    const ensureRole = (title: string): RoleGroup => {
      const key = roleKey(title);
      let role = roleMap.get(key);
      if (!role) {
        role = { title: title.trim(), jobs: [], companies: [], count: 0, latest: null };
        roleMap.set(key, role);
      }
      return role;
    };
    const ensureCompany = (role: RoleGroup, company: string): CompanyGroup => {
      const name = company.trim() || "—";
      let group = role.companies.find((c) => c.company.toLowerCase() === name.toLowerCase());
      if (!group) {
        group = { company: name, applications: [] };
        role.companies.push(group);
      }
      return group;
    };

    for (const job of jobRows) {
      const role = ensureRole(job.title);
      role.jobs.push(job);
      ensureCompany(role, job.company ?? "—");
    }

    for (const app of items) {
      const title = String(app.job_title ?? "").trim() || "Formerly listed jobs";
      const role = ensureRole(title);
      const group = ensureCompany(role, String(app.company ?? "—"));
      group.applications.push(app);
      role.count += 1;
      const createdAt = String(app.created_at ?? "");
      if (!role.latest || createdAt > role.latest) role.latest = createdAt;
    }

    // Sort companies by candidate count, roles by recency then name.
    const roles = Array.from(roleMap.values()).sort((a, b) => {
      if (a.latest !== b.latest) return (b.latest ?? "").localeCompare(a.latest ?? "");
      if (b.count !== a.count) return b.count - a.count;
      return a.title.localeCompare(b.title);
    });
    for (const role of roles) {
      role.companies.sort((a, b) => {
        if (b.applications.length !== a.applications.length) {
          return b.applications.length - a.applications.length;
        }
        return a.company.localeCompare(b.company);
      });
    }

    return res.status(200).json({ roles, total: items.length });
  }

  if (req.method === "PATCH") {
    const body = req.body as Record<string, unknown>;
    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { id, status } = parsed.data;
    const { data, error } = await db
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Application not found" });
    return res.status(200).json({ application: data });
  }

  if (req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { id } = body;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Validation failed", details: { id: "Required" } });
    }
    const { data: row, error: fetchError } = await db
      .from("applications")
      .select("id, resume_path")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!row) return res.status(404).json({ error: "Application not found" });

    if (row.resume_path) {
      await db.storage.from("resumes").remove([row.resume_path]).catch(() => undefined);
    }
    const { error } = await db.from("applications").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
