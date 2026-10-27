"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import { hashIp, getClientIp } from "@/lib/config";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import {
  createSession,
  clearSessionCookie,
  destroySession,
  getSession,
  sanitizeNextPath,
  setSessionCookie,
} from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const nextPath = sanitizeNextPath(formData.get("next"));

  let ipHash: string;
  try {
    const requestHeaders = await headers();
    ipHash = hashIp(getClientIp(requestHeaders));
  } catch (error) {
    console.error("Login unavailable: unable to hash client address.", error);
    return { error: "Login is temporarily unavailable. Please try again later." };
  }

  const limit = checkLoginRateLimit(email, ipHash);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      error: `Too many failed sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const db = getDb();
  const admin = db
    .prepare(
      "SELECT id, email, name, password_hash, is_active FROM admins WHERE email = ?",
    )
    .get(email) as
    | { id: string; email: string; name: string; password_hash: string; is_active: number }
    | undefined;

  const validPassword = verifyPassword(
    password,
    admin?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  const valid = Boolean(admin && admin.is_active === 1 && validPassword);

  recordLoginAttempt(email, ipHash, valid);

  if (!admin || !valid) {
    return { error: "Invalid email or password." };
  }

  const userAgent = (await headers()).get("user-agent") ?? "";
  const { token, expiresAt } = createSession(admin.id, ipHash, userAgent);
  db.prepare("UPDATE admins SET last_login_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    admin.id,
  );

  await setSessionCookie(token, expiresAt);
  redirect(nextPath);
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) destroySession(session.sessionId);
  await clearSessionCookie();
  redirect("/admin/login?loggedOut=1");
}
