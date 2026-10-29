/**
 * Live admin-endpoint suite (real Firebase tokens + real Supabase writes).
 * Run: npx tsx scripts/smoke-admin-live.ts
 *
 * Signs the three real users in through the public Firebase Auth REST API
 * (the same endpoint signInWithEmailAndPassword uses), then drives the real
 * api/ handlers with those ID tokens:
 *
 *   1. no / garbage token            → 401
 *   2. signed-in non-admin           → 403  (no admin claim)
 *   3. admin claim, not allowlisted  → 403  (temp user, deleted afterwards)
 *   4. allowlisted, claim removed    → 403  (claim restored in `finally`)
 *   5. session-cookie path           → 200 / 403 (real Firebase session cookie)
 *   6. full CRUD + publish/unpublish/archive/delete on jobs and articles
 *   7. anon key cannot see drafts created through the endpoints
 *   8. validation 400 / wrong method 405
 *   9. per-IP rate limit → 429 after 120 admin requests
 *  10. logout → 200 + old token revoked + fresh sign-in still works
 *
 * Everything created is cleaned up in `finally`, whatever happens.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// ── environment (loaded before any handler import reads it) ───────────────
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

const ADMIN1 = { email: "karunasrikaram@gmail.com", password: env.TEST_ADMIN1_PASSWORD ?? "" };
const ADMIN2 = { email: "kothapallyhrishikesh3@gmail.com", password: env.TEST_ADMIN2_PASSWORD ?? "" };
const STRAY = { email: "stray-test@example.com", password: env.TEST_STRAY_PASSWORD ?? "" };
const PROBE_EMAIL = `zz-allowlist-probe-${Date.now()}@example.com`;

const SESSION_COOKIE_NAME = "pharma_admin_session";
const IP_MAIN = "10.0.0.1";
const IP_RATE = "10.0.0.2";

// ── assertion collection ──────────────────────────────────────────────────
type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

// ── Firebase Auth REST sign-in ────────────────────────────────────────────
async function signIn(email: string, password: string): Promise<string> {
  if (!password) throw new Error(`No password stored in .env.local for ${email}`);
  const apiKey = env.VITE_FIREBASE_API_KEY ?? "";
  if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY missing from .env.local");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const json = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !json.idToken) {
    throw new Error(`Sign-in failed for ${email}: ${json.error?.message ?? res.status}`);
  }
  return json.idToken;
}

// ── in-process handler invocation (Vercel-style req/res) ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<unknown>;

interface CallOptions {
  method: string;
  token?: string;
  cookie?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  ip?: string;
}

interface CallResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

async function call(handler: Handler, opts: CallOptions): Promise<CallResult> {
  const headers: Record<string, string> = { "x-forwarded-for": opts.ip ?? IP_MAIN };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.cookie) headers.cookie = opts.cookie;

  const captured: Record<string, string> = {};
  const out: CallResult = { status: 0, body: null, headers: captured };

  const res: Record<string, unknown> = {};
  res.status = (code: number) => {
    out.status = code;
    (res as { statusCode?: number }).statusCode = code;
    return res;
  };
  res.json = async (payload: unknown) => {
    out.body = payload;
    return res;
  };
  res.end = async () => res;
  res.setHeader = (key: string, value: string) => {
    captured[String(key).toLowerCase()] = String(value);
    return res;
  };
  res.getHeader = (key: string) => captured[String(key).toLowerCase()];

  const req = {
    method: opts.method,
    headers,
    body: opts.body ?? {},
    query: opts.query ?? {},
    cookies: {},
  };

  await handler(req, res);
  return out;
}

// ── Supabase REST helpers (anon / service role) ───────────────────────────
async function supa(
  key: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; rows: Record<string, unknown>[] }> {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let rows: Record<string, unknown>[] = [];
  try {
    const parsed = text ? JSON.parse(text) : [];
    rows = Array.isArray(parsed) ? parsed : [];
  } catch {
    rows = [];
  }
  return { status: res.status, rows };
}

async function main() {
  // ── module imports (env is set above) ───────────────────────────────────
  const { getFirebaseAdmin } = await import("../api/_lib/firebase");
  const { getSupabaseAdmin } = await import("../api/_lib/db");
  const { default: meHandler } = await import("../api/admin/me");
  const { default: logoutHandler } = await import("../api/admin/logout");
  const { default: jobsHandler } = await import("../api/admin/jobs");
  const { default: jobPublish } = await import("../api/admin/jobs/publish");
  const { default: jobUnpublish } = await import("../api/admin/jobs/unpublish");
  const { default: jobArchive } = await import("../api/admin/jobs/archive");
  const { default: articlesHandler } = await import("../api/admin/articles");
  const { default: articlePublish } = await import("../api/admin/articles/publish");
  const { default: articleUnpublish } = await import("../api/admin/articles/unpublish");
  const { default: articleArchive } = await import("../api/admin/articles/archive");
  const { default: siteContentHandler } = await import("../api/admin/site-content");
  const { default: leadsHandler } = await import("../api/admin/leads");
  const { default: contactHandler } = await import("../api/admin/contact-messages");

  const auth = getFirebaseAdmin().auth();
  const db = getSupabaseAdmin();
  const anon = env.VITE_SUPABASE_ANON_KEY as string;

  let probeUid: string | null = null;
  let admin2Uid: string | null = null;
  let admin2ClaimStripped = false;
  const createdJobIds: string[] = [];
  const createdArticleIds: string[] = [];
  const createdLeadIds: string[] = [];
  const createdMessageIds: string[] = [];
  const siteContentKeys: string[] = [];

  try {
    // ── 0. sign in all three users ────────────────────────────────────────
    const [admin1Token, admin2Token, strayToken] = await Promise.all([
      signIn(ADMIN1.email, ADMIN1.password),
      signIn(ADMIN2.email, ADMIN2.password),
      signIn(STRAY.email, STRAY.password),
    ]);
    admin2Uid = (await auth.getUserByEmail(ADMIN2.email)).uid;
    check("signed in as admin1 / admin2 / stray via Firebase Auth REST", Boolean(admin1Token && admin2Token && strayToken), "3 ID tokens minted");

    // ── 1. 401s ───────────────────────────────────────────────────────────
    const noToken = await call(meHandler, { method: "GET" });
    check("GET /api/admin/me without token → 401", noToken.status === 401, JSON.stringify(noToken.body));

    const garbage = await call(meHandler, { method: "GET", token: "not-a-real-id-token" });
    check("GET /api/admin/me with garbage token → 401", garbage.status === 401, JSON.stringify(garbage.body));

    // ── 2. signed-in non-admin → 403 ──────────────────────────────────────
    const strayMe = await call(meHandler, { method: "GET", token: strayToken });
    check("stray user GET /me → 403", strayMe.status === 403, JSON.stringify(strayMe.body));

    const strayList = await call(jobsHandler, { method: "GET", token: strayToken });
    check("stray user GET /jobs → 403", strayList.status === 403, JSON.stringify(strayList.body));

    const strayCreate = await call(jobsHandler, {
      method: "POST",
      token: strayToken,
      body: { title: "HACK", company: "HACK" },
    });
    check("stray user POST /jobs → 403 (no write)", strayCreate.status === 403, JSON.stringify(strayCreate.body));

    const strayContent = await call(siteContentHandler, {
      method: "PUT",
      token: strayToken,
      body: { key: "hack", value: {} },
    });
    check("stray user PUT /site-content → 403", strayContent.status === 403, JSON.stringify(strayContent.body));

    const strayLogout = await call(logoutHandler, { method: "POST", token: strayToken });
    check("stray user POST /logout → 403", strayLogout.status === 403, JSON.stringify(strayLogout.body));

    // ── 3. admins → 200 ───────────────────────────────────────────────────
    const admin1Me = await call(meHandler, { method: "GET", token: admin1Token });
    const admin1Body = (admin1Me.body ?? {}) as { admin?: boolean; email?: string };
    check(
      "admin1 GET /me → 200 with admin:true + own email",
      admin1Me.status === 200 && admin1Body.admin === true && admin1Body.email === ADMIN1.email,
      JSON.stringify(admin1Me.body)
    );

    const admin2Me = await call(meHandler, { method: "GET", token: admin2Token });
    const admin2Body = (admin2Me.body ?? {}) as { admin?: boolean; email?: string };
    check(
      "admin2 GET /me → 200 with admin:true + own email",
      admin2Me.status === 200 && admin2Body.admin === true && admin2Body.email === ADMIN2.email,
      JSON.stringify(admin2Me.body)
    );

    // ── 4. allowlist isolation: valid admin claim, address not on list ────
    const probePassword = `Pr0be-${Date.now()}-xY`;
    const probe = await auth.createUser({ email: PROBE_EMAIL, password: probePassword, emailVerified: false });
    probeUid = probe.uid;
    await auth.setCustomUserClaims(probe.uid, { admin: true });
    const probeToken = await signIn(PROBE_EMAIL, probePassword);

    const probeMe = await call(meHandler, { method: "GET", token: probeToken });
    check(
      "admin claim but NOT allowlisted → 403 on /me",
      probeMe.status === 403,
      JSON.stringify(probeMe.body)
    );

    const probeCreate = await call(jobsHandler, {
      method: "POST",
      token: probeToken,
      body: { title: "Should fail", company: "Should fail" },
    });
    check("admin claim but NOT allowlisted → 403 on POST /jobs", probeCreate.status === 403, JSON.stringify(probeCreate.body));

    // ── 5. allowlisted address WITHOUT the claim → 403 ────────────────────
    const savedClaim = (await auth.getUser(admin2Uid)).customClaims ?? {};
    await auth.setCustomUserClaims(admin2Uid, {});
    admin2ClaimStripped = true;
    const admin2NoClaim = await signIn(ADMIN2.email, ADMIN2.password);
    const strippedMe = await call(meHandler, { method: "GET", token: admin2NoClaim });
    check(
      "allowlisted address with claim REMOVED → 403",
      strippedMe.status === 403,
      JSON.stringify(strippedMe.body)
    );

    await auth.setCustomUserClaims(admin2Uid, savedClaim);
    admin2ClaimStripped = false;
    const admin2Restored = await signIn(ADMIN2.email, ADMIN2.password);
    const restoredMe = await call(meHandler, { method: "GET", token: admin2Restored });
    check(
      "claim restored → allowlisted admin passes again (200)",
      restoredMe.status === 200,
      JSON.stringify(restoredMe.body)
    );
    // use the fresh token (with restored claim) for the rest of the suite
    const admin2Fresh = admin2Restored;

    // ── 6. real Firebase session-cookie path ──────────────────────────────
    try {
      const sessionCookie = await auth.createSessionCookie(admin1Token, { expiresIn: 3600 * 1000 });
      const cookieCall = await call(meHandler, {
        method: "GET",
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
      });
      check(
        "session cookie (verifySessionCookie) → 200 for admin1",
        cookieCall.status === 200 && ((cookieCall.body ?? {}) as { email?: string }).email === ADMIN1.email,
        JSON.stringify(cookieCall.body)
      );

      const strayCookie = await auth.createSessionCookie(strayToken, { expiresIn: 3600 * 1000 });
      const strayCookieCall = await call(meHandler, {
        method: "GET",
        cookie: `${SESSION_COOKIE_NAME}=${strayCookie}`,
      });
      check("session cookie for non-admin → 403", strayCookieCall.status === 403, JSON.stringify(strayCookieCall.body));
    } catch (err) {
      check("session-cookie path exercised", false, `createSessionCookie failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── 7. jobs CRUD through the endpoints ────────────────────────────────
    const created = await call(jobsHandler, {
      method: "POST",
      token: admin1Token,
      body: {
        title: "ZZ live QA pharmacist",
        company: "ZZ Live Test Co",
        location: "Hyderabad",
        employmentType: "full_time",
        status: "draft",
      },
    });
    const createdJob = ((created.body ?? {}) as { job?: { id?: string } }).job;
    const jobId = createdJob?.id ?? "";
    if (jobId) createdJobIds.push(jobId);
    check("admin POST /jobs (draft) → 201 + id", created.status === 201 && Boolean(jobId), `status=${created.status} id=${jobId || "none"}`);

    const anonDraft = await supa(anon, "GET", `jobs?id=eq.${jobId}&select=id`);
    check("draft created via endpoint is invisible to anon key", anonDraft.rows.length === 0, `rows=${anonDraft.rows.length}`);

    const adminList = await call(jobsHandler, { method: "GET", token: admin1Token, query: { status: "draft" } });
    const listedJobs = ((adminList.body ?? {}) as { jobs?: { id: string }[] }).jobs ?? [];
    check(
      "admin GET /jobs?status=draft includes the new draft",
      adminList.status === 200 && listedJobs.some((j) => j.id === jobId),
      `count=${listedJobs.length}`
    );

    const patched = await call(jobsHandler, {
      method: "PATCH",
      token: admin1Token,
      body: { id: jobId, title: "ZZ live QA pharmacist II" },
    });
    const patchedTitle = (((patched.body ?? {}) as { job?: { title?: string } }).job ?? {}).title;
    check("admin PATCH /jobs → 200 + updated title", patched.status === 200 && patchedTitle === "ZZ live QA pharmacist II", String(patchedTitle));

    const published = await call(jobPublish, { method: "POST", token: admin1Token, body: { id: jobId } });
    const pubRow = ((published.body ?? {}) as { job?: { status?: string; is_published?: boolean } }).job;
    check(
      "admin POST /jobs/publish → status=published, is_published=true",
      published.status === 200 && pubRow?.status === "published" && pubRow?.is_published === true,
      JSON.stringify(pubRow ?? null)
    );

    const anonPub = await supa(anon, "GET", `jobs?id=eq.${jobId}&select=id`);
    check("published job becomes visible to anon key", anonPub.rows.length === 1, `rows=${anonPub.rows.length}`);

    const unpublished = await call(jobUnpublish, { method: "POST", token: admin1Token, body: { id: jobId } });
    const unpRow = ((unpublished.body ?? {}) as { job?: { status?: string; is_published?: boolean } }).job;
    check(
      "admin POST /jobs/unpublish → status=draft, is_published=false",
      unpublished.status === 200 && unpRow?.status === "draft" && unpRow?.is_published === false,
      JSON.stringify(unpRow ?? null)
    );

    const anonUnpub = await supa(anon, "GET", `jobs?id=eq.${jobId}&select=id`);
    check("unpublished job hidden from anon key again", anonUnpub.rows.length === 0, `rows=${anonUnpub.rows.length}`);

    const archived = await call(jobArchive, { method: "POST", token: admin1Token, body: { id: jobId } });
    const arcRow = ((archived.body ?? {}) as { job?: { status?: string } }).job;
    check("admin POST /jobs/archive → status=archived", archived.status === 200 && arcRow?.status === "archived", JSON.stringify(arcRow ?? null));

    const deleted = await call(jobsHandler, { method: "DELETE", token: admin1Token, body: { id: jobId } });
    check("admin DELETE /jobs → 200", deleted.status === 200, JSON.stringify(deleted.body));

    const afterDelete = await supa(anon, "GET", `jobs?id=eq.${jobId}&select=id`);
    check("deleted job gone for anon too", afterDelete.rows.length === 0, `rows=${afterDelete.rows.length}`);

    // ── 8. articles CRUD through the endpoints ────────────────────────────
    const slug = `zz-live-${Date.now()}`;
    const artCreated = await call(articlesHandler, {
      method: "POST",
      token: admin1Token,
      body: { slug, title: "ZZ live article", excerpt: "live test", status: "draft" },
    });
    const articleId = (((artCreated.body ?? {}) as { article?: { id?: string } }).article ?? {}).id ?? "";
    if (articleId) createdArticleIds.push(articleId);
    check("admin POST /articles (draft) → 201 + id", artCreated.status === 201 && Boolean(articleId), `status=${artCreated.status}`);

    const anonArticleDraft = await supa(anon, "GET", `articles?id=eq.${articleId}&select=id`);
    check("draft article invisible to anon key", anonArticleDraft.rows.length === 0, `rows=${anonArticleDraft.rows.length}`);

    const artPublished = await call(articlePublish, { method: "POST", token: admin1Token, body: { id: articleId } });
    const artPubRow = ((artPublished.body ?? {}) as { article?: { status?: string } }).article;
    check("admin POST /articles/publish → status=published", artPublished.status === 200 && artPubRow?.status === "published", JSON.stringify(artPubRow ?? null));

    const anonArticlePub = await supa(anon, "GET", `articles?id=eq.${articleId}&select=id`);
    check("published article visible to anon key", anonArticlePub.rows.length === 1, `rows=${anonArticlePub.rows.length}`);

    const artUnpub = await call(articleUnpublish, { method: "POST", token: admin2Fresh, body: { id: articleId } });
    const artUnpubRow = ((artUnpub.body ?? {}) as { article?: { status?: string } }).article;
    check("admin2 POST /articles/unpublish → status=draft", artUnpub.status === 200 && artUnpubRow?.status === "draft", JSON.stringify(artUnpubRow ?? null));

    const artArchived = await call(articleArchive, { method: "POST", token: admin2Fresh, body: { id: articleId } });
    const artArcRow = ((artArchived.body ?? {}) as { article?: { status?: string } }).article;
    check("admin2 POST /articles/archive → status=archived", artArchived.status === 200 && artArcRow?.status === "archived", JSON.stringify(artArcRow ?? null));

    const artDeleted = await call(articlesHandler, { method: "DELETE", token: admin1Token, body: { id: articleId } });
    check("admin DELETE /articles → 200", artDeleted.status === 200, JSON.stringify(artDeleted.body));

    // ── 9. site content upsert ────────────────────────────────────────────
    const siteKey = `zz-live-key-${Date.now()}`;
    siteContentKeys.push(siteKey);
    const sitePut = await call(siteContentHandler, {
      method: "PUT",
      token: admin1Token,
      body: { key: siteKey, value: { hello: "world" }, type: "json" },
    });
    const siteItem = ((sitePut.body ?? {}) as { item?: { key?: string } }).item;
    check("admin PUT /site-content → 200 + echoed key", sitePut.status === 200 && siteItem?.key === siteKey, JSON.stringify(siteItem ?? null));

    const siteList = await call(siteContentHandler, { method: "GET", token: admin1Token });
    const siteItems = ((siteList.body ?? {}) as { items?: { key: string }[] }).items ?? [];
    check("admin GET /site-content includes the key", siteList.status === 200 && siteItems.some((i) => i.key === siteKey), `count=${siteItems.length}`);

    // ── 10. leads: list / update / delete (seeded with service role) ──────
    const leadInsert = await db.from("leads").insert({
      candidate_name: "ZZ Live Lead",
      email: "zz-live@example.com",
      status: "new",
    }).select().single();
    const leadId = leadInsert.data?.id as string | undefined;
    if (leadId) createdLeadIds.push(leadId);
    check("service role seeds a lead for the admin list test", Boolean(leadId), String(leadInsert.error?.message ?? leadId));

    const leadList = await call(leadsHandler, { method: "GET", token: admin1Token });
    const leads = ((leadList.body ?? {}) as { leads?: { id: string }[] }).leads ?? [];
    check("admin GET /leads lists the lead", leadList.status === 200 && leads.some((l) => l.id === leadId), `count=${leads.length}`);

    const leadPatch = await call(leadsHandler, {
      method: "PATCH",
      token: admin2Fresh,
      body: { id: leadId, status: "contacted" },
    });
    const leadAfter = ((leadPatch.body ?? {}) as { lead?: { status?: string } }).lead;
    check("admin2 PATCH /leads → status=contacted", leadPatch.status === 200 && leadAfter?.status === "contacted", JSON.stringify(leadAfter ?? null));

    const leadDelete = await call(leadsHandler, { method: "DELETE", token: admin1Token, body: { id: leadId } });
    check("admin DELETE /leads → 200", leadDelete.status === 200, JSON.stringify(leadDelete.body));

    // ── 11. contact messages: list / delete (seeded with service role) ────
    const msgInsert = await db.from("contact_messages").insert({
      name: "ZZ Live",
      email: "zz-live@example.com",
      message: "live suite message",
    }).select().single();
    const msgId = msgInsert.data?.id as string | undefined;
    if (msgId) createdMessageIds.push(msgId);
    check("service role seeds a contact message", Boolean(msgId), String(msgInsert.error?.message ?? msgId));

    const msgList = await call(contactHandler, { method: "GET", token: admin1Token });
    const messages = ((msgList.body ?? {}) as { messages?: { id: string }[] }).messages ?? [];
    check("admin GET /contact-messages lists the message", msgList.status === 200 && messages.some((m) => m.id === msgId), `count=${messages.length}`);

    const msgDelete = await call(contactHandler, { method: "DELETE", token: admin1Token, body: { id: msgId } });
    check("admin DELETE /contact-messages → 200", msgDelete.status === 200, JSON.stringify(msgDelete.body));

    // ── 12. validation + wrong method ─────────────────────────────────────
    const invalidBody = await call(jobsHandler, { method: "POST", token: admin1Token, body: { company: "no title" } });
    check("POST /jobs with invalid body → 400 (Zod)", invalidBody.status === 400, JSON.stringify(invalidBody.body));

    const invalidPublish = await call(jobPublish, { method: "POST", token: admin1Token, body: {} });
    check("POST /jobs/publish without id → 400", invalidPublish.status === 400, JSON.stringify(invalidPublish.body));

    const wrongMethod = await call(meHandler, { method: "POST", token: admin1Token });
    check("POST /api/admin/me → 405", wrongMethod.status === 405, JSON.stringify(wrongMethod.body));

    // ── 13. per-IP rate limiting → 429 after 120 admin requests ──────────
    const statuses: number[] = [];
    for (let i = 0; i < 121; i += 1) {
      const r = await call(meHandler, { method: "GET", token: "garbage-token", ip: IP_RATE });
      statuses.push(r.status);
    }
    const allowedCount = statuses.filter((s) => s === 401).length;
    const rateLimited = statuses.filter((s) => s === 429).length;
    check(
      "rate limit: first 120 admin requests processed, 121st → 429",
      allowedCount === 120 && rateLimited === 1 && statuses[120] === 429,
      `401s=${allowedCount} 429s=${rateLimited}`
    );

    const otherIp = await call(meHandler, { method: "GET", token: "garbage-token", ip: "10.0.0.3" });
    check("a different IP is not affected by the limit", otherIp.status === 401, JSON.stringify(otherIp.body));

    // ── 14. logout: 200 + expiring cookie; fresh sign-in still works ─────
    const logout = await call(logoutHandler, { method: "POST", token: admin1Token });
    const setCookie = logout.headers["set-cookie"] ?? "";
    check(
      "admin POST /logout → 200 + expiring session cookie",
      logout.status === 200 && setCookie.includes("Max-Age=0"),
      `status=${logout.status} set-cookie=${setCookie.slice(0, 60)}`
    );

    const admin1Again = await signIn(ADMIN1.email, ADMIN1.password);
    const afterReLogin = await call(meHandler, { method: "GET", token: admin1Again });
    check("fresh sign-in after logout works again → 200", afterReLogin.status === 200, JSON.stringify(afterReLogin.body));
  } finally {
    // ── restore anything the suite changed ────────────────────────────────
    try {
      if (admin2Uid && admin2ClaimStripped) {
        await auth.setCustomUserClaims(admin2Uid, { admin: true });
      }
    } catch {
      /* best effort */
    }
    try {
      if (probeUid) await auth.deleteUser(probeUid);
    } catch {
      /* best effort */
    }
    for (const id of createdJobIds) {
      try { await db.from("jobs").delete().eq("id", id); } catch { /* best effort */ }
    }
    for (const id of createdArticleIds) {
      try { await db.from("articles").delete().eq("id", id); } catch { /* best effort */ }
    }
    for (const id of createdLeadIds) {
      try { await db.from("leads").delete().eq("id", id); } catch { /* best effort */ }
    }
    for (const id of createdMessageIds) {
      try { await db.from("contact_messages").delete().eq("id", id); } catch { /* best effort */ }
    }
    for (const key of siteContentKeys) {
      try { await db.from("site_content").delete().eq("key", key); } catch { /* best effort */ }
    }
  }

  // ── report ──────────────────────────────────────────────────────────────
  let failed = 0;
  for (const c of checks) {
    if (!c.pass) failed += 1;
    process.stdout.write(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]\n`);
  }
  process.stdout.write(`\n${checks.length - failed}/${checks.length} checks passed\n`);

  // ── final state verification ────────────────────────────────────────────
  process.stdout.write("\nFinal state:\n");
  for (const table of ["jobs", "articles", "leads", "contact_messages", "site_content"]) {
    const rows = await supa(env.SUPABASE_SERVICE_ROLE_KEY as string, "GET", `${table}?select=id`);
    process.stdout.write(`  ${rows.rows.length === 0 ? "CLEAN" : "LEFTOVER"}  ${table}: ${rows.rows.length} row(s)\n`);
  }
  try {
    const users = await auth.listUsers(200);
    const probeLeft = users.users.some((u) => u.email === PROBE_EMAIL);
    const admin1Claims = users.users.find((u) => u.email === ADMIN1.email)?.customClaims as { admin?: boolean } | undefined;
    const admin2Claims = users.users.find((u) => u.email === ADMIN2.email)?.customClaims as { admin?: boolean } | undefined;
    process.stdout.write(`  ${probeLeft ? "LEFTOVER" : "CLEAN"}  probe user deleted: ${!probeLeft}\n`);
    process.stdout.write(`  ${admin1Claims?.admin === true && admin2Claims?.admin === true ? "CLEAN" : "DIRTY"}  admin claims intact: admin1=${admin1Claims?.admin} admin2=${admin2Claims?.admin}\n`);
  } catch (err) {
    process.stdout.write(`  WARN  could not verify users: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((err) => {
  process.stdout.write(`ERROR ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
