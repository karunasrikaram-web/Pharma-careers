/**
 * One-time tool: grants the Firebase custom claim `admin: true` to a user.
 *
 *   npx tsx scripts/set-admin.ts --email owner@example.com
 *   npx tsx scripts/set-admin.ts --uid <firebase-uid>
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT_JSON (or the three
 * FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY vars),
 * read from the environment or from .env.local. No passwords, no hardcoded UIDs.
 *
 * Also warns if the target address is not on the ADMIN_EMAILS allowlist,
 * because the claim alone is not enough to pass admin authorization.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function flagValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  return value && value.length > 0 ? value : undefined;
}

function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && out[m[1]] === undefined) out[m[1]] = m[2].trim();
      }
    } catch {
      // file missing — keep looking
    }
  }
  return out;
}

/** ADMIN_EMAILS from the environment, falling back to .env.local / .env. */
function loadAllowedEmails(env: Record<string, string>): string[] {
  const raw = (process.env.ADMIN_EMAILS || env.ADMIN_EMAILS || "").trim();
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

async function main(): Promise<void> {
  const byUid = flagValue("--uid");
  const byEmail = flagValue("--email");

  if (!byUid && !byEmail) {
    throw new Error("Provide either --uid <uid> or --email <email>");
  }

  const env = readEnvFile();
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  }

  const { getFirebaseAdmin } = await import("../api/_lib/firebase");
  const auth = getFirebaseAdmin().auth();

  const user = byUid ? await auth.getUser(byUid) : await auth.getUserByEmail(byEmail as string);
  await auth.setCustomUserClaims(user.uid, { admin: true });

  const allowed = loadAllowedEmails(env);
  const address = (user.email ?? "").trim().toLowerCase();
  if (allowed.length > 0 && address && !allowed.includes(address)) {
    process.stderr.write(
      `WARNING: ${address} now has the admin claim but is NOT in ADMIN_EMAILS — ` +
        `admin endpoints will return 403 until it is added (see .env.example).\n`
    );
  }

  process.stdout.write(
    JSON.stringify(
      {
        uid: user.uid,
        email: user.email ?? "",
        admin: true,
        onAllowlist: allowed.length === 0 ? "allowlist-not-configured" : allowed.includes(address),
      },
      null,
      2
    ) + "\n"
  );
}

void main().catch((err) => {
  process.stderr.write(`Failed to set admin claim: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
