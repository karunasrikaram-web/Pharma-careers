import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAdminSessionCookie, verifyAdminToken, type AdminAuthResult } from "./firebase";
import { consume, getClientIp } from "./rate-limit";

export const ADMIN_SESSION_COOKIE = "pharma_admin_session";

function getCookie(req: VercelRequest, name: string): string | null {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const cookieHeader = headers.cookie;
  const raw = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (!raw) return null;
  const cookies = raw.split(";").map((part) => part.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const eq = cookie.indexOf("=");
    if (eq <= 0) continue;
    const key = cookie.slice(0, eq).trim();
    const value = cookie.slice(eq + 1).trim();
    if (key === name) return value;
  }
  return null;
}

function getBearerToken(req: VercelRequest): string | null {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const auth = headers.authorization;
  const raw = Array.isArray(auth) ? auth[0] : auth;
  if (!raw) return null;
  const [scheme, token, ...rest] = raw.trim().split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) return null;
  return token;
}

/**
 * Admin email allowlist (`ADMIN_EMAILS`, comma-separated, server-only env var).
 *
 * This is checked IN ADDITION TO the Firebase `admin: true` custom claim —
 * both must pass. Matching is case-insensitive.
 *
 * Fail-closed behaviour:
 *  - allowlist configured  → only those exact addresses are accepted;
 *  - allowlist empty + production → nobody is accepted (misconfiguration is
 *    denied rather than silently wide open);
 *  - allowlist empty + development → claim-only, so local dev works out of the box.
 */
export function getAllowedAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedAdminEmails();
  if (allowed.length > 0) {
    return allowed.includes((email ?? "").trim().toLowerCase());
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Applies the allowlist to an already-verified admin result.
 * A valid admin whose address is not on the list is rejected with 403.
 */
export function enforceAdminAllowlist(result: AdminAuthResult): AdminAuthResult {
  if (!result.ok) return result;
  if (isEmailAllowed(result.email)) return result;
  return { ok: false, status: 403, reason: "forbidden" };
}

/**
 * Verifies the caller as an admin:
 *  1. Firebase ID token from `Authorization: Bearer <token>` OR
 *     from the secure httpOnly session cookie minted via createSessionCookie.
 *  2. Verifies with firebase-admin (verifyIdToken / verifySessionCookie w/ checkRevoked).
 *  3. Requires the custom claim `admin === true`.
 *  4. Requires the address to be on the `ADMIN_EMAILS` allowlist.
 *  5. Applies a per-IP rate limit.
 *
 * Returns 401 (missing/invalid) or 403 (valid token without admin claim, or
 * address not allowlisted) as appropriate.
 */
export async function requireAdmin(req: VercelRequest): Promise<AdminAuthResult> {
  const bearer = getBearerToken(req);
  const token = bearer ?? getCookie(req, ADMIN_SESSION_COOKIE);
  if (!token) {
    return { ok: false, status: 401, reason: "missing" };
  }

  const ip = getClientIp(req);
  const rate = consume(`admin:${ip}`, 120, 60_000);
  if (!rate.allowed) {
    return { ok: false, status: 429, reason: "rate_limited" };
  }

  if (bearer) {
    return enforceAdminAllowlist(await verifyAdminToken(bearer));
  }
  return enforceAdminAllowlist(await verifyAdminSessionCookie(token));
}

export function adminAuthFailureResponse(authResult: AdminAuthResult) {
  if (authResult.ok) {
    return null;
  }
  const status = authResult.status === 429 ? 429 : authResult.status;
  const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
  return { status, body: { error: message } };
}

export function isAdminAuthFailure(authResult: AdminAuthResult): authResult is Extract<AdminAuthResult, { ok: false }> {
  return !authResult.ok;
}
