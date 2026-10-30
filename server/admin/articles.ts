import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/db.js";
import { createArticleSchema, updateArticleSchema } from "../_lib/validate.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const db = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await db.from("articles").select("*").order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ articles: data ?? [] });
  }

  if (req.method === "POST") {
    const body = req.body as Record<string, unknown>;
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const payload = parsed.data;
    const { data, error } = await db
      .from("articles")
      .insert({
        slug: payload.slug,
        title: payload.title,
        excerpt: payload.excerpt ?? null,
        content: payload.content ?? null,
        category: payload.category ?? null,
        author: payload.author ?? null,
        status: payload.status,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ article: data });
  }

  if (req.method === "PATCH") {
    const body = req.body as Record<string, unknown>;
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { id, ...rest } = parsed.data;
    const { data, error } = await db.from("articles").update(rest).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Article not found" });
    return res.status(200).json({ article: data });
  }

  if (req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { id } = body;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Validation failed", details: { id: "Required" } });
    }
    const { data, error } = await db.from("articles").delete().eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Article not found" });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
