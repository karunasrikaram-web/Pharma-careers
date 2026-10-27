import { randomBytes, randomUUID } from "node:crypto";
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
const name = (argument("name") ?? process.env.ADMIN_NAME ?? "Pharma Careers Administrator").trim();
const password = argument("password") ?? process.env.ADMIN_PASSWORD ?? generatedPassword();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Provide a valid administrator email with --email or ADMIN_EMAIL.");
  process.exit(1);
}
if (name.length < 2 || name.length > 120) {
  console.error("Administrator name must be between 2 and 120 characters.");
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

if (existing) {
  console.error(`An administrator with ${email} already exists. Use admin:reset-password instead.`);
  process.exit(1);
}

const now = new Date().toISOString();
db.prepare(
  `INSERT INTO admins (id, email, name, password_hash, is_active, created_at, updated_at)
   VALUES (?, ?, ?, ?, 1, ?, ?)`,
).run(randomUUID(), email, name, hashPassword(password), now, now);

console.log("Administrator created.");
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
console.log("Store this password securely. It is printed only once.");
