/**
 * Verify the public (client-site) theme on every public route:
 * top contact bar, white header, lime CTA, light footer, no JS errors.
 * Admin routes are intentionally NOT touched by this check.
 *
 * Run: npx tsx scripts/check-public-theme.ts
 */
import { chromium } from "playwright";

const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";

const ROUTES: Array<{ path: string; expectH1: string }> = [
  { path: "/", expectH1: "Find your next pharma job." },
  { path: "/jobs", expectH1: "Every open role, in one list" },
  { path: "/jobs/sample-qa-senior", expectH1: "Senior QA Officer" },
  { path: "/apply", expectH1: "Apply for a role" },
  { path: "/about", expectH1: "Pharma careers, curated properly." },
  { path: "/contact", expectH1: "Get in touch" },
  { path: "/privacy", expectH1: "Privacy Policy" },
  { path: "/disclaimer", expectH1: "Disclaimer" },
];

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`PASS  ${label}${detail ? `  (${detail})` : ""}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${label}${detail ? `  (${detail})` : ""}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  let jsErrors: string[] = [];
  page.on("pageerror", (err) => jsErrors.push(String(err)));

  for (const route of ROUTES) {
    jsErrors = [];
    await page.goto(BASE + route.path, { waitUntil: "networkidle", timeout: 45000 });

    const info = await page.evaluate(() => {
      const topbar = document.querySelector<HTMLElement>(".topbar");
      const header = document.querySelector<HTMLElement>(".site-header");
      const cta = document.querySelector<HTMLElement>(".nav a.nav-cta");
      const footer = document.querySelector<HTMLElement>(".site-footer");
      const footerLinks = document.querySelectorAll(".footer-links a");
      const h1 = document.querySelector("h1");
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const topbarBg = topbar ? getComputedStyle(topbar).backgroundColor : null;
      const ctaBg = cta ? getComputedStyle(cta).backgroundColor : null;
      return {
        hasTopbar: Boolean(topbar),
        topbarBg,
        hasHeader: Boolean(header),
        hasCta: Boolean(cta),
        ctaBg,
        hasFooter: Boolean(footer),
        footerLinkCount: footerLinks.length,
        h1: h1?.textContent?.trim() ?? "",
        bodyBg,
        // admin console must NOT appear on public routes
        hasAdminSidebar: Boolean(document.querySelector("aside, [data-admin-shell]")),
      };
    });

    const name = route.path;
    check(`${name} top contact bar`, info.hasTopbar && info.topbarBg === "rgb(11, 61, 38)", info.topbarBg ?? "missing");
    check(`${name} white header`, info.hasHeader && info.bodyBg === "rgb(255, 255, 255)", info.bodyBg);
    check(
      `${name} lime Apply CTA`,
      info.hasCta && ["rgb(190, 242, 100)", "rgb(163, 230, 53)"].includes(info.ctaBg ?? ""),
      info.ctaBg ?? "missing"
    );
    check(`${name} light footer with links`, info.hasFooter && info.footerLinkCount === 4, `${info.footerLinkCount} links`);
    if (route.expectH1) {
      check(`${name} h1`, info.h1 === route.expectH1, info.h1.slice(0, 60));
    }
    check(`${name} no admin chrome`, !info.hasAdminSidebar);
    check(`${name} no JS errors`, jsErrors.length === 0, jsErrors[0]?.slice(0, 100) ?? "");
  }

  await browser.close();
  console.log(`\n═══ check-public-theme: ${pass}/${pass + fail} PASS ═══`);
  if (fail > 0) process.exit(1);
}

void main();
