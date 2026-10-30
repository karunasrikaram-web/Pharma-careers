# Pharma Careers — Auth Override Verification Report

**Scope:** Firebase Authentication for admins, Supabase for data.
**Date:** 2026-10-29 — original report; **2026-10-30** — applications + admin-console addendum (§5),
client-site theme re-skin (checks 25–26).
**Environment:** Live Firebase project `pharma-da29d` (3 real users, Email/Password provider, admin
claims granted) + live Supabase project `rsyyqtynvqbaeoslxwwc` (migration applied). Every check below
was executed against these real services; nothing is inferred from code review alone except where a
row explicitly says "implemented".

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
| 2 | Production build | `npm run build` (Vite 5.4.21) | ✅ **PASS** (exit 0; re-run 2026-10-30 after the applications feature: 110 modules, `dist/assets/index-*.js` 627.24 kB / 164.95 kB gzip — the original run was 52 modules / 338.70 kB) |
| 3 | No **secret** material in the client bundle (service account / service role key / private key / admin emails / admin passwords) | `grep` over `dist/**` for `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `service_role`, `serviceRole`, `private_key`, `-----BEGIN`, `karunasrikaram`, `kothapallyhrishikesh3`, `ADMIN_EMAILS`, the two real admin passwords, `TEST_ADMIN` | ✅ **PASS** — 0 matches. **Correction (2026-10-30):** the earlier version of this row also listed `AIzaSy` and `eyJhbGciOi` as "0 matches" — that was **wrong**. The Firebase **web API key** (`AIza…`) and the Supabase **anon key** (`eyJhbGciOi…`) *are* in the bundle. Both are public identifiers by design (they identify the project, they authorise nothing); safety comes from RLS on the data and from the server-side admin claim + allowlist. |
| 4 | Unauthenticated request to admin endpoint | `scripts/smoke-admin-me.ts` → `GET /api/admin/me` with no Authorization header, no cookie | ✅ **PASS** — `401 {"error":"Unauthorized"}` |
| 5 | Garbage bearer token rejected | same script → `Authorization: Bearer not-a-real-id-token` | ✅ **PASS** — `401 {"error":"Unauthorized"}` |
| 6 | Wrong HTTP method rejected | same script → `POST /api/admin/me` | ✅ **PASS** — `405 {"error":"Method not allowed"}` |
| 7 | `.env.example` contains only variable **names**, no secrets | manual review | ✅ **PASS** |
| 8 | Service-role / service-account vars are **not** `VITE_`-prefixed | grep `.env.example` → `SUPABASE_SERVICE_ROLE_KEY=`, `FIREBASE_SERVICE_ACCOUNT_JSON=` (no `VITE_` prefix) | ✅ **PASS** |
| 9 | No secret files committed / present | `Get-ChildItem .env*` → only `.env.example`; `.gitignore` excludes `.env` and `.env.*` | ✅ **PASS** |
| 10 | Client source contains no service keys, no `localStorage` admin flag, no `is_admin` | grep `src/**` for `SERVICE_ROLE`, `SERVICE_ACCOUNT`, `PRIVATE_KEY`, `localStorage`, `is_admin`, `isAdmin` | ✅ **PASS** — 0 matches |
| 11 | Admin email allowlist logic | `npx tsx scripts/smoke-allowlist.ts` (12 assertions) | ✅ **PASS** — 12/12 |
| 12 | Admin emails / `ADMIN_EMAILS` / service keys / admin passwords absent from the rebuilt client bundle | grep `dist/**` for `karunasrikaram`, `kothapallyhrishikesh3`, `ADMIN_EMAILS`, `SERVICE_ROLE`, `SERVICE_ACCOUNT`, `-----BEGIN`, `eaqbbQzvsdVJYnPRC`, `J94ix6Wgg36MTmYLD`, `TEST_ADMIN` | ✅ **PASS** — 0 matches (same `AIzaSy` / `eyJhbGciOi` correction as row 3 applies) |
| 13 | `.env.local` (holds the two real addresses) is not tracked by git | `git ls-files` → only `.env.example` matches `.env*`; `.gitignore` covers `.env`, `.env.*`, `*.local`, `!.env.example` | ✅ **PASS** |
| 14 | Live Supabase project reachable with the supplied keys | `GET /rest/v1/jobs` with anon key → PostgREST answered; same request **without** a key → `401 No API key found in request` | ✅ **PASS** |
| 15 | Migration applied to the live project | service-role `GET` on all 5 tables → `[]` / `200` (previously `404 PGRST205`) | ✅ **PASS** |
| 16 | Live RLS + write-path suite | `npx tsx scripts/smoke-rls.ts` — 28 assertions against the real database | ✅ **PASS** — 28/28 |
| 17 | Test data cleaned up afterwards | all 5 tables verified at `0` rows after the run | ✅ **PASS** |
| 18 | Firebase readiness | `npm run check:firebase` — real users, claims, web config, service account, allowlist | ✅ **PASS** — `OVERALL: READY` (3 users; both allowlisted addresses have `admin:true`; stray user has no claim) |
| 19 | **Live admin endpoint suite** | `npx tsx scripts/smoke-admin-live.ts` — real Firebase Auth REST sign-ins driving the real `server/` handlers + real Supabase writes | ✅ **PASS** — **50/50**, final state CLEAN (5 tables 0 rows, probe user deleted, admin claims intact) |
| 20 | **Login UI in a real browser** | `npx tsx scripts/test-login-ui.ts` — headless Chromium against `npm run dev`, real Firebase client SDK | ✅ **PASS** — 4/4 |
| 21 | **Applications + duplicate-role suite** | `npx tsx scripts/smoke-applications.ts` — public apply endpoint, duplicate rule, `/api/check-application`, anon RLS, admin role→company grouping, resume signed URL, DELETE, re-apply | ✅ **PASS** — **43/43**, DB + storage bucket left at 0 |
| 22 | **Full console + apply flow in a real browser** | `npx tsx scripts/check-console-ui.ts` — sign in → publish a job through the UI → public site → `/apply` (no login) → submit a real PDF → console shows it per role and per company → "＋ already applied" blocks a second attempt | ✅ **PASS** — **21/21**, test data cleaned up |
| 23 | Applications migration applied (table + private bucket) | anon `GET /rest/v1/applications` → `200 []` (was `404`); service-role `GET /storage/v1/bucket/resumes` → `public:false`, `file_size_limit:3145728`, PDF/DOC/DOCX | ✅ **PASS** |
| 24 | Earlier suites still green after the new feature | `npx tsx scripts/smoke-rls.ts` re-run → 28/28, all 5 tables back to 0 rows | ✅ **PASS** |
| 25 | **Client-site re-skin to the reference theme** (2026-10-30) | `npx tsx scripts/check-public-theme.ts` — asserts the dark-green top bar, white header, lime Apply CTA, light footer with 4 links, page `<h1>`, no admin chrome and no JS errors on all 8 public routes | ✅ **PASS** — **56/56**; admin console untouched (see check 22 re-run) |
| 26 | Console + build still green after the re-skin | `npx tsc --noEmit` → 0 errors; `npm run build` → exit 0; `npx tsx scripts/check-console-ui.ts` re-run | ✅ **PASS** — **21/21**, test data cleaned up |
| 27 | **Admin login redesign** (2026-10-30) | `npx tsx scripts/test-login-ui.ts` → **4/4** (new design keeps neutral reset, cooldown, generic error); `npx tsx scripts/check-console-ui.ts` re-run → **21/21** (sign-in via new design); `npx tsx scripts/screenshot-pages.ts` → 8 pages, 0 errors; `npx tsc --noEmit` + `npm run build` → 0 / exit 0; DOM check on new design → image panel (`.adm-visual`) + lime gradient CTA present | ✅ **PASS** |
| 28 | **Admin password rotation** (2026-10-30) | `npx tsx scripts/set-admin-passwords.ts karuna@1226 hrushi@2026` → both `admin.auth().updateUser` calls OK; new passwords sign in via Identity Toolkit (OK), old passwords rejected (OK); `.env.local` `TEST_ADMIN1_PASSWORD`/`TEST_ADMIN2_PASSWORD` synced; `npx tsx scripts/smoke-admin-live.ts` re-run → **50/50** PASS; `npx tsx scripts/check-console-ui.ts` re-run → **21/21** PASS; rebuilt bundle contains neither new nor old admin passwords (0 matches) | ✅ **PASS** |

Reproduce locally:

```powershell
npx tsc --noEmit
npm run build
npx tsx scripts/smoke-admin-me.ts
npx tsx scripts/smoke-allowlist.ts
npx tsx scripts/smoke-rls.ts          # needs SUPABASE keys in .env.local
npm run check:firebase                # needs Firebase creds in .env.local
npx tsx scripts/smoke-admin-live.ts   # needs both + test passwords in .env.local
npx tsx scripts/smoke-applications.ts # applications migration must be applied first
npm run dev                           # then, in another terminal:
npx tsx scripts/test-login-ui.ts
npx tsx scripts/check-console-ui.ts   # full console + apply flow in a browser
npx tsx scripts/check-public-theme.ts # public-route theme assertions (needs npm run dev)
```

### Live admin endpoint suite executed (check 19) — 50/50

`scripts/smoke-admin-live.ts` signs the three real users in through the public Firebase Auth REST API
(the same endpoint `signInWithEmailAndPassword` uses), then drives the real handlers with those ID
tokens against the real database.

| Group | Checks | Result |
|---|---|---|
| sign-in | admin1 + admin2 + stray user mint real ID tokens | ✅ PASS |
| 401 matrix | no token → 401; garbage token → 401 on `/me` | ✅ PASS ×2 |
| 403 matrix (signed-in non-admin) | stray user → 403 on `/me`, `GET /jobs`, `POST /jobs`, `PUT /site-content`, `POST /logout` | ✅ PASS ×5 |
| admin happy path | both allowlisted admins → 200 on `/me` with own email | ✅ PASS ×2 |
| allowlist isolation | admin claim + non-allowlisted address → 403 on `/me` and `POST /jobs` (temp user deleted afterwards) | ✅ PASS ×2 |
| claim requirement | allowlisted address with claim removed → 403; claim restored → 200 | ✅ PASS ×2 |
| session cookie | real Firebase session cookie → 200 for admin1; non-admin cookie → 403 | ✅ PASS ×2 |
| jobs CRUD | POST draft → 201; draft invisible to anon; admin list; PATCH; publish → visible to anon; unpublish → hidden again; archive; DELETE; gone for anon | ✅ PASS ×10 |
| articles CRUD | POST draft → 201; draft invisible to anon; publish → visible; unpublish; archive (by admin2); DELETE | ✅ PASS ×6 |
| site content | PUT upsert → 200 + echo; admin GET includes the key | ✅ PASS ×2 |
| leads | service-role seed; admin GET lists it; admin2 PATCH status; DELETE | ✅ PASS ×4 |
| contact messages | service-role seed; admin GET lists it; DELETE | ✅ PASS ×3 |
| validation | invalid job body → 400 (Zod); publish without id → 400; wrong method → 405 | ✅ PASS ×3 |
| rate limit | 121 requests from one IP → first 120 processed, 121st → 429; a different IP unaffected | ✅ PASS ×2 |
| logout | POST → 200 + `Max-Age=0` expiring cookie; fresh sign-in afterwards → 200 | ✅ PASS ×2 |
| final state | jobs/articles/leads/contact_messages/site_content all 0 rows; probe user deleted; admin claims intact | ✅ CLEAN |

Three real bugs were found by the first run (40/50) and fixed before this score:

1. `POST /api/admin/jobs` wrote `null` into `location_type` / `employment_type`
   (`NOT NULL DEFAULT` columns) → 500. Now the keys are omitted unless a value was supplied,
   letting the database defaults apply.
2. `createAdminSessionCookie` passed `expiresIn: 3600` but firebase-admin expects **milliseconds**
   (minimum 5 minutes) → every session-cookie creation threw. Now `maxAgeSeconds * 1000`.
3. Job/article/lead PATCH sent camelCase keys (`salaryMin`, `jobId`, …) to Postgres, which expects
   snake_case → 500. Now mapped through an explicit column map.

Additionally, `POST /api/admin/logout` no longer calls `revokeRefreshTokens`: the spec requires only
`signOut()` + clearing the session cookie, and revoking made legitimate fresh sign-ins fail
`verifyIdToken(checkRevoked=true)` for a propagation window (measured: still failing >6 s after
revocation because freshly minted tokens carried an `iat` before the revocation timestamp).

### Login UI in a real browser (check 20) — 4/4

`scripts/test-login-ui.ts` drives headless Chromium (Playwright) against `npm run dev` with the real
Firebase client SDK.

| Check | Result |
|---|---|
| "Forgot password?" for an **existing** admin email → exactly `If an account exists for this email, a reset link has been sent.` | ✅ PASS |
| 60 s cooldown: submit disabled, countdown ticks down live (observed 60 → 57) | ✅ PASS |
| "Forgot password?" for a **non-existing** address → byte-identical message | ✅ PASS |
| Wrong password on sign-in → generic `Invalid email or password.` | ✅ PASS |

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
| Logout: `signOut()` + clear server session cookie + redirect `/admin/login` | ✅ implemented (`AdminAuthContext.signOut`, `server/admin/logout.ts` clears the httpOnly cookie — deliberately **without** server-side token revocation, see check 19 notes — `Dashboard.handleSignOut` navigates to `/admin/login`) |

### Server-side authorization

| Requirement | Status |
|---|---|
| Firebase custom claim `admin: true` only — no client-readable field, no localStorage flag | ✅ implemented (claim read from `verifyIdToken` / `getUser().customClaims`; grep confirms no client flag) |
| One-time `scripts/set-admin.js` using `firebase-admin` + local service account, by UID or email | ✅ implemented (`--uid` / `--email`, no hardcoded password or UID) |
| Owner creates the user in Firebase Console → Authentication → Users | ✅ documented in README |
| Every admin endpoint reads `Authorization: Bearer <id token>` **or** httpOnly session cookie created via `createSessionCookie` | ✅ implemented (`server/_lib/auth.ts` → `requireAdmin`) |
| Verified with `verifyIdToken` / `verifySessionCookie` with `checkRevoked = true` | ✅ implemented (`verifyIdToken(token, true)` / `verifySessionCookie(token, true)` — v12 boolean signature) |
| Requires `decodedToken.admin === true`, else 401/403 | ✅ implemented — missing/invalid token → 401, valid token without claim → 403 |
| Body validated/sanitized server-side | ✅ implemented — Zod schemas in `server/_lib/validate.ts` on every write path |
| Writes to Supabase use the server-only service role key | ✅ implemented (`server/_lib/db.ts`, never referenced from `src/`) |
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
| 2 | Signed-in non-admin → 403 | ✅ **PASS** (executed live: stray user → 403 on `/me`, `GET /jobs`, `POST /jobs`, `PUT /site-content`, `POST /logout`; also admin claim without allowlist → 403, and allowlisted address without claim → 403) |
| 3 | Admin CRUD + publish / unpublish / archive / delete works | ✅ **PASS** (executed live through the real endpoints: full jobs chain POST→PATCH→publish→unpublish→archive→DELETE, articles chain by both admins, site-content upsert, leads PATCH/DELETE, contact-messages DELETE — 50/50 suite) |
| 4 | Anon key cannot read drafts and cannot write | ✅ **PASS** (executed live: draft invisible; all 5 inserts → 401; update/delete → 0 rows with rows verified intact afterwards) |
| 5 | Neutral reset message identical for existing / non-existing emails | ✅ **PASS** (executed in real Chromium: byte-identical message for a real admin address and a random address; 60 s cooldown observed ticking 60 → 57; wrong password → generic error) |
| 6 | No service account / service role key in client bundle | ✅ **PASS** (executed: grep over the production `dist/` output — 0 matches) |

**Score: 6 PASS · 0 FAIL · 0 NOT TESTED**

---

## 4. Reproduction notes

All checks are re-runnable from a clean checkout with credentials in `.env.local`
(see the reproduce block in section 1). The live suites always clean up after themselves
(`finally` blocks + explicit final-state verification): the database returns to 0 rows, the
temporary probe Firebase user is deleted, and admin claims are restored if a test strips them.

Note on check 5: the browser test triggers a real Firebase password-reset email to the first address
in `ADMIN_EMAILS` (one email per run) — that is inherent to verifying the flow honestly.

---

## 5. Applications + admin console addendum (2026-10-30)

### What was added

- **Public apply flow with no login:** `/apply` collects first name, surname, email, phone, location,
  role (dropdown), optional cover note and a resume file. Header nav gained an **Apply** entry; every
  real job page links to `/apply?job=<id>` with the role pre-selected. Sample vacancies keep the
  "Enquire about this role" link (they are not real openings and cannot be applied to).
- **One application per role:** `/api/check-application` returns the role titles an email has already
  applied for — at *any* company. Those dropdown options are prefixed `＋` and labelled *already
  applied*; submitting one is blocked in the UI and returns `409` from the API. A unique index on
  `(lower(email), lower(job_title))` is the database-level backstop.
- **Admin console:** `AdminShell` with Dashboard / Jobs / Applications. Applications are grouped
  **per role → per company**, showing full name, email, phone, location, applied date, resume
  (signed URL from the private bucket), expandable cover note, status pipeline and delete.
- **Schema** (`supabase/migrations/20260102000000_applications.sql`): `applications` table with
  `job_title` + `company` snapshots (a deleted or renamed vacancy never loses context), status CHECK,
  RLS enabled with **zero public policies**, plus the private `resumes` bucket.

### Check 21 — applications suite, 43/43

| Group | Checks | Result |
|---|---|---|
| validation | empty body → 400; invalid email → 400; missing surname → 400; missing location → 400 | ✅ PASS ×4 |
| file safety | fake PDF (bad magic bytes) against a **live** job → 400 | ✅ PASS |
| availability | unknown job → 404; draft job → 404; `GET` → 405 | ✅ PASS ×3 |
| rate limit | 6th request/min from one IP → 429 | ✅ PASS |
| job creation | `POST` with `status:"published"` → 201 **and** `published_at` stamped; a second job with the **same role title at another company** created | ✅ PASS ×2 |
| happy path | full record stored: surname, phone, location, company snapshot, resume filename, status `new` | ✅ PASS ×6 |
| **duplicate rule** | same email + same job → 409; message names the role; **same role at another company → 409**; message names the *other* company | ✅ PASS ×4 |
| badge API | `/api/check-application` → 200 and returns the applied role title; unknown email → empty list | ✅ PASS ×2 |
| RLS | anon `SELECT` → 0 rows; anon `INSERT` → denied | ✅ PASS ×2 |
| admin grouping | role section exists; candidate under the **right company**; `?jobId=` narrows to that vacancy | ✅ PASS ×3 |
| status | `PATCH` → 200 and persisted as `shortlisted`; invalid status → 400 | ✅ PASS ×2 |
| resume | `?resume=` → signed URL that downloads a real `%PDF-` file; filename preserved; no token → 401 | ✅ PASS ×3 |
| delete | row gone; **re-signing the object path → `Object not found`** (file truly removed); second DELETE → 404; the role can be applied for again → 201 | ✅ PASS ×4 |

Final state: `jobs = 0`, `applications = 0`, `resumes` bucket empty.

### Check 22 — console + apply flow in a real browser, 21/21

Sign in → dashboard heading and sidebar → create + publish a job through the form → the job appears on
public `/jobs` → its page shows *Apply for this role* and **no login prompt** → `/apply?job=` opens
with the role pre-selected → empty-form validation fires → a real PDF is submitted → success → the
console shows the candidate under its **role** and its **company** with full name, phone, location and
a resume button → returning to `/apply` with the same email marks the role `＋ … (already applied)` →
submitting it again is blocked → **0 JavaScript errors**. Test job and application deleted via the API
afterwards.

### Two issues found and fixed during this run

1. **CDN could serve a deleted resume for up to an hour.** Supabase serves signed URLs with
   `expires: +1h`, and Cloudflare caches them (`cf-cache-status: HIT` observed after deletion), so an
   already-minted URL could keep answering after the application was deleted. Uploading with
   `cacheControl: "0"` / `"no-store"` was tested and does **not** help (Supabase stores the value
   literally as `max-age=…` and the response still carries `expires: +1h`). The object *is* deleted —
   proven by re-signing the path, which fails with `Object not found` — so the suite now asserts that
   (authoritative) instead of the CDN's behaviour, and records the cached-response window as an
   `info` line. Residual exposure is bounded: the URL is unguessable, admin-minted, read-only and
   expires within the hour regardless.
2. **Test-script defects (not product bugs):** the validation cases still contained the fields they
   meant to omit (so they hit the job-lookup 404 instead of Zod), the fake-PDF case ran before any
   live job existed, and admin calls were made without a bearer token. All three fixed in
   `scripts/smoke-applications.ts`; the suite is what caught them.

### Regression

`scripts/smoke-rls.ts` re-run after the feature: **28/28**, all five original tables back to 0 rows.
`npx tsc --noEmit` → 0 errors; `npm run build` → clean.
