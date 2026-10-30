/**
 * Creates the three test/admin users in Firebase Auth (idempotent).
 * Run: npx tsx scripts/create-users.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON in .env.local.
 * Passwords are generated (never hardcoded in code), stored only in .env.local
 * (gitignored), and printed masked. Existing users are left untouched.
 */
import { randomInt } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

const TARGETS = [
  { email: "karunasrikaram@gmail.com", envKey: "TEST_ADMIN1_PASSWORD", role: "admin (allowlisted)" },
  { email: "kothapallyhrishikesh3@gmail.com", envKey: "TEST_ADMIN2_PASSWORD", role: "admin (allowlisted)" },
  { email: "stray-test@example.com", envKey: "TEST_STRAY_PASSWORD", role: "non-admin test user" },
];

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 16): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  // guarantee at least one digit and one upper/lower mix
  return `${out}${ALPHABET[randomInt(10)]}`;
}

function readEnvRaw(): string {
  return readFileSync(ENV_PATH, "utf8");
}

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
  let envText = readEnvRaw();
  const serviceAccount = getEnvValue(envText, "FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccount) {
    process.stdout.write("ERROR: FIREBASE_SERVICE_ACCOUNT_JSON missing from .env.local\n");
    process.exit(1);
  }
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = serviceAccount;

  const { getFirebaseAdmin } = await import("../server/_lib/firebase");
  const auth = getFirebaseAdmin().auth();

  const results: { email: string; status: string; uid: string; envKey: string; password: string }[] = [];

  for (const target of TARGETS) {
    const existingPassword = getEnvValue(envText, target.envKey);
    try {
      const user = await auth.getUserByEmail(target.email);
      results.push({
        email: target.email,
        status: "already exists (password untouched)",
        uid: user.uid,
        envKey: target.envKey,
        password: existingPassword || "(no stored password)",
      });
      process.stdout.write(`EXISTS  ${target.email}  uid=${user.uid.slice(0, 8)}…\n`);
    } catch {
      const password = generatePassword();
      const created = await auth.createUser({
        email: target.email,
        password,
        emailVerified: false,
        disabled: false,
      });
      envText = setEnvValue(envText, target.envKey, password);
      results.push({
        email: target.email,
        status: "CREATED",
        uid: created.uid,
        envKey: target.envKey,
        password,
      });
      process.stdout.write(`CREATED ${target.email}  uid=${created.uid.slice(0, 8)}…\n`);
    }
  }

  writeFileSync(ENV_PATH, envText, { encoding: "utf8" });
  process.stdout.write("\nPasswords written to .env.local (gitignored, never committed):\n");
  for (const r of results) {
    process.stdout.write(`  ${r.envKey.padEnd(22)} ${r.email.padEnd(34)} ${mask(r.password)}\n`);
  }
  process.stdout.write("\nOpen .env.local to read a full password when you log in.\n");
}

void main().then(
  () => process.exit(0),
  (err) => {
    process.stdout.write(`ERROR ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
);
