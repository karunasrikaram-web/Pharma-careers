/**
 * Executable checks for the server-side admin email allowlist.
 * Run: npx tsx scripts/smoke-allowlist.ts
 */
import {
  enforceAdminAllowlist,
  getAllowedAdminEmails,
  isEmailAllowed,
} from "../api/_lib/auth";

const EMAIL_A = "karunasrikaram@gmail.com";
const EMAIL_B = "kothapallyhrishikesh3@gmail.com";
const OUTSIDER = "someone-else@example.com";

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];

function check(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
}

function ok(email: string) {
  return { ok: true as const, uid: "uid-1", email, admin: true as const };
}

async function main() {
  const originalEmails = process.env.ADMIN_EMAILS;
  const originalNodeEnv = process.env.NODE_ENV;

  // ── 1. Allowlist configured with the two admin addresses ──────────────
  process.env.ADMIN_EMAILS = `${EMAIL_A}, ${EMAIL_B}`;
  check(
    "ADMIN_EMAILS parsed to exactly 2 entries",
    getAllowedAdminEmails().length === 2,
    JSON.stringify(getAllowedAdminEmails())
  );
  check("configured address A allowed", isEmailAllowed(EMAIL_A), EMAIL_A);
  check("configured address B allowed", isEmailAllowed(EMAIL_B), EMAIL_B);
  check(
    "matching is case-insensitive",
    isEmailAllowed(EMAIL_A.toUpperCase()),
    EMAIL_A.toUpperCase()
  );
  check("address outside the allowlist denied", !isEmailAllowed(OUTSIDER), OUTSIDER);

  const denied = enforceAdminAllowlist(ok(OUTSIDER));
  check(
    "valid admin outside allowlist → 403",
    !denied.ok && denied.status === 403 && denied.reason === "forbidden",
    JSON.stringify(denied)
  );

  const allowed = enforceAdminAllowlist(ok(EMAIL_A));
  check(
    "allowlisted admin passes through unchanged",
    allowed.ok && allowed.email === EMAIL_A,
    JSON.stringify(allowed)
  );

  const notAdmin = enforceAdminAllowlist({ ok: false, status: 403, reason: "forbidden" });
  check(
    "existing failures are not overwritten",
    !notAdmin.ok && notAdmin.status === 403,
    JSON.stringify(notAdmin)
  );

  const unauthenticated = enforceAdminAllowlist({ ok: false, status: 401, reason: "missing" });
  check(
    "401 stays 401 (allowlist never upgrades an auth failure)",
    !unauthenticated.ok && unauthenticated.status === 401,
    JSON.stringify(unauthenticated)
  );

  // ── 2. Allowlist empty + production → fail closed ─────────────────────
  delete process.env.ADMIN_EMAILS;
  process.env.NODE_ENV = "production";
  check(
    "production with empty allowlist → deny (fail closed)",
    !isEmailAllowed(EMAIL_A),
    "NODE_ENV=production, ADMIN_EMAILS unset"
  );
  check(
    "production deny is a 403, not a 401",
    (() => {
      const r = enforceAdminAllowlist(ok(EMAIL_A));
      return !r.ok && r.status === 403;
    })(),
    JSON.stringify(enforceAdminAllowlist(ok(EMAIL_A)))
  );

  // ── 3. Allowlist empty + development → claim-only ─────────────────────
  process.env.NODE_ENV = "development";
  check(
    "development with empty allowlist → claim-only (dev ergonomics)",
    isEmailAllowed(EMAIL_A),
    "NODE_ENV=development, ADMIN_EMAILS unset"
  );

  // ── restore ───────────────────────────────────────────────────────────
  if (originalEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalEmails;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  // ── report ────────────────────────────────────────────────────────────
  let failed = 0;
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    if (!c.pass) failed += 1;
    process.stdout.write(`${mark}  ${c.name}  [${c.detail}]\n`);
  }
  process.stdout.write(`\n${checks.length - failed}/${checks.length} checks passed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
