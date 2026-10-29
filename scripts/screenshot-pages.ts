/** Capture screenshots of every public page for visual review. */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

const BASE = "http://localhost:5173";
const OUT = resolve(process.cwd(), ".screenshots");

const PAGES = [
  { path: "/", name: "home" },
  { path: "/jobs", name: "jobs" },
  { path: "/jobs/sample-qa-senior", name: "job-detail" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
  { path: "/privacy", name: "privacy" },
  { path: "/disclaimer", name: "disclaimer" },
  { path: "/admin/login", name: "admin-login" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console@${page.url()}: ${m.text()}`);
  });

  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(OUT, `${p.name}.png`), fullPage: true });
    process.stdout.write(`captured ${p.name}\n`);
  }

  if (errors.length) {
    process.stdout.write(`\nPAGE ERRORS (${errors.length}):\n${errors.join("\n")}\n`);
  } else {
    process.stdout.write("\nno page/console errors\n");
  }
  await browser.close();
}

void main().catch((err) => {
  process.stdout.write(`ERROR ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
