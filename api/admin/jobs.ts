import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth";
import { getSupabaseAdmin } from "../_lib/db";
import { createJobSchema, updateJobSchema } from "../_lib/validate";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const db = getSupabaseAdmin();

  if (req.method === "GET") {
    const status = typeof req.query?.status === "string" ? req.query.status : undefined;
    let query = db.from("jobs").select("*").order("created_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ jobs: data ?? [] });
  }

  if (req.method === "POST") {
    const body = req.body as Record<string, unknown>;
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const payload = parsed.data;
    const { data, error } = await db
      .from("jobs")
      .insert({
        title: payload.title,
        company: payload.company,
        location: payload.location ?? null,
        location_type: payload.locationType ?? null,
        employment_type: payload.employmentType ?? null,
        level: payload.level ?? null,
        category: payload.category ?? null,
        description: payload.description ?? null,
        requirements: payload.requirements ?? null,
        salary_min: payload.salaryMin ?? null,
        salary_max: payload.salaryMax ?? null,
        currency: payload.currency ?? null,
        status: payload.status,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ job: data });
  }

  if (req.method === "PATCH") {
    const body = req.body as Record<string, unknown>;
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { id, ...rest } = parsed.data;
    const { data, error } = await db
      .from("jobs")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Job not found" });
    return res.status(200).json({ job: data });
  }

  if (req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { id } = body;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Validation failed", details: { id: "Required" } });
    }
    const { data, error } = await db.from("jobs").delete().eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Job not found" });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
