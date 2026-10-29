/**
 * Live RLS verification against the real Supabase project.
 * Run: npx tsx scripts/smoke-rls.ts
 *
 * Seeds rows with the service role, then attacks the same tables with the
 * ANON key (read / insert / update / delete) and verifies service-role CRUD.
 * Everything seeded is cleaned up at the end, whatever happens.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// ── env ──────────────────────────────────────────────────────────────────
function readEnv(): { url: string; anon: string; svc: string } {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const get = (name: string) =>
    (text.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1] ?? "").trim();
  const url = get("VITE_SUPABASE_URL");
  const anon = get("VITE_SUPABASE_ANON_KEY");
  const svc = get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !svc) {
    throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return { url: url.replace(/\/+$/, ""), anon, svc };
}

const { url, anon, svc } = readEnv();

async function req(
  key: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
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
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

const asArray = (r: { json: unknown }): unknown[] =>
  Array.isArray(r.json) ? r.json : [];

// ── assertion collection ─────────────────────────────────────────────────
type Row = { name: string; pass: boolean; detail: string };
const rows: Row[] = [];
const record = (name: string, pass: boolean, detail: string) => rows.push({ name, pass, detail });

/** Write attempts must be denied: 401/403, or 200/204 with zero rows affected. */
function isWriteDenied(r: { status: number; json: unknown }): boolean {
  if (r.status === 401 || r.status === 403) return true;
  if (r.status === 200 || r.status === 201 || r.status === 204) return asArray(r).length === 0;
  return false;
}

const seeded: { table: string; id: string }[] = [];

async function seed(table: string, values: Record<string, unknown>): Promise<string> {
  const r = await req(svc, "POST", table, values);
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`Seed into ${table} failed: ${r.status} ${r.text}`);
  }
  const id = String((asArray(r)[0] as { id?: string })?.id ?? "");
  seeded.push({ table, id });
  return id;
}

async function exists(key: string, table: string, id: string): Promise<boolean> {
  const r = await req(key, "GET", `${table}?id=eq.${id}&select=id`);
  return asArray(r).length === 1;
}

async function cleanup() {
  for (const { table, id } of seeded) {
    try {
      await req(svc, "DELETE", `${table}?id=eq.${id}`);
    } catch {
      // best effort
    }
  }
}

async function main() {
  // ── 1. Seed one draft + one published row per content table ────────────
  const draftJobId = await seed("jobs", { title: "ZZ-RLS draft job", company: "ZZ Test", status: "draft" });
  const pubJobId = await seed("jobs", {
    title: "ZZ-RLS published job",
    company: "ZZ Test",
    status: "published",
    is_published: true,
    published_at: new Date().toISOString(),
  });
  const draftArticleId = await seed("articles", {
    slug: `zz-rls-draft-${Date.now()}`,
    title: "ZZ-RLS draft article",
    status: "draft",
  });
  const pubArticleId = await seed("articles", {
    slug: `zz-rls-published-${Date.now()}`,
    title: "ZZ-RLS published article",
    status: "published",
    is_published: true,
    published_at: new Date().toISOString(),
  });
  const leadId = await seed("leads", { candidate_name: "ZZ RLS", email: "zz@example.com", status: "viewing" });
  const messageId = await seed("contact_messages", { name: "ZZ RLS", email: "zz@example.com", message: "ZZ RLS test" });
  const contentId = await seed("site_content", { key: "zz-rls-test", value: { helloworld: true }, type: "json" });

  try {
    // ── 2. Anon READ ─────────────────────────────────────────────────────
    const anonJobs = asArray(await req(anon, "GET", "jobs?select=id,status"));
    const anonStatuses = anonJobs.map((r) => String((r as { status: string }).status));
    record(
      "anon SELECT jobs returns only published rows",
      anonStatuses.every((s) => s === "published") &&
        anonJobs.some((r) => String((r as { id: string }).id) === pubJobId) &&
        !anonJobs.some((r) => String((r as { id: string }).id) === draftJobId),
      `statuses=[${anonStatuses.join(",")}] draftVisible=${anonJobs.some((r) => String((r as { id: string }).id) === draftJobId)}`
    );

    const anonArticles = asArray(await req(anon, "GET", "articles?select=id,status"));
    record(
      "anon SELECT articles returns only published rows",
      anonArticles.every((r) => String((r as { status: string }).status) === "published") &&
        !anonArticles.some((r) => String((r as { id: string }).id) === draftArticleId),
      `count=${anonArticles.length}`
    );

    const anonContent = asArray(await req(anon, "GET", "site_content?key=eq.zz-rls-test&select=key"));
    record("anon SELECT site_content allowed (public read)", anonContent.length === 1, `count=${anonContent.length}`);

    const anonLeads = await req(anon, "GET", "leads?select=id");
    record(
      "anon SELECT leads blocked (no public policy)",
      asArray(anonLeads).length === 0,
      `status=${anonLeads.status} count=${asArray(anonLeads).length}`
    );

    const anonMessages = await req(anon, "GET", "contact_messages?select=id");
    record(
      "anon SELECT contact_messages blocked (no public policy)",
      asArray(anonMessages).length === 0,
      `status=${anonMessages.status} count=${asArray(anonMessages).length}`
    );

    // ── 3. Anon WRITE ────────────────────────────────────────────────────
    const insJob = await req(anon, "POST", "jobs", { title: "HACK", company: "HACK" });
    record("anon INSERT into jobs denied", isWriteDenied(insJob), `status=${insJob.status}`);

    const insArticle = await req(anon, "POST", "articles", { slug: "hack", title: "HACK" });
    record("anon INSERT into articles denied", isWriteDenied(insArticle), `status=${insArticle.status}`);

    const insLead = await req(anon, "POST", "leads", { candidate_name: "HACK", email: "hack@example.com" });
    record("anon INSERT into leads denied", isWriteDenied(insLead), `status=${insLead.status}`);

    const insMsg = await req(anon, "POST", "contact_messages", { name: "HACK", email: "hack@example.com", message: "HACK" });
    record("anon INSERT into contact_messages denied", isWriteDenied(insMsg), `status=${insMsg.status}`);

    const insContent = await req(anon, "POST", "site_content", { key: "zz-hack", value: {}, type: "json" });
    record("anon INSERT into site_content denied", isWriteDenied(insContent), `status=${insContent.status}`);

    const updJob = await req(anon, "PATCH", `jobs?id=eq.${pubJobId}`, { title: "HACKED TITLE" });
    record("anon UPDATE of a published job denied", isWriteDenied(updJob), `status=${updJob.status} rows=${asArray(updJob).length}`);
    const stillIntact = await req(svc, "GET", `jobs?id=eq.${pubJobId}&select=title`);
    record(
      "published job title unchanged after anon UPDATE attempt",
      asArray(stillIntact).length === 1 && (asArray(stillIntact)[0] as { title: string }).title === "ZZ-RLS published job",
      JSON.stringify(asArray(stillIntact))
    );

    const delJob = await req(anon, "DELETE", `jobs?id=eq.${pubJobId}`);
    record("anon DELETE of a published job denied", isWriteDenied(delJob), `status=${delJob.status} rows=${asArray(delJob).length}`);
    record("published job still exists after anon DELETE attempt", await exists(svc, "jobs", pubJobId), `id=${pubJobId}`);

    const delContent = await req(anon, "DELETE", `site_content?id=eq.${contentId}`);
    record("anon DELETE of site_content denied", isWriteDenied(delContent), `status=${delContent.status}`);
    record("site_content row still exists after anon DELETE attempt", await exists(svc, "site_content", contentId), `id=${contentId}`);

    const delLead = await req(anon, "DELETE", `leads?id=eq.${leadId}`);
    record("anon DELETE of a lead denied", isWriteDenied(delLead), `status=${delLead.status}`);
    record("lead still exists after anon DELETE attempt", await exists(svc, "leads", leadId), `id=${leadId}`);

    // ── 4. Service-role CRUD (the write path admin endpoints use) ────────
    const cj = await req(svc, "POST", "jobs", { title: "ZZ-CRUD job", company: "ZZ Test", status: "draft" });
    const crudJobId = String((asArray(cj)[0] as { id: string })?.id ?? "");
    seeded.push({ table: "jobs", id: crudJobId });
    record("service role CREATE job", asArray(cj).length === 1, `status=${cj.status}`);

    const pub = await req(svc, "PATCH", `jobs?id=eq.${crudJobId}`, {
      status: "published",
      is_published: true,
      published_at: new Date().toISOString(),
    });
    const pubRow = asArray(pub)[0] as { status?: string; is_published?: boolean } | undefined;
    record(
      "service role PUBLISH job",
      asArray(pub).length === 1 && pubRow?.status === "published" && pubRow?.is_published === true,
      JSON.stringify(pubRow ?? null)
    );

    const unp = await req(svc, "PATCH", `jobs?id=eq.${crudJobId}`, { status: "draft", is_published: false, published_at: null });
    const unpRow = asArray(unp)[0] as { status?: string; is_published?: boolean } | undefined;
    record(
      "service role UNPUBLISH job",
      asArray(unp).length === 1 && unpRow?.status === "draft" && unpRow?.is_published === false,
      JSON.stringify(unpRow ?? null)
    );

    const arc = await req(svc, "PATCH", `jobs?id=eq.${crudJobId}`, {
      status: "archived",
      is_published: false,
      archived_at: new Date().toISOString(),
    });
    const arcRow = asArray(arc)[0] as { status?: string } | undefined;
    record("service role ARCHIVE job", asArray(arc).length === 1 && arcRow?.status === "archived", JSON.stringify(arcRow ?? null));

    const del = await req(svc, "DELETE", `jobs?id=eq.${crudJobId}`);
    record(
      "service role DELETE job",
      (del.status === 200 || del.status === 204) && asArray(del).length === 1 && !(await exists(svc, "jobs", crudJobId)),
      `status=${del.status} rows=${asArray(del).length}`
    );

    const ca = await req(svc, "POST", "articles", { slug: `zz-crud-${Date.now()}`, title: "ZZ-CRUD article", status: "draft" });
    const crudArticleId = String((asArray(ca)[0] as { id: string })?.id ?? "");
    seeded.push({ table: "articles", id: crudArticleId });
    record("service role CREATE article", asArray(ca).length === 1, `status=${ca.status}`);

    const aPub = await req(svc, "PATCH", `articles?id=eq.${crudArticleId}`, { status: "published", is_published: true });
    record(
      "service role PUBLISH article",
      asArray(aPub).length === 1 && (asArray(aPub)[0] as { status?: string }).status === "published",
      JSON.stringify(asArray(aPub)[0] ?? null)
    );

    const aArc = await req(svc, "PATCH", `articles?id=eq.${crudArticleId}`, { status: "archived" });
    record(
      "service role ARCHIVE article",
      asArray(aArc).length === 1 && (asArray(aArc)[0] as { status?: string }).status === "archived",
      JSON.stringify(asArray(aArc)[0] ?? null)
    );

    const aDel = await req(svc, "DELETE", `articles?id=eq.${crudArticleId}`);
    record(
      "service role DELETE article",
      (aDel.status === 200 || aDel.status === 204) && !(await exists(svc, "articles", crudArticleId)),
      `status=${aDel.status}`
    );

    // ── 5. Published rows are still publicly readable after CRUD ─────────
    const visibleAgain = await req(anon, "GET", `jobs?id=eq.${pubJobId}&select=id`);
    record("published job still visible to anon at the end", asArray(visibleAgain).length === 1, `count=${asArray(visibleAgain).length}`);
  } finally {
    await cleanup();
  }

  // ── report ─────────────────────────────────────────────────────────────
  let failed = 0;
  for (const r of rows) {
    if (!r.pass) failed += 1;
    process.stdout.write(`${r.pass ? "PASS" : "FAIL"}  ${r.name}  [${r.detail}]\n`);
  }
  process.stdout.write(`\n${rows.length - failed}/${rows.length} checks passed\n`);

  // confirm cleanup left the tables empty
  for (const table of ["jobs", "articles", "leads", "contact_messages"]) {
    const left = asArray(await req(svc, "GET", `${table}?select=id`));
    process.stdout.write(`${left.length === 0 ? "CLEAN" : "LEFTOVER"}  ${table}: ${left.length} row(s)\n`);
  }
  const contentLeft = asArray(await req(svc, "GET", "site_content?select=id"));
  process.stdout.write(`${contentLeft.length === 0 ? "CLEAN" : "LEFTOVER"}  site_content: ${contentLeft.length} row(s)\n`);

  process.exit(failed === 0 ? 0 : 1);
}

void main().catch(async (err) => {
  process.stdout.write(`ERROR ${err instanceof Error ? err.message : String(err)}\n`);
  await cleanup();
  process.exit(1);
});
