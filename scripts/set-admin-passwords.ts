/**
 * Reset the two admin passwords in Firebase Auth and keep .env.local in sync.
 * Run: npx tsx scripts/set-admin-passwords.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env.local.
 * New passwords are passed on the command line (never hardcoded here),
 * written only to .env.local (gitignored) and printed masked.
 *
 * Usage:
 *   npx tsx scripts/set-admin-passwords.ts <admin1-password> <admin2-password>
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

const TARGETS: Array<{ email: string; envKey: string }> = [
  { email: "karunasrikaram@gmail.com", envKey: "TEST_ADMIN1_PASSWORD" },
  { email: "kothapallyhrishikesh3@gmail.com", envKey: "TEST_ADMIN2_PASSWORD" },
];

function getEnvValue(text: string, key: string): string {
  return (text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1] ?? "").trim();
}

function setEnvValue(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const lines = text.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((l) => {
    if (l.startsWith(`${key}=`)) {
      replaced = true;
      return line;
    }
    return l;
  });
  if (!replaced) out.push(line);
  return out.join("\r\n");
}

const mask = (pw: string) => `${pw.slice(0, 2)}${"*".repeat(Math.max(4, pw.length - 4))}`;

async function main() {
  const [, , pw1, pw2] = process.argv;
  const newPasswords = [pw1 ?? "", pw2 ?? ""];
  if (newPasswords.some((p) => p.length < 6)) {
    process.stdout.write("ERROR: pass two passwords of at least 6 characters, e.g.\n");
    process.stdout.write("  npx tsx scripts/set-admin-passwords.ts <admin1-password> <admin2-password>\n");
    process.exit(1);
  }

  let envText = readFileSync(ENV_PATH, "utf8");
  const serviceAccount = getEnvValue(envText, "FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccount) {
    process.stdout.write("ERROR: FIREBASE_SERVICE_ACCOUNT_JSON missing from .env.local\n");
    process.exit(1);
  }
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = serviceAccount;

  const { getFirebaseAdmin } = await import("../server/_lib/firebase");
  const auth = getFirebaseAdmin().auth();

  for (let i = 0; i < TARGETS.length; i += 1) {
    const target = TARGETS[i];
    const password = newPasswords[i];
    try {
      const user = await auth.getUserByEmail(target.email);
      await auth.updateUser(user.uid, { password });
      envText = setEnvValue(envText, target.envKey, password);
      process.stdout.write(`UPDATED ${target.email}  uid=${user.uid.slice(0, 8)}…  ${target.envKey}=${mask(password)}\n`);
    } catch (err) {
      process.stdout.write(`FAILED  ${target.email}: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  }

  if (process.exitCode !== 1) {
    writeFileSync(ENV_PATH, envText, { encoding: "utf8" });
    process.stdout.write("\n.env.local updated (gitignored, never committed).\n");
  }
}

void main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    process.stdout.write(`ERROR ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
);
