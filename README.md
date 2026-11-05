# Pharma Point

Pharma Point website: a **public job board** (clean light theme) plus a **Firebase
Authentication–guarded admin console**, with **Supabase** for data.

## TL;DR

- The public site (`/`, `/jobs`, `/jobs/:id`, `/apply`, `/about`, `/contact`, `/privacy`, `/disclaimer`)
  shows **published jobs only**, read with the Supabase **anon key** (enforced by RLS). When no jobs are
  published yet, it shows clearly badged **illustrative sample vacancies**.
- Candidates apply on **`/apply` with no login and no account**: name, surname, phone, email, location,
  role (dropdown), optional cover note and a resume file (PDF/DOC/DOCX ≤ 3 MB). One application per
  email per role title — including when the same role is offered by **another company** (blocked with
  409 and marked with a "＋ already applied" badge).
- Admins sign in with **Firebase email + password** (`/admin/login`). **Candidates never sign in** —
  there is no client login anywhere in the apply flow.
- Admin authorization is a **Firebase custom claim** (`admin: true`) — never a client-readable flag.
- Admin access additionally requires the address to be on the server-side **`ADMIN_EMAILS` allowlist**
  (currently two addresses, configured in `.env.local`); both checks must pass.
- All admin data (jobs, articles, site content, leads, contact messages) lives in **Supabase Postgres**.
- All admin writes go through **serverless API routes** that verify the Firebase ID token and then write
  to Supabase with the **service role key** (server-only).

## Environment variables

Copy `.env.example` → `.env.local` and fill in real values. **Names only** are listed here; never commit
real values.

### Client (public config, safe in the browser)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=
```

### Server only

```
FIREBASE_SERVICE_ACCOUNT_JSON=
# or:
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
# Comma-separated admin allowlist (see "Admin email allowlist")
ADMIN_EMAILS=
```

The Supabase **anon** key is used for public reads only. The **service role** key bypasses RLS and must never
be prefixed with `VITE_` / `NEXT_PUBLIC_` and must never reach the browser.

## Public website

- **Theme:** clean light layout on white / light-gray (`#f8f9fa`) bands, deep-green branding
  (`#0f5132` / `#0b3d26`), lime accent CTAs (`#bef264`) — dark-green top contact bar, white header
  with a lime **Apply** button, horizontal full-width job rows with a right-aligned badge and
  divider, dark-green rounded CTA banner, light footer (`src/index.css` holds the design tokens).
  The theme matches https://pharma-careers.ai.studio/; `npx tsx scripts/check-public-theme.ts`
  asserts it on every public route (56/56).
- **Pages:** Home (hero + keyword/location search, department chips, Latest Job Alerts), All Jobs
  (search + department filters via URL params), Job detail, **Apply** (the application form), About,
  Contact, Privacy Policy, Disclaimer. Header nav: Home / All Jobs / About / Contact plus a lime
  **Apply** CTA button; footer links to About / Contact / Privacy Policy / Disclaimer.
- **Job data:** `src/lib/publicJobs.ts` fetches `status='published'` rows through the anon client
  (`src/lib/publicSupabase.ts`). If Supabase is unconfigured or nothing is published, the site falls
  back to built-in sample vacancies — every card and detail page carries an
  **"Illustrative sample vacancy"** badge and the section is labelled "Sample Job Alerts".
- **Contact form:** `POST /api/contact` (public, no auth) — Zod-validated, rate-limited (5/min per
  IP), stored with the service-role key. The anon key cannot write to `contact_messages` (RLS), so
  this endpoint is the only public write path. Covered by `npm run smoke:contact` (7/7).
- The admin console keeps its own dark, self-contained styling and no public header/footer.

## Applying for a job (public, no login)

- **`/apply`** is a standalone page (also linked from the header nav and from every real job page via
  *Apply for this role* → `/apply?job=<id>`, which pre-selects the role). There is **no sign-in, no
  password and no account** anywhere in this flow.
- **Fields:** first name, surname, email, phone number, location, role (dropdown), optional cover note,
  resume file (`.pdf` / `.doc` / `.docx`, max 3 MB — checked client-side *and* server-side by magic
  bytes, not just by extension).
- **Role dropdown:** published vacancies only, grouped by role title with an `<optgroup>`. When the same
  role exists at more than one company the group label reads `… — +2 more companies hiring`, and a
  yellow note lists the other companies.
- **One application per role:** `POST /api/check-application` (5/min per IP) returns the role titles an
  email has already applied for — at *any* company. Those options are prefixed with `＋` and labelled
  *already applied*, and submitting one is blocked with a clear message. The API returns `409` for a
  duplicate, and a unique index (`lower(email), lower(job_title)`) is the database-level backstop.
- **`POST /api/applications`** (5/min per IP): Zod-validated → target job must be `published` → resume
  decoded, size- and magic-byte-checked → stored in the **private `resumes` bucket** → row inserted
  with `job_title` and `company` snapshots (so deleting or renaming a vacancy never loses context).
- Resumes are readable **only** by admins, through short-lived signed URLs minted by the admin API.

## Firebase setup (admin)

1. Create a Firebase project at https://console.firebase.google.com.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Add **Authorized domains** (e.g. `localhost`, your production domain).
4. Customize the **Password reset email** template under Authentication → Templates → Password reset email;
   set the action URL (e.g. `https://<your-domain>/admin/login`).
5. Create the admin user in **Authentication → Users** (email + password).

### Grant the admin custom claim

```bash
# Preferred
FIREBASE_SERVICE_ACCOUNT_JSON="…" node scripts/set-admin.js --email owner@example.com

# Or with individual credentials
FIREBASE_PROJECT_ID=… FIREBASE_CLIENT_EMAIL=… FIREBASE_PRIVATE_KEY=… \
  node scripts/set-admin.js --uid <firebase-uid>
```

The script calls `auth.setCustomUserClaims(uid, { admin: true })`.

## Admin auth flow

- Client: `signInWithEmailAndPassword` (Firebase), `sendPasswordResetEmail`, `signOut`.
- Forgot password: `sendPasswordResetEmail`; always shows the neutral message
  `If an account exists for this email, a reset link has been sent`.
- Client cooldown: 60s on the reset button to prevent spamming.
- Server endpoints (`api/admin/*`): bearer token (`Authorization: Bearer <id-token>`) or secure httpOnly
  session cookie (created via Firebase `createSessionCookie`) → verified with `firebase-admin`
  (`verifyIdToken` / `verifySessionCookie` with `checkRevoked: true`) → require `decodedToken.admin === true`.
- Missing/invalid token → `401`; valid token without admin claim → `403`.
- Admin writes go to Supabase with the service role key.

## Admin endpoints

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/me` | GET | Admin status check |
| `/api/admin/logout` | POST | Clears the httpOnly session cookie (client also calls Firebase `signOut()`) |
| `/api/admin/jobs` | GET, POST, PATCH, DELETE | List / create / update / delete jobs |
| `/api/admin/jobs/publish` | POST | Publish job |
| `/api/admin/jobs/unpublish` | POST | Unpublish job |
| `/api/admin/jobs/archive` | POST | Archive job |
| `/api/admin/articles` | GET, POST, PATCH, DELETE | List / create / update / delete articles |
| `/api/admin/articles/publish` | POST | Publish article |
| `/api/admin/articles/unpublish` | POST | Unpublish article |
| `/api/admin/articles/archive` | POST | Archive article |
| `/api/admin/site-content` | GET, PUT | Read / upsert site content |
| `/api/admin/leads` | GET, PATCH, DELETE | List / update / delete viewing leads |
| `/api/admin/contact-messages` | GET, DELETE | List / delete contact messages |
| `/api/admin/applications` | GET, PATCH, DELETE | List applications **grouped by role → company**, change status, `?resume=<id>` → 1-hour signed resume URL, `?jobId=` → one vacancy |
| `/api/contact` | POST | Public contact form (Zod-validated, 5/min per IP, service-role insert) |
| `/api/applications` | POST | Public job application (name, surname, phone, location, role, resume ≤ 3 MB; 5/min per IP; duplicate role → 409) |
| `/api/check-application` | POST | Public duplicate check — returns role titles an email already applied for (drives the "＋" badges; 5/min per IP) |

## Admin email allowlist

Admin authorization is **two independent server-side checks, both mandatory**:

1. Firebase custom claim `admin === true` (verified with `verifyIdToken` / `verifySessionCookie`,
   `checkRevoked = true`), and
2. the verified token's email appearing in the `ADMIN_EMAILS` environment variable.

`ADMIN_EMAILS` is a comma-separated, server-only variable (never `VITE_`-prefixed):

```
ADMIN_EMAILS=first.admin@gmail.com,second.admin@gmail.com
```

- Matching is case-insensitive and whitespace-tolerant.
- The two live addresses are set in `.env.local` (gitignored) — **not** in `.env.example` or this README,
  and they must be set again as a Vercel environment variable for production.
- Behaviour when the variable is empty:
  - **production → fail closed**: every admin request is rejected with 403 until `ADMIN_EMAILS` is set;
  - **development → claim-only**, so local work is not blocked by a missing variable.
- A valid admin whose address is not on the list gets **403** on every `/api/admin/*` route (and sees the
  access-denied page in the dashboard).
- `scripts/set-admin.js` warns if it grants the claim to an address that is not on the allowlist, so the
  two checks can never drift apart unnoticed.
- Covered by `scripts/smoke-allowlist.ts` (12 assertions, see `VERIFICATION.md`).

## Security notes

- Firebase email/password sign-up cannot be fully disabled on the free tier; anyone may create a Firebase
  account. This is safe **only** because every admin endpoint requires the `admin: true` custom claim.
- Even with the claim, an address outside `ADMIN_EMAILS` is rejected with 403 — a leaked or mistakenly
  granted claim is not enough on its own.
- Admin status is a **server-verified Firebase custom claim** — never a client-readable field or localStorage flag.
- The Firebase service account / Supabase service role key exist only on the server and must never be
  shipped to the browser or prefixed with `VITE_` / `NEXT_PUBLIC_`.
- Rate limiting is applied on admin endpoints (per IP) and the password-reset flow (client cooldown + Firebase
  server-side rate limits).

## Supabase RLS

- `jobs` / `articles`: RLS enabled; anon may SELECT only `status = 'published'`. No insert/update/delete
  policies for anon or `authenticated` — writes only via service role from server.
- `site_content`: public SELECT; no public writes.
- `leads` / `contact_messages`: RLS enabled, no public policies; written/read only by server with service role.
- `applications`: RLS enabled and **no public policies at all** (candidate PII). Anon `SELECT` returns
  0 rows, anon `INSERT` is denied — submissions only via `/api/applications` (service role) and review
  only in the console. The `resumes` storage bucket is **private** (3 MB, PDF/DOC/DOCX only): uploads
  happen server-side and downloads go through admin-minted signed URLs.

## Admin console

`/admin` renders `AdminShell` — one `/api/admin/me` guard, then a sidebar over three pages:

| Page | Route | What it does |
|---|---|---|
| Dashboard | `/admin/dashboard` | Published/draft job counts, total + new applications, quick actions, recent applications |
| Jobs | `/admin/jobs` | Create / edit / publish / unpublish / archive / delete vacancies (title, company, location, work model, type, level, department, salary, description, requirements, status) |
| Applications | `/admin/applications` | Candidates grouped **per role**, then **per company** — full name, email, phone, location, applied date, resume (opens from the private bucket), expandable cover note, status pipeline (`new → reviewing → shortlisted → interviewed → offered → hired / rejected`), delete |

## Verify

### Automated checks actually run on this scaffold

| Check | Result |
|---|---|
| `npx tsc --noEmit` (client + API + config) | ✅ PASS |
| `npm run build` (Vite production build) | ✅ PASS |
| Client bundle (`dist/assets/*.js`) scanned for `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `service_role`, `private_key`, `-----BEGIN`, admin emails, `ADMIN_EMAILS`, both real admin passwords | ✅ PASS — 0 matches. (The Firebase **web API key** `AIza…` and the Supabase **anon key** are present — public by design, gated by RLS + the admin claim. An earlier version of this row claimed those were absent; corrected 2026-10-30.) |
| `scripts/smoke-admin-me.ts` → unauthenticated request to `GET /api/admin/me` | ✅ PASS — returned `401 {"error":"Unauthorized"}` |
| `scripts/smoke-admin-me.ts` → request with invalid bearer token | ✅ PASS — returned `401 {"error":"Unauthorized"}` |
| `scripts/smoke-admin-me.ts` → unsupported method | ✅ PASS — returned `405` |
| `scripts/smoke-allowlist.ts` → 12 assertions on the `ADMIN_EMAILS` allowlist (both configured addresses allowed, outsider denied → 403, case-insensitive match, 401 never upgraded, fail-closed in production, claim-only in development) | ✅ PASS — 12/12 |
| Client bundle re-scanned after the allowlist change for admin emails / `ADMIN_EMAILS` / service keys | ✅ PASS — no matches |
| `scripts/smoke-rls.ts` → live RLS + write-path suite against the real Supabase project (anon select/insert/update/delete across all 5 tables, service-role CRUD) | ✅ PASS — 28/28, test rows cleaned up |
| `npm run check:firebase` → readiness report against the real Firebase project (users, claims, web config, service account, allowlist) | ✅ PASS — `OVERALL: READY` |
| `scripts/smoke-admin-live.ts` → live admin endpoint suite: real Firebase Auth REST sign-ins driving the real handlers + real Supabase writes (401/403 matrix, allowlist isolation, claim requirement, session cookie, full jobs + articles CRUD with publish/unpublish/archive, site content, leads, contact messages, Zod 400/405, per-IP 429, logout) | ✅ PASS — 50/50, final state CLEAN |
| `scripts/test-login-ui.ts` → headless Chromium against `npm run dev` with the real Firebase client SDK (neutral reset message for existing + non-existing emails, ticking 60 s cooldown, generic sign-in error) | ✅ PASS — 4/4 |
| `scripts/smoke-contact.ts` → public contact endpoint (201 + stored, anon cannot read messages, Zod 400, 405, per-IP 429 after 5, different IP unaffected) | ✅ PASS — 7/7, rows cleaned up |
| `scripts/screenshot-pages.ts` → every page rendered in headless Chromium; console/page errors collected | ✅ PASS — 8 pages, 0 errors |
| `scripts/smoke-applications.ts` → live applications suite: Zod validation, fake-PDF magic bytes, draft/unknown job 404, per-IP 429, full candidate record stored (surname/phone/location/company), **duplicate rule** (same email + same job → 409, same role at *another* company → 409 with the other company named), `/api/check-application` badges, anon RLS (0 rows / write denied), admin role→company grouping, status PATCH, signed resume URL that downloads a real PDF, DELETE removes row **and** storage object (re-sign → `Object not found`), re-apply allowed after delete | ✅ PASS — **43/43**, DB + bucket left at 0 |
| `scripts/check-console-ui.ts` → headless Chromium tour: sign in → dashboard → create + publish a job through the UI → appears on public `/jobs` → job page has the Apply button and **no login prompt** → `/apply?job=` pre-selects the role → empty-form validation → real PDF submitted → application visible in the console under its **role and company** with name, phone, location and resume → the same email shows the `＋ already applied` marker and is blocked from applying twice | ✅ PASS — **21/21**, test data cleaned up |

All live suites clean up after themselves (database back to 0 rows, temporary probe user deleted,
admin claims restored).

> Full PASS/FAIL evidence, including the three bugs the first live run caught and how they were fixed,
> is in `VERIFICATION.md`.

The full, per-requirement PASS/FAIL matrix — including the four live checks still open and exactly how to
close them — lives in [`VERIFICATION.md`](./VERIFICATION.md).
