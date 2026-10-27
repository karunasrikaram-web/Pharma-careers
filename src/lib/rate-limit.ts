import { dbGet, dbRun } from "@/lib/db";
import { LOGIN_WINDOW_MS } from "@/lib/constants";

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const MAX_FAILURES_PER_IDENTITY = 5;
const MAX_FAILURES_PER_IP = 15;

export async function recordLoginAttempt(
  email: string,
  ipHash: string,
  success: boolean,
): Promise<void> {
  const now = new Date();

  await dbRun(
    "INSERT INTO login_attempts (email, ip_hash, success, created_at) VALUES (?, ?, ?, ?)",
    [email.toLowerCase(), ipHash, success ? 1 : 0, now.toISOString()],
  );

  // Keep the table small: remove records older than 24 hours.
  await dbRun("DELETE FROM login_attempts WHERE created_at < ?", [
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  ]);

  if (success) {
    await dbRun("DELETE FROM login_attempts WHERE email = ? AND success = 0", [
      email.toLowerCase(),
    ]);
  }
}

export async function checkLoginRateLimit(
  email: string,
  ipHash: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const normalizedEmail = email.toLowerCase();

  const identity = await dbGet<{ count: number; last: string | null }>(
    `SELECT COUNT(*) AS count, MAX(created_at) AS last
     FROM login_attempts
     WHERE success = 0 AND email = ? AND ip_hash = ? AND created_at >= ?`,
    [normalizedEmail, ipHash, since],
  );

  const byIp = await dbGet<{ count: number; last: string | null }>(
    `SELECT COUNT(*) AS count, MAX(created_at) AS last
     FROM login_attempts
     WHERE success = 0 AND ip_hash = ? AND created_at >= ?`,
    [ipHash, since],
  );

  const identityCount = identity?.count ?? 0;
  const ipCount = byIp?.count ?? 0;
  const identityBlocked = identityCount >= MAX_FAILURES_PER_IDENTITY;
  const ipBlocked = ipCount >= MAX_FAILURES_PER_IP;

  if (!identityBlocked && !ipBlocked) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const last = Math.max(
    identity?.last ? Date.parse(identity.last) : 0,
    byIp?.last ? Date.parse(byIp.last) : 0,
  );
  const retryAt = last + LOGIN_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));

  return { allowed: false, retryAfterSeconds };
}

const memoryHits = new Map<string, { count: number; resetAt: number }>();

/**
 * Lightweight in-memory rate limiting for public forms. This is per-process;
 * for multi-instance deployments, move these counters to a shared store.
 */
export function checkFormRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const current = memoryHits.get(key);

  if (!current || current.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    if (memoryHits.size > 5000) {
      for (const [entryKey, entry] of memoryHits) {
        if (entry.resetAt <= now) memoryHits.delete(entryKey);
      }
    }
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
