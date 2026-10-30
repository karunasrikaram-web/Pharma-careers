/**
 * Firebase readiness check.
 * Run: npx tsx scripts/check-firebase.ts
 *
 * Reports whether the credentials in .env.local are complete and, once the
 * service account is present, lists every Firebase user with its `admin`
 * custom claim and whether the address is on the ADMIN_EMAILS allowlist.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function readEnvFile(): Record<string, string> {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = readEnvFile();
const set = (name: string, value: string) => {
  if (value) process.env[name] = value;
};

const lines: string[] = [];
const say = (s: string) => lines.push(s);

let ready = true;
const need = (label: string, ok: boolean, note = "") => {
  if (!ok) ready = false;
  say(`${ok ? "READY " : "MISSING"}  ${label}${note ? `  ${note}` : ""}`);
};

async function main() {
  // ── 1. public web config (client) ──────────────────────────────────────
  say("─ Firebase web config (client, public) ─");
  for (const key of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_APP_ID",
  ]) {
    const v = env[key] ?? "";
    need(key, v.length > 10, v ? `(${v.slice(0, 14)}…)` : "");
    set(key, v);
  }

  // ── 2. server credentials ──────────────────────────────────────────────
  say("");
  say("─ Firebase server credentials ─");
  const json = env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "";
  const trio = env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY;
  if (json) {
    try {
      const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
      const ok = Boolean(parsed.project_id && parsed.client_email && parsed.private_key);
      need("FIREBASE_SERVICE_ACCOUNT_JSON parses", ok, ok ? `(project_id=${parsed.project_id})` : "(missing fields)");
      if (ok) set("FIREBASE_SERVICE_ACCOUNT_JSON", json);
    } catch {
      need("FIREBASE_SERVICE_ACCOUNT_JSON parses", false, "(invalid JSON — must be a single line, quoted)");
    }
  } else if (trio) {
    need("FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY", true);
    set("FIREBASE_PROJECT_ID", env.FIREBASE_PROJECT_ID!);
    set("FIREBASE_CLIENT_EMAIL", env.FIREBASE_CLIENT_EMAIL!);
    set("FIREBASE_PRIVATE_KEY", env.FIREBASE_PRIVATE_KEY!);
  } else {
    need("FIREBASE_SERVICE_ACCOUNT_JSON (or the 3 separate vars)", false, "add it to .env.local yourself");
  }

  // ── 3. allowlist ───────────────────────────────────────────────────────
  say("");
  const allowed = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  need("ADMIN_EMAILS allowlist", allowed.length > 0, `${allowed.length} address(es): ${allowed.join(", ") || "-"}`);

  say("");
  say("──────────────────────────────────────────────");

  // ── 4. live look at Firebase users + claims ────────────────────────────
  const serverReady = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_CLIENT_EMAIL);
  if (!serverReady) {
    say("NOT READY — server credentials missing, cannot talk to Firebase yet.");
    say("Next: add the 4 web-config values here, and drop the service-account JSON");
    say("      into .env.local yourself (never paste it in chat).");
    say("");
    say(`OVERALL: ${ready ? "NEEDS SERVER CREDENTIALS" : "INCOMPLETE"}`);
    for (const l of lines) process.stdout.write(l + "\n");
    process.exit(1);
  }

  try {
    const { getFirebaseAdmin } = await import("../server/_lib/firebase");
    const auth = getFirebaseAdmin().auth();
    const result = await auth.listUsers(200);

    say("");
    say(`Firebase users found: ${result.users.length}`);
    say("");
    say("uid(8)   email                          provider   adminClaim  onAllowlist");

    if (result.users.length === 0) {
      say("(none — create the users in Authentication → Users)");
      ready = false;
    }

    for (const u of result.users) {
      const email = (u.email ?? "").toLowerCase();
      const providers = u.providerData.map((p) => p.providerId).join("+") || "-";
      const isAdmin = (u.customClaims as { admin?: boolean } | undefined)?.admin === true;
      const onList = allowed.includes(email);
      say(
        `${u.uid.slice(0, 8).padEnd(8)} ${(email || "(no email)").padEnd(30)} ${providers.padEnd(10)} ` +
          `${String(isAdmin).padEnd(11)} ${onList}`
      );
      if (allowed.includes(email) && !isAdmin) {
        say(`         ⚠ allowlisted but has NO admin claim yet → run scripts/set-admin.js --email ${email}`);
      }
      if (isAdmin && !onList && allowed.length > 0) {
        say(`         ⚠ has admin claim but is NOT allowlisted → will get 403 on every endpoint`);
      }
    }

    const stray = result.users.filter((u) => {
      const e = (u.email ?? "").toLowerCase();
      return e && !allowed.includes(e) && !(u.customClaims as { admin?: boolean } | undefined)?.admin;
    });
    say("");
    say(
      stray.length > 0
        ? `Non-admin test user available: ${stray.map((u) => u.email).join(", ")}`
        : "⚠ No non-admin user exists yet — create one for the 403 test"
    );
    if (stray.length === 0) ready = false;

    const missingClaims = allowed.filter(
      (e) =>
        !result.users.some(
          (u) => (u.email ?? "").toLowerCase() === e && (u.customClaims as { admin?: boolean } | undefined)?.admin === true
        )
    );
    if (missingClaims.length > 0) ready = false;

    say("");
    say(`OVERALL: ${ready ? "READY — all admin tests can run" : "NOT READY — see warnings above"}`);
    for (const l of lines) process.stdout.write(l + "\n");
    process.exit(ready ? 0 : 1);
  } catch (err) {
    say("");
    say(`ERROR contacting Firebase: ${err instanceof Error ? err.message : String(err)}`);
    say("OVERALL: NOT READY");
    for (const l of lines) process.stdout.write(l + "\n");
    process.exit(1);
  }
}

void main();
