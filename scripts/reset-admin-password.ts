import { randomBytes } from "node:crypto";
import { loadEnv } from "./env";
import { getDb } from "../src/lib/db";
import { hashPassword, validatePasswordStrength } from "../src/lib/password";

loadEnv();

function generatedPassword(): string {
  return `Pc-${randomBytes(15).toString("base64url")}`;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];
  return undefined;
}

const email = (argument("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = argument("password") ?? process.env.ADMIN_PASSWORD ?? generatedPassword();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Provide a valid administrator email with --email or ADMIN_EMAIL.");
  process.exit(1);
}
const strength = validatePasswordStrength(password);
if (strength) {
  console.error(`Weak password: ${strength}`);
  process.exit(1);
}

const db = getDb();
const existing = db
  .prepare("SELECT id FROM admins WHERE email = ?")
  .get(email) as { id: string } | undefined;

if (!existing) {
  console.error(`No administrator found for ${email}. Use admin:create instead.`);
  process.exit(1);
}

db.prepare("UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?").run(
  hashPassword(password),
  new Date().toISOString(),
  existing.id,
);
db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(existing.id);

console.log("Administrator password reset. All existing sessions were signed out.");
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
