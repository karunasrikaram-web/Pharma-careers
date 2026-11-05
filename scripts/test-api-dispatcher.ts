/**
 * Route-table test for the single catch-all API function (`api/[...path].ts`).
 *
 * Local dev (`scripts/dev-api.ts`) imports handlers directly, so this test is
 * what actually exercises the dispatcher Vercel will run in production:
 * every documented route must resolve to a real handler (NOT the dispatcher's
 * 404), and an unknown route must 404.
 *
 * Run: npx tsx scripts/test-api-dispatcher.ts
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import dispatcher from "../api/[...path]";

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

const ROUTES = [
  "contact",
  "applications",
  "check-application",
  "admin/me",
  "admin/logout",
  "admin/leads",
  "admin/jobs",
  "admin/jobs/publish",
  "admin/jobs/archive",
  "admin/jobs/unpublish",
  "admin/companies",
  "admin/upload-photo",
  "admin/reviews",
  "reviews",
  "admin/applications",
  "admin/contact-messages",
  "admin/site-content",
  "admin/articles",
  "admin/articles/publish",
  "admin/articles/archive",
  "admin/articles/unpublish",
];

const NOT_FOUND = "Not found";

function mockRes() {
  let status = 200;
  let body: unknown = null;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    end() {
      return res;
    },
    setHeader() {
      return res;
    },
    getHeader() {
      return undefined;
    },
    // test-only accessors
    _status: () => status,
    _body: () => body,
  };
  return res as unknown as VercelResponse & { _status: () => number; _body: () => unknown };
}

async function call(path: string[]) {
  const req = {
    method: "GET",
    headers: {},
    cookies: {},
    query: { path },
    body: {},
  } as unknown as VercelRequest;
  const res = mockRes();
  await dispatcher(req, res);
  return res;
}

async function main() {
  // 1. Every known route resolves to a handler (something other than the
  //    dispatcher's own 404). Unauthenticated admin routes answer 401/403,
  //    public routes answer 400/405 — never the dispatcher 404.
  for (const route of ROUTES) {
    const res = await call(route.split("/"));
    const body = JSON.stringify(res._body() ?? null);
    const isDispatcher404 = res._status() === 404 && body.includes(NOT_FOUND);
    check(`routes: /api/${route}`, !isDispatcher404, `status=${res._status()} body=${body.slice(0, 80)}`);
  }

  // 2. Unknown route → dispatcher 404.
  const unknown = await call(["definitely", "not", "a", "route"]);
  check(
    "unknown route → 404",
    unknown._status() === 404 && JSON.stringify(unknown._body()).includes(NOT_FOUND),
    `status=${unknown._status()}`
  );

  const passed = checks.filter((c) => c.pass).length;
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  [${c.detail}]`);
  console.log(`\n${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

void main();
