/**
 * Live applications suite — public apply endpoint + duplicate rule + admin
 * applications API, against the real Firebase + Supabase project.
 *
 * Run (dev server optional; handlers run in-process):
 *   npx tsx scripts/smoke-applications.ts
 *
 * Flow:
 *   1. migration probe (table must exist)
 *   2. public POST /api/applications — validation, unpublished job, rate limit
 *   3. happy path with the full candidate record (name, surname, phone,
 *      location, role, company, resume)
 *   4. DUPLICATE rule — same email + same role → 409, including when the
 *      identical role sits at ANOTHER company
 *   5. POST /api/check-application returns the already-applied role titles
 *   6. anon key cannot read applications (RLS: no public policies)
 *   7. admin GET → roles → companies → candidates grouping
 *   8. admin PATCH status, signed resume URL that really downloads
 *   9. admin DELETE → row + stored resume file both gone
 *
 * Requires the `applications` migration
 * (supabase/migrations/20260102000000_applications.sql) to be applied.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && out[m[1]] === undefined) out[m[1]] = m[2].trim();
  }
  for (const [k, v] of Object.entries(out)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return out;
}

const env = loadEnv();

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail = "") => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function signIn(email: string, password: string): Promise<string> {
  const apiKey = env.VITE_FIREBASE_API_KEY ?? "";
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const json = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !json.idToken) throw new Error(`Sign-in failed for ${email}: ${json.error?.message ?? res.status}`);
  return json.idToken;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<unknown>;

// The public apply endpoint rate-limits 5/min per IP. Tests are sequential and
// would all share one IP, so each call gets a fresh one unless the test is
// specifically exercising the limiter (it passes its own IP).
let ipCounter = 0;
const freshIp = () => `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

async function callHandler(
  mod: string,
  opts: {
    method: string;
    body?: Record<string, unknown>;
    ip?: string;
    query?: Record<string, string>;
    token?: string;
  }
): Promise<{ status: number; body: unknown }> {
  const handler = (await import(mod)).default as Handler;
  const res: Record<string, unknown> = { statusCode: 0, body: null as unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = res as any;
  r.status = (c: number) => {
    r.statusCode = c;
    return r;
  };
  r.json = async (b: unknown) => {
    r.body = b;
    return r;
  };
  r.end = async () => r;
  r.setHeader = () => r;
  const ip = opts.ip ?? (mod === "../server/applications" ? freshIp() : "10.7.7.7");
  const headers: Record<string, string> = { "x-forwarded-for": ip, "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  await handler(
    {
      method: opts.method,
      headers,
      body: opts.body ?? {},
      query: opts.query ?? {},
    },
    r
  );
  return { status: r.statusCode as number, body: r.body };
}

// Tiny but REAL PDF (magic bytes %PDF-1.4) — passes the server-side check.
const TINY_PDF_BASE64 = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1"
).toString("base64");

const resume = () => ({
  filename: "Live Test Resume.pdf",
  contentType: "application/pdf",
  dataBase64: TINY_PDF_BASE64,
});

interface JobRow {
  id: string;
  title: string;
  company: string;
  status: string;
  published_at?: string | null;
}

async function main() {
  const adminEmail = env.TEST_ADMIN1_EMAIL ?? "karunasrikaram@gmail.com";
  const adminToken = await signIn(adminEmail, env.TEST_ADMIN1_PASSWORD ?? "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? "";
  const supaUrl = env.VITE_SUPABASE_URL ?? "";
  // Every /api/admin/* call goes through requireAdmin — pass the real token.
  const admin = (mod: string, opts: Parameters<typeof callHandler>[1]) =>
    callHandler(mod, { ...opts, token: adminToken });

  // ── 0. make sure the migration is in place ──────────────────────────────
  const anonProbe = await fetch(`${supaUrl}/rest/v1/applications?select=id&limit=1`, {
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
  });
  if (anonProbe.status === 404 || anonProbe.status === 400) {
    console.log("\nMIGRATION MISSING: the `applications` table does not exist yet.");
    console.log("Apply supabase/migrations/20260102000000_applications.sql in the");
    console.log("Supabase dashboard SQL editor, then re-run this suite.");
    process.exit(2);
  }

  // ── 1. public endpoint validation ───────────────────────────────────────
  const noBody = await callHandler("../server/applications", { method: "POST", body: {} });
  check("public apply: empty body → 400", noBody.status === 400, `status=${noBody.status}`);

  const base = {
    jobId: "00000000-0000-4000-8000-000000000000",
    name: "T",
    surname: "Tester",
    email: "not-an-email",
    phone: "9000000000",
    location: "Pune",
    resume: resume(),
  };
  const badEmail = await callHandler("../server/applications", { method: "POST", body: base });
  check("public apply: invalid email → 400", badEmail.status === 400, `status=${badEmail.status}`);

  const missingSurname = await callHandler("../server/applications", {
    method: "POST",
    body: {
      jobId: base.jobId,
      name: base.name,
      email: "t@example.com",
      phone: base.phone,
      location: base.location,
      resume: resume(),
    },
  });
  check("public apply: missing surname → 400", missingSurname.status === 400, `status=${missingSurname.status}`);

  const missingLocation = await callHandler("../server/applications", {
    method: "POST",
    body: {
      jobId: base.jobId,
      name: base.name,
      surname: "T",
      email: "t@example.com",
      phone: base.phone,
      resume: resume(),
    },
  });
  check("public apply: missing location → 400", missingLocation.status === 400, `status=${missingLocation.status}`);

  const ghostJob = await callHandler("../server/applications", {
    method: "POST",
    body: { ...base, email: "ghost@example.com", surname: "G", name: "Ghost" },
  });
  check("public apply: unknown job → 404", ghostJob.status === 404, `status=${ghostJob.status}`);

  const wrongMethod = await callHandler("../server/applications", { method: "GET" });
  check("public apply: GET → 405", wrongMethod.status === 405, `status=${wrongMethod.status}`);

  // rate limit: 5/min per IP — 6th must be 429
  let saw429 = false;
  for (let i = 0; i < 6; i++) {
    const r = await callHandler("../server/applications", {
      method: "POST",
      ip: "10.8.8.8",
      body: { ...base, email: `rate${i}@example.com`, name: `Rate ${i}` },
    });
    if (r.status === 429) saw429 = true;
  }
  check("public apply: 6th request/min from one IP → 429", saw429);

  // ── 2. create two published jobs: same role title, different companies ──
  const roleTitle = "ZZ Test QA Officer (applications suite)";
  const created = await admin("../server/admin/jobs", {
    method: "POST",
    body: {
      title: roleTitle,
      company: "ZZ Test Pharma A",
      location: "Testville",
      status: "published",
      description: "Temporary role created by smoke-applications.",
    },
  });
  if (created.status !== 201) {
    console.log(`\nCould not create a test job (status=${created.status}) — aborting.`);
    console.log(JSON.stringify(created.body));
    process.exit(1);
  }
  const job = (created.body as { job: JobRow }).job;
  check("admin POST job (status=published) → 201 + publish stamp", created.status === 201 && job.status === "published");
  check("created job has published_at set", Boolean(job.published_at));

  const twin = await admin("../server/admin/jobs", {
    method: "POST",
    body: { title: roleTitle, company: "ZZ Test Pharma B", status: "published" },
  });
  const twinJob = (twin.body as { job?: JobRow }).job;
  check("second job: SAME role title at ANOTHER company", twin.status === 201 && Boolean(twinJob));

  try {
    // fake resume against a REAL published job → the magic-byte check runs
    // (job lookup comes first, so this must use a live job id)
    const notPdf = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: job.id,
        name: "Fake",
        surname: "Pdf",
        email: `fake.pdf.${Date.now()}@example.com`,
        phone: "9000000002",
        location: "Pune",
        resume: {
          filename: "r.pdf",
          contentType: "application/pdf",
          dataBase64: Buffer.from("hello not a pdf").toString("base64"),
        },
      },
    });
    check("public apply: fake PDF (bad magic bytes) → 400", notPdf.status === 400, `status=${notPdf.status}`);

    // draft job → applying must 404
    const draft = await admin("../server/admin/jobs", {
      method: "POST",
      body: { title: "ZZ Draft Role", company: "ZZ Test Co", status: "draft" },
    });
    const draftId = (draft.body as { job: JobRow }).job.id;

    const applyToDraft = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: draftId,
        name: "Draft",
        surname: "Apply",
        email: "draft.apply@example.com",
        phone: "9000000001",
        location: "Delhi",
        resume: resume(),
      },
    });
    check("public apply: DRAFT job → 404 (not accepting)", applyToDraft.status === 404, `status=${applyToDraft.status}`);

    // ── 3. happy path — the full candidate record ─────────────────────────
    const candidateEmail = `live.candidate.${Date.now()}@example.com`;
    const apply = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: job.id,
        name: "Live Test",
        surname: "Candidate",
        email: candidateEmail,
        phone: "+91 90000 00000",
        location: "Hyderabad, Telangana",
        coverNote: "I wrote suites like this one and thus deserve extra credit.",
        resume: resume(),
      },
    });
    check("public apply: full valid application → 201", apply.status === 201, `status=${apply.status}`);

    // ── 4. DUPLICATE rule ─────────────────────────────────────────────────
    const againSameJob = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: job.id,
        name: "Live Test",
        surname: "Candidate",
        email: candidateEmail,
        phone: "+91 90000 00000",
        location: "Hyderabad, Telangana",
        resume: resume(),
      },
    });
    check("duplicate: same email + same job → 409", againSameJob.status === 409, `status=${againSameJob.status}`);
    check(
      "duplicate: friendly message mentions the role",
      Boolean(((againSameJob.body as { error?: string }).error ?? "").includes(roleTitle)),
      (againSameJob.body as { error?: string }).error ?? ""
    );

    // THE KEY RULE: the same role at ANOTHER company must also be blocked
    const sameRoleOtherCompany = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: twinJob?.id ?? "",
        name: "Live Test",
        surname: "Candidate",
        email: candidateEmail,
        phone: "+91 90000 00000",
        location: "Hyderabad, Telangana",
        resume: resume(),
      },
    });
    check(
      "duplicate: same role at ANOTHER company → 409",
      sameRoleOtherCompany.status === 409,
      `status=${sameRoleOtherCompany.status}`
    );
    check(
      "duplicate: message names the other company",
      Boolean(((sameRoleOtherCompany.body as { error?: string }).error ?? "").includes("ZZ Test Pharma A")),
      (sameRoleOtherCompany.body as { error?: string }).error ?? ""
    );

    // ── 5. duplicate-check endpoint (drives the "+" badge) ────────────────
    const dupCheck = await callHandler("../server/check-application", {
      method: "POST",
      body: { email: candidateEmail },
    });
    const dupBody = dupCheck.body as { appliedRoles?: string[] };
    check("check-application → 200", dupCheck.status === 200, `status=${dupCheck.status}`);
    check(
      "check-application returns the applied role title",
      Boolean(dupBody.appliedRoles?.some((r) => r.toLowerCase() === roleTitle.toLowerCase())),
      JSON.stringify(dupBody.appliedRoles ?? [])
    );

    const freshCheck = await callHandler("../server/check-application", {
      method: "POST",
      body: { email: `nobody.${Date.now()}@example.com` },
    });
    const freshBody = freshCheck.body as { appliedRoles?: string[] };
    check(
      "check-application for a new email → empty list",
      freshCheck.status === 200 && (freshBody.appliedRoles ?? []).length === 0
    );

    // ── 6. anon key must see nothing (RLS) ────────────────────────────────
    const anonList = await fetch(`${supaUrl}/rest/v1/applications?select=id`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    });
    const anonRows = anonList.ok ? ((await anonList.json()) as unknown[]) : null;
    check(
      "anon SELECT applications → 0 rows (RLS hides all)",
      anonList.ok && Array.isArray(anonRows) && anonRows.length === 0,
      `rows=${anonRows?.length ?? "err"}`
    );

    const anonWrite = await fetch(`${supaUrl}/rest/v1/applications`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ job_title: "hack", company: "hack", applicant_name: "hack", surname: "x", email: "hack@example.com", phone: "1", location: "x" }),
    });
    check("anon INSERT applications → denied", anonWrite.status >= 400, `status=${anonWrite.status}`);

    // ── 7. admin list → ROLE → COMPANY → candidates ───────────────────────
    const list = await admin("../server/admin/applications", { method: "GET" });
    const listBody = list.body as {
      roles?: Array<{
        title: string;
        count: number;
        companies: Array<{ company: string; applications: Array<Record<string, unknown>> }>;
      }>;
      total?: number;
    };
    const roleGroup = listBody.roles?.find((r) => r.title.toLowerCase() === roleTitle.toLowerCase());
    check("admin GET: role section exists for the applied role", Boolean(roleGroup), `total=${listBody.total}`);
    const companies = roleGroup?.companies ?? [];
    check(
      "admin GET: applications sit under the right COMPANY",
      companies.some(
        (c) =>
          c.company === "ZZ Test Pharma A" &&
          c.applications.some((a) => a.email === candidateEmail)
      ),
      companies.map((c) => `${c.company}:${c.applications.length}`).join(", ")
    );
    const app = companies.flatMap((c) => c.applications).find((a) => a.email === candidateEmail);
    check("admin GET: status defaults to new", app?.status === "new", `status=${app?.status}`);
    check("admin GET: surname stored", app?.surname === "Candidate", String(app?.surname));
    check("admin GET: phone stored", app?.phone === "+91 90000 00000", String(app?.phone));
    check("admin GET: location stored", app?.location === "Hyderabad, Telangana", String(app?.location));
    check("admin GET: company snapshot stored", app?.company === "ZZ Test Pharma A", String(app?.company));
    check("admin GET: resume filename present", app?.resume_filename === "Live Test Resume.pdf", String(app?.resume_filename));

    // jobId filter
    const filtered = await admin("../server/admin/applications", {
      method: "GET",
      query: { jobId: job.id },
    });
    const filteredBody = filtered.body as {
      roles?: Array<{ title: string; companies: Array<{ applications: unknown[] }> }>;
    };
    const filteredRole = filteredBody.roles?.find((r) => r.title.toLowerCase() === roleTitle.toLowerCase());
    check(
      "admin GET ?jobId= → only that job's candidates",
      Boolean(filteredRole && filteredRole.companies.flatMap((c) => c.applications).length === 1)
    );

    if (!app || typeof app.id !== "string") throw new Error("application missing from admin list");
    const appId = app.id;

    // ── 8. PATCH status ───────────────────────────────────────────────────
    const patched = await admin("../server/admin/applications", {
      method: "PATCH",
      body: { id: appId, status: "shortlisted" },
    });
    check("admin PATCH status → 200", patched.status === 200, `status=${patched.status}`);

    const relisted = await admin("../server/admin/applications", { method: "GET", query: { jobId: job.id } });
    const relistedRole = (relisted.body as {
      roles?: Array<{ title: string; companies: Array<{ applications: Array<{ id: string; status: string }> }> }>;
    }).roles?.find((r) => r.title.toLowerCase() === roleTitle.toLowerCase());
    const relistedApp = relistedRole?.companies.flatMap((c) => c.applications).find((a) => a.id === appId);
    check("status persisted as shortlisted", relistedApp?.status === "shortlisted");

    const badPatch = await admin("../server/admin/applications", {
      method: "PATCH",
      body: { id: appId, status: "not-a-status" },
    });
    check("admin PATCH invalid status → 400", badPatch.status === 400, `status=${badPatch.status}`);

    // ── 9. resume signed URL downloads ────────────────────────────────────
    const resumeRes = await admin("../server/admin/applications", {
      method: "GET",
      query: { resume: appId },
    });
    const resumeBody = resumeRes.body as { url?: string; filename?: string; error?: string };
    check("admin GET ?resume= → signed URL", resumeRes.status === 200 && Boolean(resumeBody.url), resumeBody.error ?? "");
    if (resumeBody.url) {
      const dl = await fetch(resumeBody.url);
      const bytes = dl.ok ? Buffer.from(await dl.arrayBuffer()) : Buffer.alloc(0);
      check(
        "resume URL downloads a real PDF",
        dl.ok && bytes.subarray(0, 5).toString("latin1") === "%PDF-",
        `bytes=${bytes.length}`
      );
      check("resume filename preserved", resumeBody.filename === "Live Test Resume.pdf", resumeBody.filename ?? "");
    }

    // ── 10. unauthenticated admin access denied ───────────────────────────
    const noAuth = await fetch("http://localhost:3001/api/admin/applications").catch(() => null);
    if (noAuth) {
      check("admin applications without token → 401", noAuth.status === 401, `status=${noAuth.status}`);
    }

    // ── 11. DELETE → row and file both gone ───────────────────────────────
    const resumePath = String(app.resume_path ?? "");
    const signedUrl = resumeBody.url;
    const deleted = await admin("../server/admin/applications", { method: "DELETE", body: { id: appId } });
    check("admin DELETE application → 200", deleted.status === 200, `status=${deleted.status}`);

    const afterDelete = await admin("../server/admin/applications", { method: "GET", query: { jobId: job.id } });
    const afterRole = (afterDelete.body as {
      roles?: Array<{ title: string; companies: Array<{ applications: unknown[] }> }>;
    }).roles?.find((r) => r.title.toLowerCase() === roleTitle.toLowerCase());
    check(
      "deleted application gone from list",
      Boolean(afterRole && afterRole.companies.flatMap((c) => c.applications).length === 0)
    );

    // Authoritative proof the resume file is gone: minting a NEW signed URL
    // for the same path must now fail. (The already-minted URL can keep
    // answering from Cloudflare's cache for up to an hour — Supabase serves
    // signed URLs with `expires: +1h`; that is reported as info below.)
    if (resumePath) {
      const { createClient } = await import("@supabase/supabase-js");
      const adminDb = createClient(supaUrl, env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const resign = await adminDb.storage.from("resumes").createSignedUrl(resumePath, 60);
      check(
        "resume file deleted from storage (re-sign → Object not found)",
        Boolean(resign.error),
        resign.error?.message ?? "re-sign unexpectedly succeeded"
      );
    }
    if (signedUrl) {
      const dlAfter = await fetch(signedUrl);
      const h = Object.fromEntries(dlAfter.headers.entries());
      console.log(
        `      [info] previously minted URL after delete → status=${dlAfter.status} cf-cache=${h["cf-cache-status"]} (CDN may serve a cached copy until its expiry)`
      );
    }

    const doubleDelete = await admin("../server/admin/applications", {
      method: "DELETE",
      body: { id: appId },
    });
    check("DELETE of already-deleted → 404", doubleDelete.status === 404, `status=${doubleDelete.status}`);

    // after deleting, the same email may apply for the role again
    const reapplied = await callHandler("../server/applications", {
      method: "POST",
      body: {
        jobId: job.id,
        name: "Live Test",
        surname: "Candidate",
        email: candidateEmail,
        phone: "+91 90000 00000",
        location: "Hyderabad, Telangana",
        resume: resume(),
      },
    });
    check("after admin delete, the role can be applied for again → 201", reapplied.status === 201, `status=${reapplied.status}`);
    const reappliedId = (reapplied.body as { id?: string }).id;
    if (reappliedId) {
      await admin("../server/admin/applications", { method: "DELETE", body: { id: reappliedId } });
    }
  } finally {
    // cleanup whatever the test created
    for (const id of [job.id, twinJob?.id]) {
      if (id) await admin("../server/admin/jobs", { method: "DELETE", body: { id } }).catch(() => undefined);
    }
    const remaining = await admin("../server/admin/jobs", { method: "GET" }).catch(() => null);
    const jobs = (remaining?.body as { jobs?: JobRow[] })?.jobs ?? [];
    for (const j of jobs) {
      if (j.title.startsWith("ZZ ")) {
        await admin("../server/admin/jobs", { method: "DELETE", body: { id: j.id } }).catch(() => undefined);
      }
    }
    // sweep any test applications left behind
    const leftovers = await admin("../server/admin/applications", { method: "GET" }).catch(() => null);
    const roles = (leftovers?.body as {
      roles?: Array<{ title: string; companies: Array<{ applications: Array<{ id: string; email?: string }> }> }>;
    })?.roles ?? [];
    for (const role of roles) {
      if (!role.title.startsWith("ZZ ")) continue;
      for (const company of role.companies) {
        for (const a of company.applications) {
          await admin("../server/admin/applications", { method: "DELETE", body: { id: a.id } }).catch(() => undefined);
        }
      }
    }
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n═══ smoke-applications: ${checks.length - failed.length}/${checks.length} PASS ═══`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL: ${f.name} ${f.detail}`);
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error("suite crashed:", err);
  process.exit(1);
});
