# Deployment

Pharma Careers stores all content, administrator accounts, sessions, messages, reports and
uploaded resumes in a libSQL database. Production deployments use a remote
[Turso](https://turso.tech) database; the application never writes to the deployment filesystem.

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

Remote databases are accessed through the HTTP/WebSocket client (`@libsql/client/web`), so the
production bundle does not depend on the platform-specific native SQLite addon. The native client
is used only for the local `file:` database during development.

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
Production, Preview and Development.

Required Vercel variables:

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
`./data/pharma-careers.db`). That directory is created only on a local machine. On Vercel, the
application throws a clear configuration error if `TURSO_DATABASE_URL` is missing instead of
trying to write to the read-only filesystem.
