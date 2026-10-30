import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_lib/db";
import { consume, getClientIp } from "./_lib/rate-limit";
import { contactMessageSchema } from "./_lib/validate";

/**
 * Public contact form endpoint (no auth). Validates with Zod, rate-limits per
 * IP (5/min — intentionally stricter than admin endpoints), then stores the
 * message with the service role key. The anon key cannot write to
 * contact_messages (RLS: no public policies), so all writes go through here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = consume(`contact:${getClientIp(req)}`, 5, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const { name, email, subject, message } = parsed.data;
  const db = getSupabaseAdmin();
  const { error } = await db.from("contact_messages").insert({
    name,
    email,
    subject: subject ?? null,
    message,
  });
  if (error) {
    return res.status(500).json({ error: "Could not store your message. Please try again later." });
  }

  return res.status(201).json({ ok: true });
}
