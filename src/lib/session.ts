import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dbGet, dbRun } from "@/lib/db";
import { sha256 } from "@/lib/config";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  SESSION_IDLE_TIMEOUT_MS,
} from "@/lib/constants";
import type { AdminUser } from "@/lib/types";

export interface AdminSession extends AdminUser {
  sessionId: string;
}

interface SessionRow {
  session_id: string;
  expires_at: string;
  last_seen_at: string;
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login_at: string | null;
}

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function createSession(
  adminId: string,
  ipHash: string,
  userAgent: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await dbRun(
    `INSERT INTO sessions (id, admin_id, created_at, last_seen_at, expires_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      tokenHash,
      adminId,
      now.toISOString(),
      now.toISOString(),
      expiresAt.toISOString(),
      ipHash,
      userAgent.slice(0, 300),
    ],
  );

  // Opportunistic cleanup of expired sessions.
  await dbRun("DELETE FROM sessions WHERE expires_at < ?", [now.toISOString()]);

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;

  const row = await dbGet<SessionRow>(
    `SELECT s.id AS session_id, s.expires_at, s.last_seen_at,
            a.id, a.email, a.name, a.created_at, a.last_login_at
     FROM sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.id = ? AND a.is_active = 1`,
    [sha256(token)],
  );

  if (!row) return null;

  const now = Date.now();
  const expired = Date.parse(row.expires_at) <= now;
  const idle = now - Date.parse(row.last_seen_at) > SESSION_IDLE_TIMEOUT_MS;

  if (expired || idle) {
    await dbRun("DELETE FROM sessions WHERE id = ?", [row.session_id]);
    return null;
  }

  if (now - Date.parse(row.last_seen_at) > TOUCH_INTERVAL_MS) {
    await dbRun("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [
      new Date(now).toISOString(),
      row.session_id,
    ]);
  }

  return {
    sessionId: row.session_id,
    id: row.id,
    email: row.email,
    name: row.name,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function destroySession(sessionId: string): Promise<void> {
  await dbRun("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export async function destroyAllSessionsForAdmin(adminId: string): Promise<void> {
  await dbRun("DELETE FROM sessions WHERE admin_id = ?", [adminId]);
}

export function sanitizeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  const path = value.trim();
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  if (!isAdminPath || path.includes("//") || path.includes("\\")) {
    return "/admin";
  }
  return path;
}
