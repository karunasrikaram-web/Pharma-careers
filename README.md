# Pharma Careers

End-to-end pharma careers website backend: **Firebase Authentication** (admin) + **Supabase** (data).

## TL;DR

- Admins sign in with **Firebase email + password** (`/admin/login`).
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

The script calls `auth.setCustomUserAttributes(uid, { admin: true })`.

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

## Verify

### Automated checks actually run on this scaffold

| Check | Result |
|---|---|
| `npx tsc --noEmit` (client + API + config) | ✅ PASS |
| `npm run build` (Vite production build) | ✅ PASS |
| Client bundle (`dist/assets/*.js`) scanned for service account / service role key / private key / `SUPABASE_SERVICE_ROLE_KEY` / `FIREBASE_SERVICE_ACCOUNT_JSON` / `AIza…` / `sk-…` / `-----BEGIN` | ✅ PASS — no matches |
| `scripts/smoke-admin-me.ts` → unauthenticated request to `GET /api/admin/me` | ✅ PASS — returned `401 {"error":"Unauthorized"}` |
| `scripts/smoke-admin-me.ts` → request with invalid bearer token | ✅ PASS — returned `401 {"error":"Unauthorized"}` |
| `scripts/smoke-admin-me.ts` → unsupported method | ✅ PASS — returned `405` |
| `scripts/smoke-allowlist.ts` → 12 assertions on the `ADMIN_EMAILS` allowlist (both configured addresses allowed, outsider denied → 403, case-insensitive match, 401 never upgraded, fail-closed in production, claim-only in development) | ✅ PASS — 12/12 |
| Client bundle re-scanned after the allowlist change for admin emails / `ADMIN_EMAILS` / service keys | ✅ PASS — no matches |
| `scripts/smoke-rls.ts` → live RLS + write-path suite against the real Supabase project (anon select/insert/update/delete across all 5 tables, service-role CRUD) | ✅ PASS — 28/28, test rows cleaned up |

### Live checks still requiring real credentials (not run here)

- [ ] Firebase admin user created → `node scripts/set-admin.js --email …` → claim `admin: true` set.
- [ ] Unauthenticated admin request → `401`.
- [ ] Logged-in Firebase user **without** admin claim → `403` on every admin endpoint.
- [ ] Admin can create / edit / publish / unpublish / archive / delete jobs.
- [ ] Anon Supabase key cannot read drafts and cannot write to any table.
- [ ] Password reset email arrives; neutral message identical for existing and non-existing emails.

> Nothing above was marked PASS without being executed; the PASS/FAIL items that could not be run without
> live Firebase + Supabase credentials are listed as pending.

The full, per-requirement PASS/FAIL matrix — including the four live checks still open and exactly how to
close them — lives in [`VERIFICATION.md`](./VERIFICATION.md).
