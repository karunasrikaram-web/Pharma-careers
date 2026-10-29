/**
 * Browser test for the /admin/login reset + sign-in UX (real Chromium, real Firebase).
 * Run: npx tsx scripts/test-login-ui.ts   (dev server must be running on :5173)
 *
 * Verifies:
 *   1. "Forgot password?" for an EXISTING admin email → the exact neutral message.
 *   2. 60s cooldown: submit button disabled with a countdown that actually ticks down.
 *   3. "Forgot password?" for a NON-EXISTING email → byte-identical neutral message.
 *   4. Wrong password on sign-in → generic "Invalid email or password."
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { resolve } from "path";

const BASE = process.env.UI_BASE_URL ?? "http://localhost:5173";
const NEUTRAL = "If an account exists for this email, a reset link has been sent.";

function env(key: string): string {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  return (text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1] ?? "").trim();
}

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

const countdownOf = (label: string): number => {
  const m = label.match(/Try again in (\d+)s/);
  return m ? Number(m[1]) : -1;
};

async function openForgotPage(page: import("playwright").Page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.locator("#email").waitFor();
}

async function submitReset(page: import("playwright").Page, email: string) {
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.getByText(NEUTRAL).waitFor({ timeout: 15000 });
  return (await page.getByText(NEUTRAL).innerText()).trim();
}

async function main() {
  const adminEmail = env("ADMIN_EMAILS").split(",")[0].trim();
  if (!adminEmail) throw new Error("ADMIN_EMAILS missing from .env.local");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // ── 1. existing admin email → neutral message ──────────────────────────
    await openForgotPage(page);
    const msgExisting = await submitReset(page, adminEmail);
    check(
      "existing email → exact neutral message",
      msgExisting === NEUTRAL,
      JSON.stringify(msgExisting)
    );

    // ── 2. 60s cooldown with a ticking countdown ───────────────────────────
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    const btn = page.getByRole("button", { name: /Try again in \d+s/ });
    await btn.waitFor({ timeout: 5000 });
    const disabledNow = await btn.isDisabled();
    const n1 = countdownOf(await btn.innerText());
    await page.waitForTimeout(3500);
    const n2 = countdownOf(await btn.innerText());
    check(
      "cooldown: submit disabled + countdown ticks down",
      disabledNow && n1 >= 55 && n1 <= 60 && n2 < n1 && n2 >= 0,
      `disabled=${disabledNow} n1=${n1} n2=${n2}`
    );

    // ── 3. non-existing email → byte-identical message (after reload) ──────
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await openForgotPage(page);
    const msgUnknown = await submitReset(page, "no-such-user-404@example.com");
    check(
      "non-existing email → identical neutral message",
      msgUnknown === msgExisting,
      JSON.stringify(msgUnknown)
    );

    // ── 4. wrong password → generic sign-in error ──────────────────────────
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.locator("#email").fill(adminEmail);
    await page.locator("#password").fill(`wrong-${Date.now()}`);
    await page.getByRole("button", { name: /Sign in|Sign in as admin/i }).click();
    const err = page.getByText("Invalid email or password.");
    await err.waitFor({ timeout: 15000 });
    check("wrong password → generic 'Invalid email or password.'", true, await err.innerText());
  } finally {
    await browser.close();
  }

  let failed = 0;
  for (const c of checks) {
    if (!c.pass) failed += 1;
    process.stdout.write(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]\n`);
  }
  process.stdout.write(`\n${checks.length - failed}/${checks.length} checks passed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((err) => {
  process.stdout.write(`ERROR ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
