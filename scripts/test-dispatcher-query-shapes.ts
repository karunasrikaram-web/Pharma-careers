/**
 * Verifies `api/[...path].ts` resolves the route key from every shape the
 * platform may send:
 *   1. query.path as an array   (Vercel catch-all convention)
 *   2. query.path as a string   (rewrite dest `?path=$1` — what our vercel.json emits)
 *   3. query["...path"] string  (alternate dest-param form)
 *   4. req.url raw path         (fallback if no query param is surfaced)
 * Run: npx tsx scripts/test-dispatcher-query-shapes.ts
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import dispatcher from "../api/[...path]";

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

function mockRes() {
  let status = 200;
  let body: unknown = null;
  const res = {
    status(code: number) { status = code; return res; },
    json(payload: unknown) { body = payload; return res; },
    end() { return res; },
    setHeader() { return res; },
    getHeader() { return undefined; },
    _status: () => status,
    _body: () => body,
  };
  return res as unknown as VercelResponse & { _status: () => number; _body: () => unknown };
}

const NOT_FOUND = "Not found";
// An unknown-but-wellformed admin route: the dispatcher must route it to the
// auth guard (401), NOT its own 404. That proves the key resolved.
const PROBE = "admin/site-content";

async function call(name: string, req: Partial<VercelRequest>) {
  const res = mockRes();
  await dispatcher({ method: "GET", headers: {}, cookies: {}, body: {}, ...req } as unknown as VercelRequest, res);
  const body = JSON.stringify(res._body() ?? null);
  const routed = !(res._status() === 404 && body.includes(NOT_FOUND));
  check(name, routed, `status=${res._status()} body=${body.slice(0, 60)}`);
}

async function main() {
  await call("1. query.path = array", { query: { path: PROBE.split("/") } as never });
  await call("2. query.path = string (rewrite ?path=$1)", { query: { path: PROBE } as never });
  await call("3. query['...path'] = string", { query: { "...path": PROBE } as never });
  await call("4. req.url fallback (no query)", { url: `/api/${PROBE}` });

  // Sanity: unknown route still 404s under the string form.
  {
    const res = mockRes();
    await dispatcher({ method: "GET", headers: {}, cookies: {}, body: {}, query: { path: "nope/nope" } as never } as unknown as VercelRequest, res);
    const body = JSON.stringify(res._body() ?? null);
    check("5. unknown route string → dispatcher 404", res._status() === 404 && body.includes(NOT_FOUND), `status=${res._status()}`);
  }

  const passed = checks.filter((c) => c.pass).length;
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]`);
  console.log(`\n${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

void main();
