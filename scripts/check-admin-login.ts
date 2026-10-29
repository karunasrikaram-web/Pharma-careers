/**
 * Headless end-to-end: sign in at /admin/login with an admin account and
 * confirm /admin/dashboard renders. Proves the full local dev stack
 * (Vite + dev-api + Firebase + Supabase) works in a real browser.
 *
 * Credentials come from the environment so they never sit in this file.
 * Run with the dev server up:
 *   $env:TEST_ADMIN_EMAIL="..."; $env:TEST_ADMIN_PASSWORD="..."; npx tsx scripts/check-admin-login.ts
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.log("SKIP: set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD first.");
    process.exit(0);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors: string[] = [];
  const api500s: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("response", (res) => {
    if (res.url().includes("/api/") && res.status() >= 500) {
      api500s.push(`${new URL(res.url()).pathname}:${res.status()}`);
    }
  });

  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait for the dashboard to appear (URL change + heading)
  await page.waitForURL("**/admin/dashboard", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const finalPath = new URL(page.url()).pathname;
  const heading = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  const bodySnippet = (await page.locator("body").innerText().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");

  console.log("FINAL_PATH:", finalPath);
  console.log("DASHBOARD_H1:", heading.trim() || "(none)");
  console.log("BODY_SNIPPET:", bodySnippet);
  console.log("API_5XX:", api500s.length === 0 ? "none" : api500s.join(", "));
  console.log("JS_ERRORS:", errors.length === 0 ? "none" : errors.join(" | "));

  const passed =
    finalPath === "/admin/dashboard" &&
    api500s.length === 0 &&
    errors.length === 0 &&
    bodySnippet.length > 0;
  console.log(passed ? "RESULT: PASS (signed in, dashboard loaded)" : "RESULT: FAIL");

  await browser.close();
  process.exit(passed ? 0 : 1);
}

void main();
