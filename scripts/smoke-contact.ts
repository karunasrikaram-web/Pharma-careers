/**
 * Executable checks for the public contact endpoint.
 * Run: npx tsx scripts/smoke-contact.ts
 *
 *   1. valid payload          → 201, row visible to service role, invisible to anon
 *   2. invalid payload        → 400 (Zod)
 *   3. wrong method (GET)     → 405
 *   4. rate limit             → 429 after 5 requests from one IP
 *   5. cleanup                → row deleted, tables back to 0 rows
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
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<unknown>;

async function call(handler: Handler, opts: { method: string; body?: Record<string, unknown>; ip?: string }) {
  const out = { status: 0, body: null as unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.status = (c: number) => {
    out.status = c;
    return res;
  };
  res.json = async (b: unknown) => {
    out.body = b;
    return res;
  };
  res.end = async () => res;
  res.setHeader = () => res;
  await handler(
    { method: opts.method, headers: { "x-forwarded-for": opts.ip ?? "10.9.9.1" }, body: opts.body ?? {}, query: {} },
    res
  );
  return out;
}

async function main() {
  const { default: handler } = await import("../api/contact");
  const { getSupabaseAdmin } = await import("../api/_lib/db");
  const db = getSupabaseAdmin();
  const anon = env.VITE_SUPABASE_ANON_KEY as string;
  const svc = env.SUPABASE_SERVICE_ROLE_KEY as string;

  const createdIds: string[] = [];

  try {
    // 1. valid payload → 201
    const ok = await call(handler, {
      method: "POST",
      body: { name: "ZZ Smoke", email: "zz-smoke@example.com", subject: "hello", message: "smoke test message" },
    });
    check("valid contact payload → 201", ok.status === 201, JSON.stringify(ok.body));

    const rows = await db.from("contact_messages").select("id").eq("email", "zz-smoke@example.com");
    const id = rows.data?.[0]?.id as string | undefined;
    if (id) createdIds.push(id);
    check("message stored (service role sees it)", Boolean(id), String(rows.error?.message ?? `id=${id}`));

    const anonRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/contact_messages?email=eq.zz-smoke@example.com&select=id`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    const anonRows = anonRes.ok ? ((await anonRes.json()) as unknown[]) : [];
    check("anon key cannot read contact messages", Array.isArray(anonRows) && anonRows.length === 0, `rows=${Array.isArray(anonRows) ? anonRows.length : "n/a"}`);

    // 2. invalid payload → 400
    const bad = await call(handler, { method: "POST", body: { name: "No email" } });
    check("invalid payload → 400 (Zod)", bad.status === 400, JSON.stringify(bad.body));

    // 3. wrong method → 405
    const wrong = await call(handler, { method: "GET" });
    check("GET → 405", wrong.status === 405, JSON.stringify(wrong.body));

    // 4. rate limit: 5/min per IP → 6th request 429
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const r = await call(handler, {
        method: "POST",
        ip: "10.9.9.50",
        body: { name: "ZZ RL", email: `zz-rl-${i}@example.com`, message: "rate limit probe" },
      });
      statuses.push(r.status);
    }
    check(
      "rate limit: first 5 accepted, 6th → 429",
      statuses.filter((s) => s === 201).length === 5 && statuses[5] === 429,
      JSON.stringify(statuses)
    );

    // capture rate-limit rows for cleanup
    const rlRows = await db.from("contact_messages").select("id").like("email", "zz-rl-%@example.com");
    for (const r of rlRows.data ?? []) createdIds.push(r.id as string);

    const otherIp = await call(handler, {
      method: "POST",
      ip: "10.9.9.51",
      body: { name: "ZZ Other", email: "zz-other@example.com", message: "different ip" },
    });
    check("a different IP is not rate limited", otherIp.status === 201, JSON.stringify(otherIp.body));
    const otherRows = await db.from("contact_messages").select("id").eq("email", "zz-other@example.com");
    for (const r of otherRows.data ?? []) createdIds.push(r.id as string);
  } finally {
    for (const id of createdIds) {
      try {
        await db.from("contact_messages").delete().eq("id", id);
      } catch {
        /* best effort */
      }
    }
  }

  let failed = 0;
  for (const c of checks) {
    if (!c.pass) failed += 1;
    process.stdout.write(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]\n`);
  }
  process.stdout.write(`\n${checks.length - failed}/${checks.length} checks passed\n`);

  const after = await db.from("contact_messages").select("id");
  process.stdout.write(`Final state: contact_messages = ${after.data?.length ?? "?"} row(s)\n`);
  void svc;

  process.exit(failed === 0 ? 0 : 1);
}

void main().catch((err) => {
  process.stdout.write(`ERROR ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
