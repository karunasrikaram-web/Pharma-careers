import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { consume, getClientIp } from "./_lib/rate-limit.js";
import { readReviews, writeReviews, type StoredReview } from "./_lib/reviews-store.js";

const reviewSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(2000),
});

/**
 * Public reviews endpoint (no auth).
 * - GET  → approved reviews only (public display)
 * - POST → submit a new review (stored as pending; rate-limited 5/min/IP)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await route(req, res);
  } catch (err) {
    return res.status(500).json({ error: (err as Error)?.message ?? "Server error" });
  }
}

async function route(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const reviews = (await readReviews())
      .filter((r) => r.status === "approved")
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 50)
      .map(({ id, name, role, rating, content, created_at }) => ({
        id,
        name,
        role,
        rating,
        content,
        created_at,
      }));
    return res.status(200).json({ reviews });
  }

  if (req.method === "POST") {
    const limit = consume(`review:${getClientIp(req)}`, 5, 60_000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    }

    const { name, email, role, rating, content } = parsed.data;
    const now = new Date().toISOString();
    const review: StoredReview = {
      id: crypto.randomUUID(),
      name,
      email: email ?? null,
      role: role ?? null,
      rating,
      content,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    const existing = await readReviews();
    await writeReviews([review, ...existing]);

    return res.status(201).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}