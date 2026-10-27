# Deployment

Pharma Careers stores all content, administrator accounts, sessions, messages, reports and
uploaded resumes in a libSQL database. Production deployments should use a remote
[Turso](https://turso.tech) database. When no remote database is configured, the public
site runs in read-only demo mode from a sanitized content snapshot that is committed to
the repository.

## Read-only fallback (zero configuration)

If `TURSO_DATABASE_URL` is not set on a serverless host, the application:

- Copies the committed `db/fallback.db` snapshot into the writable temp directory.
- Opens it with `PRAGMA query_only = ON` and skips migrations.
- Serves the public pages with the sample jobs and articles in that snapshot.
- Rejects every write: contact messages, job reports, job alerts, applications and admin
  sign-in return an honest "read-only demo mode" message.
- Shows a "Demo mode" banner above the site header.

`db/fallback.db` contains only the clearly labelled demo content: no administrator
accounts, sessions, login attempts, messages, reports, user details or resumes. To enable
the full site (real content, forms and the admin area), configure Turso as described
below. Nothing in the application writes to the deployment filesystem; the temp copy
exists only because SQLite needs a writable directory for its journal files.

## Why not a local SQLite file?

The previous data layer opened `./data/pharma-careers.db` and called `mkdir` for its parent
directory. On Vercel the working directory is `/var/task`, which is read-only, so the first page
request failed with:

```
ENOENT: no such file or directory, mkdir '/var/task/data'
```

A file in a serverless deployment is also ephemeral: it would not be shared between instances and
would disappear on the next deployment. The application has been migrated to `@libsql/client`,
which works with both a remote Turso database and a local file during development.

Remote databases are accessed through the HTTP/WebSocket client (`@libsql/client/web`), so a
deployment with Turso configured does not depend on the platform-specific native SQLite addon.
The native client is used for the local `file:` database during development and for the
read-only fallback snapshot.

## 1. Create the database

```bash
turso db create pharma-careers
turso db show pharma-careers --url
turso db tokens create pharma-careers
```

## 2. Configure the environment

Set these variables locally (for example in `.env.local`) when running migration and admin
commands against the remote database:

```
TURSO_DATABASE_URL=libsql://<database>-<org>.turso.io
TURSO_AUTH_TOKEN=<token>
```

Set the same two variables in the Vercel project (Project → Settings → Environment Variables) for
Production, Preview and Development. Without them the site still loads, but only in read-only
demo mode with the bundled sample content.

Required Vercel variables for full functionality:

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Remote database URL |
| `TURSO_AUTH_TOKEN` | Remote database token |
| `APP_SECRET` | Hashes IP addresses for rate limiting; required in production |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, for example `https://your-domain.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public contact address; leave blank if not available |

`DATABASE_PATH` is for local development only. Do not set it on Vercel.

## 3. Create the schema and accounts

Database migrations run automatically on first use. To apply them explicitly:

```bash
npm run db:migrate
```

Create the first administrator:

```bash
npm run admin:create -- --email admin@example.com --name "Site Owner"
```

The command prints a generated password once. Store it securely, or pass `--password` yourself.
To reset it later:

```bash
npm run admin:reset-password -- --email admin@example.com
```

Optional demo content (clearly labelled, removable with `npm run db:remove-demo`):

```bash
npm run db:seed
```

Check connectivity and record counts:

```bash
npm run test:db
```

After deploying, `GET /api/health` reports whether the live build can reach the database and
which commit is deployed. It never exposes credentials or content:

```json
{ "status": "ok", "database": "connected", "mode": "remote", "commit": "6ffbe35" }
```

`mode` is `remote` when Turso is configured, `local` for a local development file, and
`read_only_fallback` when the bundled demo snapshot is being served. The fallback still
returns HTTP 200 because the site is serving content; check `mode` to know whether writes
and the admin area are available.

## 4. Migrate existing local content

If the local database already contains real content, export it and load it into Turso before
going live:

```bash
# SQLite command-line tool
sqlite3 data/pharma-careers.db .dump > data-export.sql
turso db shell pharma-careers < data-export.sql
```

Then run `npm run db:migrate` and verify with `npm run test:db`. Keep the export file private: it
can contain contact messages, user details and password hashes.

## Local development

With no `TURSO_DATABASE_URL`, the application uses `DATABASE_PATH` (default
`./data/pharma-careers.db`). That directory is created only on a local machine. On a
serverless host with no remote database, the application serves the bundled read-only
snapshot instead of trying to write to the read-only filesystem.
