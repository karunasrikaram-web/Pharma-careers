/**
 * Focused probe: does a signed resume URL really die when the object is
 * deleted from the private bucket? (Supabase may serve a cached copy.)
 *
 * Run: npx tsx scripts/probe-signed-url.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
}

const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const path = `probe/${Date.now()}-test.pdf`;
const bytes = Buffer.from("%PDF-1.4\nprobe\n%%EOF\n", "latin1");

const up = await db.storage.from("resumes").upload(path, bytes, {
  contentType: "application/pdf",
  cacheControl: "0",
});
console.log("upload:", up.error ? up.error.message : "ok");

const signed = await db.storage.from("resumes").createSignedUrl(path, 3600);
console.log("signed:", signed.error ? signed.error.message : "ok");

const before = await fetch(signed.data?.signedUrl ?? "");
console.log("BEFORE delete → status", before.status);
console.log("  headers:", JSON.stringify(Object.fromEntries(before.headers.entries())));

const del = await db.storage.from("resumes").remove([path]);
console.log("remove:", del.error ? del.error.message : JSON.stringify(del.data));

const after = await fetch(signed.data?.signedUrl ?? "");
console.log("AFTER delete  → status", after.status);
console.log("  headers:", JSON.stringify(Object.fromEntries(after.headers.entries())));
console.log("AFTER body    →", (await after.text()).slice(0, 200));

// re-sign the same (now missing) path
const resign = await db.storage.from("resumes").createSignedUrl(path, 3600);
console.log("re-sign for missing object:", resign.error ? resign.error.message : "created anyway");
if (resign.data?.signedUrl) {
  const again = await fetch(resign.data.signedUrl);
  console.log("fresh signed URL for missing object → status", again.status);
}
