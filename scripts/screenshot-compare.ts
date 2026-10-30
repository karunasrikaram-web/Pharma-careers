/**
 * Screenshot the reference site and the local site for a visual theme
 * comparison (full page, desktop viewport).
 *
 * Run: npx tsx scripts/screenshot-compare.ts
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

const OUT = resolve(process.cwd(), ".screenshots", "theme-compare");

const TARGETS: Array<{ name: string; url: string }> = [
  { name: "reference-home", url: "https://pharma-careers.ai.studio/" },
  { name: "reference-jobs", url: "https://pharma-careers.ai.studio/jobs" },
  { name: "local-home", url: "http://localhost:5173/" },
  { name: "local-jobs", url: "http://localhost:5173/jobs" },
  { name: "local-apply", url: "http://localhost:5173/apply" },
  { name: "local-job-detail", url: "http://localhost:5173/jobs/sample-qa-senior" },
  { name: "local-about", url: "http://localhost:5173/about" },
  { name: "local-contact", url: "http://localhost:5173/contact" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  for (const t of TARGETS) {
    try {
      await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(1500);
      const file = resolve(OUT, `${t.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`OK   ${t.name} -> ${file}`);
    } catch (err) {
      console.log(`FAIL ${t.name}: ${String(err).slice(0, 160)}`);
    }
  }

  await browser.close();
}

void main();
