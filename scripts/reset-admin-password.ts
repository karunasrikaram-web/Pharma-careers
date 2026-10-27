import { randomBytes } from "node:crypto";
import { loadEnv } from "./env";
import { dbGet, dbRun } from "../src/lib/db";
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

async function main(): Promise<void> {
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

const existing = await dbGet<{ id: string }>("SELECT id FROM admins WHERE email = ?", [email]);

if (!existing) {
  console.error(`No administrator found for ${email}. Use admin:create instead.`);
  process.exit(1);
}

await dbRun("UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?", [
  hashPassword(password),
  new Date().toISOString(),
  existing.id,
]);
await dbRun("DELETE FROM sessions WHERE admin_id = ?", [existing.id]);

console.log("Administrator password reset. All existing sessions were signed out.");
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
}

main().catch((error) => {
  console.error("Failed to reset administrator password:", error);
  process.exitCode = 1;
});
