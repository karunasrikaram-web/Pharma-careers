/**
 * End-to-end smoke suite for the reviews feature (public submit + admin
 * moderation), exercising the REAL handlers against the LIVE database.
 *
 * Flow:
 *   1. public POST  → 201 (stored pending)
 *   2. public GET   → does NOT include the pending review
 *   3. admin  GET   → includes it (pending)
 *   4. admin  PATCH → approve → 200
 *   5. public GET   → now includes it
 *   6. admin  PATCH → reject  → 200
 *   7. public GET   → hidden again
 *   8. admin  DELETE → 200, gone from admin list
 *   9. validation: bad rating → 400; PATCH unknown id → 404
 *
 * Run: npx tsx scripts/smoke-reviews.ts   (dev-api not required)
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

let ipCounter = 0;
const freshIp = () => `10.88.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

async function callHandler(
  mod: string,
  opts: {
    method: string;
    body?: Record<string, unknown>;
    ip?: string;
    query?: Record<string, string>;
    token?: string;
  }
): Promise<{ status: number; body: any }> {
  const handler = (await import(mod)).default as Handler;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = { statusCode: 0, body: null };
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
  const headers: Record<string, string> = {
    "x-forwarded-for": opts.ip ?? freshIp(),
    "content-type": "application/json",
  };
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

interface ReviewRow {
  id: string;
  name: string;
  rating: number;
  status: string;
}

const stamp = Date.now();

async function main() {
  const adminEmail = env.TEST_ADMIN1_EMAIL ?? "karunasrikaram@gmail.com";
  const adminToken = await signIn(adminEmail, env.TEST_ADMIN1_PASSWORD ?? "");
  const admin = (mod: string, opts: Parameters<typeof callHandler>[1]) =>
    callHandler(mod, { ...opts, token: adminToken });

  const publicReviews = (opts: Parameters<typeof callHandler>[1]) =>
    callHandler("../server/reviews", opts);

  const body = {
    name: `Smoke Reviewer ${stamp}`,
    email: `smoke+${stamp}@example.com`,
    role: "QA Analyst at Smoke Test Pharma",
    rating: 5,
    content: `Automated smoke review ${stamp} — verifying the reviews pipeline end to end.`,
  };

  // 1. public POST → 201
  const created = await publicReviews({ method: "POST", body });
  check("public POST review → 201", created.status === 201, `status=${created.status}`);

  // 2. public GET must NOT include it (pending)
  const beforeApproval = (await publicReviews({ method: "GET" })).body as { reviews: ReviewRow[] };
  const hiddenBefore = !beforeApproval.reviews.some((r) => r.name === body.name);
  check("public GET hides pending review", hiddenBefore, `count=${beforeApproval.reviews.length}`);

  // 3. admin GET includes it as pending
  const adminList = (await admin("../server/admin/reviews", { method: "GET" })).body as {
    reviews: ReviewRow[];
  };
  const mine = adminList.reviews.find((r) => r.name === body.name);
  check("admin GET shows pending review", !!mine, `status=${mine?.status ?? "missing"}`);
  if (!mine) throw new Error("Review not found in admin list — aborting.");

  // 4. admin PATCH approve → 200
  const approved = await admin("../server/admin/reviews", {
    method: "PATCH",
    body: { id: mine.id, status: "approved" },
  });
  check("admin PATCH approve → 200", approved.status === 200, `status=${approved.status}`);

  // 5. public GET now includes it
  const afterApproval = (await publicReviews({ method: "GET" })).body as { reviews: ReviewRow[] };
  const visible = afterApproval.reviews.find((r) => r.id === mine.id);
  check("public GET shows approved review", !!visible, `count=${afterApproval.reviews.length}`);

  // 6. admin PATCH reject → 200
  const rejected = await admin("../server/admin/reviews", {
    method: "PATCH",
    body: { id: mine.id, status: "rejected" },
  });
  check("admin PATCH reject → 200", rejected.status === 200, `status=${rejected.status}`);

  // 7. public GET hides it again
  const afterReject = (await publicReviews({ method: "GET" })).body as { reviews: ReviewRow[] };
  check(
    "public GET hides rejected review",
    !afterReject.reviews.some((r) => r.id === mine.id),
    `count=${afterReject.reviews.length}`
  );

  // 8. admin DELETE → 200, gone
  const deleted = await admin("../server/admin/reviews", {
    method: "DELETE",
    body: { id: mine.id },
  });
  check("admin DELETE review → 200", deleted.status === 200, `status=${deleted.status}`);
  const afterDelete = (await admin("../server/admin/reviews", { method: "GET" })).body as {
    reviews: ReviewRow[];
  };
  check(
    "deleted review gone from admin list",
    !afterDelete.reviews.some((r) => r.id === mine.id),
    `count=${afterDelete.reviews.length}`
  );

  // 9. validation
  const badRating = await publicReviews({
    method: "POST",
    body: { ...body, rating: 9 },
  });
  check("public POST rating=9 → 400", badRating.status === 400, `status=${badRating.status}`);

  const missingContent = await publicReviews({
    method: "POST",
    body: { ...body, content: "" },
  });
  check("public POST empty content → 400", missingContent.status === 400, `status=${missingContent.status}`);

  const unknownId = await admin("../server/admin/reviews", {
    method: "PATCH",
    body: { id: "00000000-0000-4000-8000-000000000000", status: "approved" },
  });
  check("admin PATCH unknown id → 404", unknownId.status === 404, `status=${unknownId.status}`);

  const adminNoToken = await callHandler("../server/admin/reviews", { method: "GET" });
  check("admin GET without token → 401", adminNoToken.status === 401, `status=${adminNoToken.status}`);

  const badMethod = await publicReviews({ method: "DELETE" });
  check("public DELETE → 405", badMethod.status === 405, `status=${badMethod.status}`);

  const passed = checks.filter((c) => c.pass).length;
  console.log(`\n═══ smoke-reviews: ${passed}/${checks.length} PASS ═══`);
  if (passed !== checks.length) {
    for (const c of checks.filter((c) => !c.pass)) console.log(`  FAIL: ${c.name} ${c.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});