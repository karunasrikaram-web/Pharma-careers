/**
 * Headless check that /admin/dashboard lands on the login form without a
 * redirect loop, and that API calls through the Vite proxy return expected
 * statuses (401 when signed out — never 500).
 *
 * Run with the dev server up: npx tsx scripts/check-admin-page.ts
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const navigations: string[] = [];
  const errors: string[] = [];
  const apiStatuses: string[] = [];

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname);
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("response", (res) => {
    if (res.url().includes("/api/")) apiStatuses.push(`${new URL(res.url()).pathname}:${res.status()}`);
  });

  await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const finalPath = new URL(page.url()).pathname;
  const loginFormFields = await page.locator("input[type=password]").count();

  console.log("FINAL_PATH:", finalPath);
  console.log("LOGIN_FORM_FIELDS:", loginFormFields);
  console.log("NAV_COUNT:", navigations.length, navigations.length <= 4 ? "(OK — no loop)" : "(LOOP!)");
  console.log("NAV_CHAIN:", navigations.slice(0, 8).join(" -> "));
  console.log("API_STATUSES:", apiStatuses.slice(0, 10).join(", ") || "none");
  console.log("JS_ERRORS:", errors.length === 0 ? "none" : errors.join(" | "));

  const passed =
    finalPath === "/admin/login" &&
    loginFormFields === 1 &&
    navigations.length <= 4 &&
    apiStatuses.every((s) => !s.endsWith(":500")) &&
    errors.length === 0;
  console.log(passed ? "RESULT: PASS" : "RESULT: FAIL");

  await browser.close();
  process.exit(passed ? 0 : 1);
}

void main();
