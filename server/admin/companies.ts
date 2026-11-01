import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/db.js";

/**
 * Site-wide company settings (single row keyed by the fixed SETTINGS_KEY).
 * The public site reads photo_url / salary_visible / documents_for_interview;
 * admins manage the row here. Upsert keeps GET and PATCH idempotent even
 * before the migration's default row exists.
 *
 * Same server-side authorization as every admin endpoint: Firebase admin
 * claim AND ADMIN_EMAILS allowlist.
 */
const SETTINGS_KEY = "site-settings";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const db = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db.from("companies").select("*").eq("name", SETTINGS_KEY).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (data) return res.status(200).json({ company: data });
    // No row yet — create the default settings row and return it.
    const { data: created, error: createError } = await db
      .from("companies")
      .upsert(
        { name: SETTINGS_KEY, photo_url: null, salary_visible: true, documents_for_interview: null },
        { onConflict: "name" }
      )
      .select("*")
      .single();
    if (createError) return res.status(500).json({ error: createError.message });
    return res.status(200).json({ company: created });
  }

  if (req.method === "PATCH") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof body.photo_url === "string") patch.photo_url = body.photo_url || null;
    if (typeof body.salary_visible === "boolean") patch.salary_visible = body.salary_visible;
    if (typeof body.documents_for_interview === "string") {
      patch.documents_for_interview = body.documents_for_interview || null;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    // Upsert so the row is created on first save (no hardcoded UUID).
    const { data, error } = await db
      .from("companies")
      .upsert({ name: SETTINGS_KEY, salary_visible: true, ...patch }, { onConflict: "name" })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ company: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
