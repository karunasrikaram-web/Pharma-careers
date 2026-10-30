import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/db.js";
import { siteContentKeySchema } from "../_lib/validate.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const db = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db.from("site_content").select("*").order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data ?? [] });
  }

  if (req.method === "PUT") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = siteContentKeySchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { key, value, type } = parsed.data;
    const { data, error } = await db
      .from("site_content")
      .upsert(
        { key, value: value ?? {}, type: type ?? "text" },
        { onConflict: "key" }
      )
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ item: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
