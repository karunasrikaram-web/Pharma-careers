# Pharma Careers — Auth Override Verification Report

**Scope:** Firebase Authentication for admins, Supabase for data.
**Date:** 2026-10-29
**Environment:** Local scaffold only — no live Firebase project or Supabase project credentials were
available, so anything requiring real credentials is marked **NOT TESTED** rather than PASS.

## How to read this report

| Mark | Meaning |
|---|---|
| ✅ **PASS** | Executed here, observed the expected result. |
| ❌ **FAIL** | Executed here, observed the wrong result. |
| ⬜ **NOT TESTED** | Requires live Firebase + Supabase credentials; not executed. |

---

## 1. Automated checks actually executed

| # | Check | Command / method | Result |
|---|---|---|---|
| 1 | Client + API + config typecheck | `npx tsc --noEmit` | ✅ **PASS** (exit 0, no errors) |
| 2 | Production build | `npm run build` (Vite 5.4.21) | ✅ **PASS** (exit 0, 52 modules, `dist/assets/index-*.js` 338.70 kB) |
| 3 | No service account / service role key / private key / Firebase web key / JWT in client bundle | `grep` over `dist/**` for `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `service_role`, `serviceRole`, `private_key`, `-----BEGIN`, `AIzaSy`, `eyJhbGciOi`, `sk-…` | ✅ **PASS** — 0 matches |
| 4 | Unauthenticated request to admin endpoint | `scripts/smoke-admin-me.ts` → `GET /api/admin/me` with no Authorization header, no cookie | ✅ **PASS** — `401 {"error":"Unauthorized"}` |
| 5 | Garbage bearer token rejected | same script → `Authorization: Bearer not-a-real-id-token` | ✅ **PASS** — `401 {"error":"Unauthorized"}` |
| 6 | Wrong HTTP method rejected | same script → `POST /api/admin/me` | ✅ **PASS** — `405 {"error":"Method not allowed"}` |
| 7 | `.env.example` contains only variable **names**, no secrets | manual review | ✅ **PASS** |
| 8 | Service-role / service-account vars are **not** `VITE_`-prefixed | grep `.env.example` → `SUPABASE_SERVICE_ROLE_KEY=`, `FIREBASE_SERVICE_ACCOUNT_JSON=` (no `VITE_` prefix) | ✅ **PASS** |
| 9 | No secret files committed / present | `Get-ChildItem .env*` → only `.env.example`; `.gitignore` excludes `.env` and `.env.*` | ✅ **PASS** |
| 10 | Client source contains no service keys, no `localStorage` admin flag, no `is_admin` | grep `src/**` for `SERVICE_ROLE`, `SERVICE_ACCOUNT`, `PRIVATE_KEY`, `localStorage`, `is_admin`, `isAdmin` | ✅ **PASS** — 0 matches |
| 11 | Admin email allowlist logic | `npx tsx scripts/smoke-allowlist.ts` (12 assertions) | ✅ **PASS** — 12/12 |
| 12 | Admin emails / `ADMIN_EMAILS` / service keys absent from the rebuilt client bundle | grep `dist/**` for `karunasrikaram`, `kothapallyhrishikesh3`, `ADMIN_EMAILS`, `SERVICE_ROLE`, `SERVICE_ACCOUNT`, `-----BEGIN`, `AIzaSy`, `eyJhbGciOi` | ✅ **PASS** — 0 matches |
| 13 | `.env.local` (holds the two real addresses) is not tracked by git | `git ls-files` → only `.env.example` matches `.env*`; `.gitignore` covers `.env`, `.env.*`, `*.local`, `!.env.example` | ✅ **PASS** |
| 14 | Live Supabase project reachable with the supplied keys | `GET /rest/v1/jobs` with anon key → PostgREST answered; same request **without** a key → `401 No API key found in request` | ✅ **PASS** |
| 15 | Migration applied to the live project | service-role `GET` on all 5 tables → `[]` / `200` (previously `404 PGRST205`) | ✅ **PASS** |
| 16 | Live RLS + write-path suite | `npx tsx scripts/smoke-rls.ts` — 28 assertions against the real database | ✅ **PASS** — 28/28 |
| 17 | Test data cleaned up afterwards | all 5 tables verified at `0` rows after the run | ✅ **PASS** |

Reproduce locally:

```powershell
npx tsc --noEmit
npm run build
npx tsx scripts/smoke-admin-me.ts
npx tsx scripts/smoke-allowlist.ts
```

### Allowlist assertions executed (check 11)

| # | Assertion | Result |
|---|---|---|
| A1 | `ADMIN_EMAILS` parses to exactly 2 entries | ✅ PASS |
| A2 | `karunasrikaram@gmail.com` allowed | ✅ PASS |
| A3 | `kothapallyhrishikesh3@gmail.com` allowed | ✅ PASS |
| A4 | Matching is case-insensitive (`KARUNASRIKARAM@GMAIL.COM`) | ✅ PASS |
| A5 | Address outside the allowlist denied | ✅ PASS |
| A6 | Valid admin outside allowlist → **403** `{reason:"forbidden"}` | ✅ PASS |
| A7 | Allowlisted admin passes through unchanged | ✅ PASS |
| A8 | Pre-existing auth failures are not overwritten | ✅ PASS |
| A9 | 401 stays 401 — the allowlist never changes an auth failure into a different code | ✅ PASS |
| A10 | Production + empty `ADMIN_EMAILS` → deny (**fail closed**) | ✅ PASS |
| A11 | That denial is a 403, not a 401 | ✅ PASS |
| A12 | Development + empty `ADMIN_EMAILS` → claim-only | ✅ PASS |

### Live RLS suite executed (check 16) — 28/28

Run against the real project (`rsyyqtynvqbaeoslxwwc`) with the anon key after seeding one draft and one
published row per content table using the service role.

| Group | Checks | Result |
|---|---|---|
| anon **SELECT** jobs | only `status='published'` rows returned; seeded draft row invisible | ✅ PASS |
| anon **SELECT** articles | only published rows; draft invisible | ✅ PASS |
| anon **SELECT** site_content | allowed (public read policy) | ✅ PASS |
| anon **SELECT** leads | 0 rows despite a seeded lead (no public policy) | ✅ PASS |
| anon **SELECT** contact_messages | 0 rows despite a seeded message (no public policy) | ✅ PASS |
| anon **INSERT** into jobs / articles / leads / contact_messages / site_content | all `401` (RLS denial) | ✅ PASS ×5 |
| anon **UPDATE** of a published job | 0 rows affected, title unchanged when re-read with service role | ✅ PASS ×2 |
| anon **DELETE** of a published job | 0 rows affected, row still exists | ✅ PASS ×2 |
| anon **DELETE** site_content / leads | denied, rows still exist | ✅ PASS ×4 |
| service role **CREATE / PUBLISH / UNPUBLISH / ARCHIVE / DELETE** (jobs) | all succeeded with correct `status` + `is_published` + timestamps | ✅ PASS ×5 |
| service role **CREATE / PUBLISH / ARCHIVE / DELETE** (articles) | all succeeded | ✅ PASS ×4 |
| published job still readable by anon at the end | ✅ PASS |
| cleanup | jobs, articles, leads, contact_messages, site_content all back to `0` rows | ✅ PASS |

---

## 2. Spec requirements — implementation status

### Admin login (`/admin/login`)

| Requirement | Status |
|---|---|
| Uses `signInWithEmailAndPassword` | ✅ implemented (`src/lib/firebase.ts` → `adminSignIn`) |
| Generic error `Invalid email or password.` on any failure, never reveals account existence | ✅ implemented (`AdminAuthContext.signIn` catches all errors and returns the generic string) |
| No example credentials anywhere in UI or docs | ✅ verified — no seeded passwords in code or README |
| No sign-up UI | ✅ implemented — login + forgot-password only |
| No public admin shortcut / hidden route | ✅ implemented — only `/admin/login`, `/admin/dashboard`, `/admin/access-denied` |
| "Forgot password?" → `sendPasswordResetEmail` | ✅ implemented |
| Neutral reset message **identical** for existing and non-existing emails | ✅ implemented — single constant `NEUTRAL_RESET_MESSAGE = "If an account exists for this email, a reset link has been sent."`, shown unconditionally; Firebase errors are swallowed |
| Button cooldown on reset | ✅ implemented — 60 s cooldown with live countdown |
| Guidance for reset-email template, authorized domains, action URL | ✅ implemented — rendered panel on the login page + README §Firebase setup |
| Logout: `signOut()` + clear server session cookie + redirect `/admin/login` | ✅ implemented (`AdminAuthContext.signOut`, `api/admin/logout.ts` clears the httpOnly cookie and revokes refresh tokens, `Dashboard.handleSignOut` navigates to `/admin/login`) |

### Server-side authorization

| Requirement | Status |
|---|---|
| Firebase custom claim `admin: true` only — no client-readable field, no localStorage flag | ✅ implemented (claim read from `verifyIdToken` / `getUser().customClaims`; grep confirms no client flag) |
| One-time `scripts/set-admin.js` using `firebase-admin` + local service account, by UID or email | ✅ implemented (`--uid` / `--email`, no hardcoded password or UID) |
| Owner creates the user in Firebase Console → Authentication → Users | ✅ documented in README |
| Every admin endpoint reads `Authorization: Bearer <id token>` **or** httpOnly session cookie created via `createSessionCookie` | ✅ implemented (`api/_lib/auth.ts` → `requireAdmin`) |
| Verified with `verifyIdToken` / `verifySessionCookie` with `checkRevoked = true` | ✅ implemented (`verifyIdToken(token, true)` / `verifySessionCookie(token, true)` — v12 boolean signature) |
| Requires `decodedToken.admin === true`, else 401/403 | ✅ implemented — missing/invalid token → 401, valid token without claim → 403 |
| Body validated/sanitized server-side | ✅ implemented — Zod schemas in `api/_lib/validate.ts` on every write path |
| Writes to Supabase use the server-only service role key | ✅ implemented (`api/_lib/db.ts`, never referenced from `src/`) |
| **Email allowlist (added 2026-10-29):** two addresses required server-side, in addition to the claim | ✅ implemented (`ADMIN_EMAILS` in `.env.local` = `karunasrikaram@gmail.com`, `kothapallyhrishikesh3@gmail.com`; enforced by `enforceAdminAllowlist` inside `requireAdmin`, so it covers bearer **and** cookie paths and every `/api/admin/*` route) |
| Allowlist fails closed in production when unset, claim-only in dev | ✅ implemented + executed (`smoke-allowlist.ts` A10–A12) |
| Granting the claim cannot silently bypass the allowlist | ✅ implemented — `scripts/set-admin.js` warns when the target address is not on `ADMIN_EMAILS` and reports `onAllowlist` in its output |
| Allowlist never leaks to the browser | ✅ PASS — `ADMIN_EMAILS` is not `VITE_`-prefixed, not referenced from `src/`, absent from `dist/` (check 12) |

### Admin endpoints (all ops for jobs, articles, site content, leads)

| Resource | List | Create | Update | Publish | Unpublish | Archive | Delete | View leads/messages |
|---|---|---|---|---|---|---|---|---|
| jobs | ✅ `GET /api/admin/jobs` | ✅ POST | ✅ PATCH | ✅ `/jobs/publish` | ✅ `/jobs/unpublish` | ✅ `/jobs/archive` | ✅ DELETE | — |
| articles | ✅ `GET /api/admin/articles` | ✅ POST | ✅ PATCH | ✅ `/articles/publish` | ✅ `/articles/unpublish` | ✅ `/articles/archive` | ✅ DELETE | — |
| site content | ✅ `GET /api/admin/site-content` | ✅ PUT (upsert) | ✅ PUT (upsert) | — | — | — | — | — |
| leads | ✅ `GET /api/admin/leads` | — | ✅ PATCH | — | — | — | ✅ DELETE | ✅ list |
| contact messages | ✅ `GET /api/admin/contact-messages` | — | — | — | — | — | ✅ DELETE | ✅ list |

Plus `GET /api/admin/me` (admin status check) and `POST /api/admin/logout`.

### `/admin/dashboard` guard

| Requirement | Status |
|---|---|
| UI check is cosmetic only | ✅ implemented — page calls `GET /api/admin/me` with the ID token; the real gate is the server |
| Signed-in user **without** the claim sees an access-denied page | ✅ implemented — 403 → inline access-denied view (also route `/admin/access-denied`) |
| Unauthenticated user redirected to `/admin/login` | ✅ implemented |

### Rate limiting

| Requirement | Status |
|---|---|
| Admin endpoints rate-limited | ✅ implemented — per-IP in-memory bucket, 120 req/min in `requireAdmin`, returns 429 |
| Password-reset flow rate-limited | ✅ implemented — 60 s client cooldown + Firebase's own server-side limits |

### Supabase RLS (`supabase/migrations/20260101000000_admin_cms.sql`)

| Requirement | Status |
|---|---|
| Drop `profiles` table and `is_admin()` | ✅ implemented (`DROP TABLE IF EXISTS public.profiles CASCADE; DROP FUNCTION IF EXISTS public.is_admin();`) |
| `jobs` / `articles` RLS on; anon SELECT only `status = 'published'`; **no** insert/update/delete policies | ✅ implemented — single `for select using (status = 'published')` policy each |
| `site_content` public SELECT only | ✅ implemented |
| `leads` / `contact_messages` RLS on with **no** public policies | ✅ implemented — RLS enabled, zero policies |
| Service role key never browser-side / never `VITE_`- or `NEXT_PUBLIC_`-prefixed | ✅ PASS (checks 3, 8, 10 above) |

### README security model

| Requirement | Status |
|---|---|
| States Firebase free-tier sign-up cannot be fully disabled, and is safe only because every admin endpoint requires the admin claim; never rely on sign-up being closed | ✅ implemented (README §Security notes) |

---

## 3. Spec PASS/FAIL checklist (live-behaviour items)

| # | Check | Result |
|---|---|---|
| 1 | Unauthenticated request → 401 | ✅ **PASS** (executed: `GET /api/admin/me` with no token and with a garbage token; also unauthenticated Supabase REST request → 401) |
| 2 | Signed-in non-admin → 403 | ⬜ **NOT TESTED** — needs a real Firebase user without the claim |
| 3 | Admin CRUD + publish / unpublish / archive / delete works | ⬜ **NOT TESTED** at the *endpoint* layer — needs the Firebase admin claim to call `/api/admin/*`. **Executed at the database layer**: service-role CREATE / PUBLISH / UNPUBLISH / ARCHIVE / DELETE all passed for jobs and articles (10/10, check 16) |
| 4 | Anon key cannot read drafts and cannot write | ✅ **PASS** (executed live: draft invisible; all 5 inserts → 401; update/delete → 0 rows with rows verified intact afterwards) |
| 5 | Neutral reset message identical for existing / non-existing emails | ⬜ **NOT TESTED** (UI logic verified by code review: one constant, shown unconditionally, Firebase errors swallowed — but no live email was sent) |
| 6 | No service account / service role key in client bundle | ✅ **PASS** (executed: grep over the production `dist/` output — 0 matches) |

**Score: 3 PASS · 0 FAIL · 3 NOT TESTED**

---

## 4. How to close the remaining 3 NOT TESTED items

All three now depend only on **Firebase** (Supabase is fully verified):

1. Create a Firebase project → enable **Authentication → Email/Password** → add authorized domains →
   customize the **Password reset** template (action URL `https://<domain>/admin/login`).
2. Create two users in **Authentication → Users** (one for each allowlisted address, plus one extra
   address that is deliberately left off `ADMIN_EMAILS` and without the claim).
3. Fill `VITE_FIREBASE_*` and `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local`.
4. Grant the claim: `node scripts/set-admin.js --email karunasrikaram@gmail.com` (repeat for the second).
5. Run the checks:

```powershell
# (1) unauthenticated → 401  [PASS — already executed]
npx tsx scripts/smoke-admin-me.ts

# (2) signed-in non-admin → 403
#     Sign in as the third user, then GET /api/admin/me with their ID token
#     → expect 403 {"error":"Forbidden"} and the access-denied page in /admin/dashboard.
#     Also confirm an allowlisted address WITHOUT the claim → 403.

# (3) admin CRUD through the endpoints
#     With an owner token: POST/PATCH/DELETE /api/admin/jobs, then
#     /api/admin/jobs/publish|unpublish|archive and the articles equivalents.

# (5) neutral reset message
#     Request a reset for a known admin email and for a random address;
#     both must render exactly:
#     "If an account exists for this email, a reset link has been sent."
```

Nothing in section 3 was marked PASS without execution; these three remain open until a real
Firebase project exists. The Supabase half of the system is fully verified against live data.
