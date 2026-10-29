/**
 * Headless end-to-end check of the whole console + apply flow:
 *   sign in → dashboard → create + publish a job via the UI →
 *   it appears on the public site → job page links to the Apply page →
 *   candidate fills the form (name, surname, phone, email, location, role,
 *   resume) and submits → application appears in the console under its ROLE
 *   and COMPANY → the same email is blocked from applying twice (+ badge) →
 *   everything created by the test is deleted again.
 *
 * Run with the dev server up:
 *   npx tsx scripts/check-console-ui.ts
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Load .env.local (gitignored) so the real admin credentials are available.
try {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
} catch {
  // no .env.local — rely on the process environment
}

const BASE = "http://localhost:5173";
const API = "http://localhost:3001";
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? "karunasrikaram@gmail.com";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_ADMIN1_PASSWORD ?? "";

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
const record = (name: string, pass: boolean, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function main() {
  if (!PASSWORD) {
    console.log("SKIP: no TEST_ADMIN_PASSWORD in environment/.env.local");
    process.exit(0);
  }

  // A real (tiny) PDF so the file input accepts it.
  const dir = resolve(process.cwd(), ".screenshots");
  mkdirSync(dir, { recursive: true });
  const resumePath = resolve(dir, "e2e-resume.pdf");
  writeFileSync(
    resumePath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
      "latin1"
    )
  );

  const stamp = Date.now();
  const title = `E2E Console QA ${stamp}`;
  const candidateEmail = `e2e.visitor.${stamp}@example.com`;

  // admin identity, reused for API cleanup at the end
  let idToken = "";
  try {
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY ?? ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
      }
    );
    const json = (await signInRes.json()) as { idToken?: string };
    idToken = json.idToken ?? "";
  } catch {
    // cleanup will be skipped
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const jsErrors: string[] = [];
  page.on("pageerror", (e) => jsErrors.push(String(e)));

  try {
    // ── sign in ───────────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/admin/dashboard", { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    record("sign in → console dashboard", true);

    // ── dashboard renders with stats + nav ────────────────────────────────
    await page.waitForTimeout(1200);
    const dashH1 = (await page.locator("h1").first().textContent()) ?? "";
    record("dashboard heading", dashH1.includes("Admin dashboard"), dashH1.trim());
    const navText = await page.locator("nav").textContent();
    record(
      "sidebar nav has Jobs + Applications",
      Boolean(navText?.includes("Jobs") && navText?.includes("Applications")),
      navText?.replace(/\s+/g, " ").slice(0, 80) ?? ""
    );

    // ── jobs page: create a job through the form ──────────────────────────
    await page.goto(`${BASE}/admin/jobs`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "+ New job" }).click();
    await page.getByPlaceholder("Senior QA Officer").fill(title);
    await page.getByPlaceholder("Sunrise Biotech Ltd").fill("E2E Test Pharma");
    await page.getByPlaceholder("Hyderabad, Telangana").fill("Pune, Maharashtra");
    await page.locator("select").first().selectOption("hybrid"); // work model
    const statusSelect = page.locator("form select").last();
    await statusSelect.selectOption("published");
    await page.getByRole("button", { name: "Save job" }).click();
    let created = false;
    try {
      await page.getByText(title).first().waitFor({ state: "visible", timeout: 8000 });
      created = true;
    } catch {
      created = false;
    }
    record("create + publish job via UI", created);

    // ── public site shows it ──────────────────────────────────────────────
    await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const onPublic = await page.getByText(title).first().isVisible().catch(() => false);
    record("published job appears on public /jobs", onPublic);

    // ── job page links to the Apply page (no login anywhere) ─────────────
    if (onPublic) {
      await page.getByText(title).first().click();
      await page.waitForURL("**/jobs/**", { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);

      const applyCta = page.getByRole("link", { name: "Apply for this role" });
      const ctaVisible = await applyCta.isVisible().catch(() => false);
      record("job page shows 'Apply for this role' button", ctaVisible);
      const loginOnJobPage = await page.getByText(/sign in|log in|password/i).first().isVisible().catch(() => false);
      record("no login prompt on the job page", !loginOnJobPage);

      if (ctaVisible) {
        await applyCta.click();
        await page.waitForURL("**/apply**", { timeout: 10000 });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        record("Apply page opens with role pre-selected", page.url().includes("?job="), page.url());

        const roleSelect = page.locator("#ap-role");
        const preselected = (await roleSelect.inputValue().catch(() => "")) !== "";
        record("role dropdown pre-filled from the job", preselected);

        // validation first: submit the empty form → friendly error, no crash
        await page.getByRole("button", { name: "Submit application" }).click();
        await page.waitForTimeout(500);
        const validationShown = await page
          .getByText(/Please enter your name and surname/i)
          .first()
          .isVisible()
          .catch(() => false);
        record("apply form validates empty fields", validationShown);

        // fill the candidate record and submit for real
        await page.locator("#ap-name").fill("E2E");
        await page.locator("#ap-surname").fill("Visitor");
        await page.locator("#ap-email").fill(candidateEmail);
        await page.locator("#ap-phone").fill("9876543210");
        await page.locator("#ap-location").fill("Pune, Maharashtra");
        await page.locator("#ap-resume").setInputFiles(resumePath);
        await page.getByRole("button", { name: "Submit application" }).click();
        await page.waitForTimeout(3000);
        const success = await page
          .getByText(/Application submitted/i)
          .first()
          .isVisible()
          .catch(() => false);
        record("candidate application submitted", success);
      }
    }

    // ── console shows it under ROLE and COMPANY ───────────────────────────
    await page.goto(`${BASE}/admin/applications`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const appsH1 = (await page.locator("h1").first().textContent()) ?? "";
    record("applications page heading", appsH1.includes("Applications"), appsH1.trim());

    const roleSection = await page.getByText(title, { exact: false }).first().isVisible().catch(() => false);
    record("application grouped under its ROLE", roleSection);
    const companySection = await page.getByText("E2E Test Pharma", { exact: false }).first().isVisible().catch(() => false);
    record("application grouped under its COMPANY", companySection);
    const fullName = await page.getByText("E2E Visitor", { exact: false }).first().isVisible().catch(() => false);
    record("candidate full name (name + surname) shown", fullName);
    const phoneShown = await page.getByText("9876543210", { exact: false }).first().isVisible().catch(() => false);
    record("candidate phone shown", phoneShown);
    const locationShown = await page.getByText("Pune, Maharashtra", { exact: false }).first().isVisible().catch(() => false);
    record("candidate location shown", locationShown);
    const resumeBtn = await page.getByRole("button", { name: /Resume/i }).first().isVisible().catch(() => false);
    record("resume button visible for the admin", resumeBtn);

    // ── duplicate: the same email cannot apply for the same role again ────
    await page.goto(`${BASE}/apply`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.locator("#ap-email").fill(candidateEmail);
    await page.waitForTimeout(1500); // debounce for the duplicate check
    const roleOptions = await page.locator("#ap-role option").allTextContents();
    const markedApplied = roleOptions.some((o) => o.includes("already applied"));
    record('roles already applied for show the "+" already-applied marker', markedApplied, roleOptions.join(" | ").slice(0, 160));

    // try to submit the same role again → blocked with a clear message
    await page.locator("#ap-name").fill("E2E");
    await page.locator("#ap-surname").fill("Visitor");
    await page.locator("#ap-phone").fill("9876543210");
    await page.locator("#ap-location").fill("Pune, Maharashtra");
    const optionValues = await page.locator("#ap-role option").evaluateAll((opts) =>
      opts.map((o) => ({
        value: (o as HTMLOptionElement).value,
        text: o.textContent ?? "",
      }))
    );
    const target = optionValues.find((o) => o.value && o.text.includes("E2E Test Pharma"));
    if (target) await page.locator("#ap-role").selectOption(target.value);
    await page.locator("#ap-resume").setInputFiles(resumePath);
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Submit application" }).click();
    await page.waitForTimeout(2000);
    const blocked = await page
      .getByText(/already applied/i)
      .first()
      .isVisible()
      .catch(() => false);
    record("second application for the same role is blocked", blocked);

    record("no JS errors during console tour", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  } finally {
    // ── cleanup: delete the test application(s) and job via the API ───────
    try {
      if (idToken) {
        const listRes = await fetch(`${API}/api/admin/applications`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const listJson = (await listRes.json()) as {
          roles?: Array<{ title: string; companies: Array<{ applications: Array<{ id: string; email: string }> }> }>;
        };
        for (const role of listJson.roles ?? []) {
          for (const company of role.companies) {
            for (const app of company.applications) {
              if (app.email === candidateEmail) {
                await fetch(`${API}/api/admin/applications`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ id: app.id }),
                });
              }
            }
          }
        }

        const jobsRes = await fetch(`${API}/api/admin/jobs`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const jobsJson = (await jobsRes.json()) as { jobs?: Array<{ id: string; title: string }> };
        for (const j of jobsJson.jobs ?? []) {
          if (j.title.startsWith("E2E Console QA") || j.title.startsWith("ZZ ")) {
            await fetch(`${API}/api/admin/jobs`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ id: j.id }),
            });
          }
        }
        console.log("cleanup: test application + job deleted via admin API");
      }
    } catch (err) {
      console.log("cleanup warning:", String(err));
    }
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n═══ check-console-ui: ${results.length - failed.length}/${results.length} PASS ═══`);
  process.exit(failed.length ? 1 : 0);
}

void main().catch((err) => {
  console.error("check crashed:", err);
  process.exit(1);
});
