import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { z } from "zod";
import { readReviews, writeReviews } from "../_lib/reviews-store.js";

const moderateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  try {
    return await route(req, res);
  } catch (err) {
    return res.status(500).json({ error: (err as Error)?.message ?? "Server error" });
  }
}

async function route(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const status = typeof req.query?.status === "string" ? req.query.status : undefined;
    let reviews = await readReviews();
    if (status) reviews = reviews.filter((r) => r.status === status);
    reviews.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return res.status(200).json({ reviews });
  }

  if (req.method === "PATCH") {
    const body = req.body as Record<string, unknown>;
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const { id, status } = parsed.data;
    const reviews = await readReviews();
    const target = reviews.find((r) => r.id === id);
    if (!target) return res.status(404).json({ error: "Review not found" });
    target.status = status;
    target.updated_at = new Date().toISOString();
    await writeReviews(reviews);
    return res.status(200).json({ review: target });
  }

  if (req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { id } = body;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Validation failed", details: { id: "Required" } });
    }
    const reviews = await readReviews();
    const target = reviews.find((r) => r.id === id);
    if (!target) return res.status(404).json({ error: "Review not found" });
    await writeReviews(reviews.filter((r) => r.id !== id));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}