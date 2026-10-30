import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_lib/db.js";
import { consume, getClientIp } from "./_lib/rate-limit.js";
import { checkApplicationsSchema } from "./_lib/validate.js";

/**
 * Public duplicate-check (no auth). The apply form calls this as the candidate
 * types their email and returns the ROLE TITLES that email has already applied
 * for — at any company. The UI uses it to:
 *
 *   • show a "+" badge on roles already applied for,
 *   • explain "same role at another company" before the candidate wastes a
 *     submission,
 *   • block a second application for the same role with a clear message.
 *
 * Only the email goes out and only role titles come back — no other candidate
 * data. Rate-limited to 5/min per IP like the other public endpoints.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = consume(`appcheck:${getClientIp(req)}`, 5, 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const parsed = checkApplicationsSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("applications")
    .select("job_title, company")
    .eq("email", email);
  if (error) {
    // The table may not exist yet (migration pending) — behave as "no
    // previous applications" rather than breaking the apply form.
    return res.status(200).json({ appliedRoles: [] });
  }

  const appliedRoles = Array.from(
    new Set(((data ?? []) as Array<{ job_title: string }>).map((row) => row.job_title.trim().toLowerCase()))
  );

  return res.status(200).json({ appliedRoles });
}
