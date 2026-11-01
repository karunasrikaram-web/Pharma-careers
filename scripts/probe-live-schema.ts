/**
 * Read-only probe: which optional columns/tables exist on the LIVE Supabase?
 *
 *   jobs.department / jobs.role        (20260102 migration additions)
 *   companies table                    (20261031 migration)
 *   applications.experience            (20261101 migration)
 *
 * Prints PASS/FAIL per item. Never prints secrets.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local (gitignored) — same pattern as the other check scripts.
try {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // rely on the process environment
}

const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!url || !key) {
  console.log("FAIL  missing VITE_SUPABASE_URL / keys in .env.local");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probeSelect(table: string, columns: string): Promise<{ ok: boolean; detail: string }> {
  const { error } = await db.from(table).select(columns).limit(1);
  return { ok: !error, detail: error ? error.message : "ok" };
}

async function probeTable(table: string): Promise<{ ok: boolean; detail: string }> {
  const { error } = await db.from(table).select("id").limit(1);
  // 42P01 = undefined_table
  if (error && (error.code === "42P01" || /does not exist/i.test(error.message))) {
    return { ok: false, detail: "table missing" };
  }
  return { ok: !error, detail: error ? error.message : "ok" };
}

const results: Array<[string, { ok: boolean; detail: string }]> = [
  ["jobs table", await probeTable("jobs")],
  ["jobs.department", await probeSelect("jobs", "department")],
  ["jobs.role", await probeSelect("jobs", "role")],
  ["applications table", await probeTable("applications")],
  ["applications.experience", await probeSelect("applications", "experience")],
  ["companies table", await probeTable("companies")],
  ["companies.salary_visible", await probeSelect("companies", "salary_visible")],
  ["companies.documents_for_interview", await probeSelect("companies", "documents_for_interview")],
];

let missing = 0;
for (const [name, r] of results) {
  if (!r.ok) missing += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${name}${r.ok ? "" : ` — ${r.detail}`}`);
}
console.log(`\n${results.length - missing}/${results.length} present`);
process.exit(missing ? 1 : 0);
