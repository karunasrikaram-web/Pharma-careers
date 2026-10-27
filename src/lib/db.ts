import type { Client, InStatement } from "@libsql/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Database access layer.
 *
 * Production deployments (including Vercel) should use a remote libSQL/Turso
 * database configured through TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. When no
 * remote database is configured, a serverless deployment serves a sanitized
 * snapshot of the demo content in read-only mode instead of failing outright.
 *
 * Local development falls back to a SQLite file on disk through DATABASE_PATH.
 */

export type DbValue = string | number | bigint | boolean | null | Uint8Array | Date;

export type DatabaseMode = "remote" | "local" | "read_only_fallback";

const FALLBACK_DATABASE_FILE = "fallback.db";
const READ_ONLY_ERROR =
  "This deployment is running in read-only demo mode. " +
  "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable saving data.";

export class ReadOnlyDatabaseError extends Error {
  constructor(message: string = READ_ONLY_ERROR) {
    super(message);
    this.name = "ReadOnlyDatabaseError";
  }
}

const globalForDb = globalThis as unknown as {
  __pharmaCareersClient?: Promise<Client>;
};

interface DatabaseConfig {
  url: string;
  authToken?: string;
  readOnly?: boolean;
}

/**
 * Hosts where the application directory is read-only and ephemeral. On these
 * platforms a local SQLite file can never hold persistent data, so either a
 * remote database is used or the bundled read-only snapshot is served.
 */
function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.FUNCTIONS_WORKER_RUNTIME,
  );
}

export function getDatabaseMode(): DatabaseMode {
  if (process.env.TURSO_DATABASE_URL?.trim()) return "remote";
  if (isServerlessRuntime()) return "read_only_fallback";
  return "local";
}

/**
 * True when this process is serving the bundled demo snapshot because no remote
 * database is configured. Writes are rejected in this mode.
 */
export function isReadOnlyFallback(): boolean {
  return getDatabaseMode() === "read_only_fallback";
}

function bundledFallbackPath(): string {
  const candidates = [
    path.join(process.cwd(), "db", FALLBACK_DATABASE_FILE),
    process.env.LAMBDA_TASK_ROOT
      ? path.join(process.env.LAMBDA_TASK_ROOT, "db", FALLBACK_DATABASE_FILE)
      : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `The bundled read-only content snapshot (db/${FALLBACK_DATABASE_FILE}) is missing from this deployment. ` +
      "Make sure db/fallback.db is committed and included in output file tracing.",
  );
}

/**
 * Copy the committed snapshot into the writable temp directory once per
 * process. SQLite needs a writable directory for its journal files even when
 * the database itself is only queried, so the read-only copy lives in /tmp.
 */
function prepareFallbackDatabase(): string {
  const source = bundledFallbackPath();
  const target = path.join(os.tmpdir(), "pharma-careers-read-only.db");

  let needsCopy = true;
  try {
    needsCopy = fs.statSync(target).size !== fs.statSync(source).size;
  } catch {
    needsCopy = true;
  }

  if (needsCopy) {
    const temporary = `${target}.${process.pid}.tmp`;
    fs.copyFileSync(source, temporary);
    fs.renameSync(temporary, target);
  }

  return target;
}

function resolveDatabaseConfig(): DatabaseConfig {
  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  const serverless = isServerlessRuntime();

  if (remoteUrl) {
    if (serverless && remoteUrl.startsWith("file:")) {
      throw new Error(
        "TURSO_DATABASE_URL points to a local file, which cannot be used on a serverless host. " +
          "Set it to the libsql:// URL of your Turso database instead.",
      );
    }

    return {
      url: remoteUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    };
  }

  if (serverless) {
    return { url: `file:${prepareFallbackDatabase()}`, readOnly: true };
  }

  const configured = process.env.DATABASE_PATH?.trim();
  const value = configured && configured.length > 0 ? configured : "./data/pharma-careers.db";
  const absolute = path.isAbsolute(value) ? value : path.join(process.cwd(), value);

  // Local development only: create the directory that holds the SQLite file.
  try {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
  } catch (error) {
    throw new Error(
      `Could not create the local database directory for ${absolute}. ` +
        "If this is a deployment, set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN instead.",
      { cause: error },
    );
  }

  return { url: `file:${absolute}` };
}

async function runMigrations(client: Client): Promise<void> {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(
      `Database migrations directory not found at ${migrationsDir}. ` +
        "Make sure the db/migrations folder is deployed with the application.",
    );
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (await client.execute("SELECT name FROM schema_migrations")).rows.map((row) =>
      String(row.name),
    ),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    // Every migration is written to be safe to re-run (CREATE ... IF NOT EXISTS,
    // INSERT OR IGNORE), so a crash between these two statements is recoverable.
    await client.executeMultiple(sql);
    await client.execute({
      sql: "INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)",
      args: [file, new Date().toISOString()],
    });
  }
}

/**
 * Remote libSQL/Turso databases speak HTTP and WebSocket. Use that client in
 * production so the native `libsql` addon (a platform-specific binary that is
 * resolved at runtime and therefore cannot be traced into a serverless bundle)
 * is never loaded for remote databases. Local files, including the read-only
 * fallback snapshot, need the Node client.
 */
async function createClientFor(config: DatabaseConfig): Promise<Client> {
  if (config.url.startsWith("file:")) {
    const { createClient } = await import("@libsql/client");
    return createClient({ url: config.url, authToken: config.authToken });
  }

  const { createClient } = await import("@libsql/client/web");
  return createClient({ url: config.url, authToken: config.authToken });
}

async function connect(): Promise<Client> {
  const config = resolveDatabaseConfig();
  const client = await createClientFor(config);

  try {
    if (config.readOnly) {
      // Belt and braces: the actions and data helpers reject writes, and SQLite
      // itself refuses them here.
      await client.execute("PRAGMA query_only = ON");
      return client;
    }

    await runMigrations(client);
  } catch (error) {
    client.close();
    throw error;
  }

  return client;
}

export function getDbClient(): Promise<Client> {
  if (!globalForDb.__pharmaCareersClient) {
    globalForDb.__pharmaCareersClient = connect().catch((error: unknown) => {
      // Allow a later request to retry if the first connection failed.
      globalForDb.__pharmaCareersClient = undefined;
      throw error;
    });
  }

  return globalForDb.__pharmaCareersClient;
}

/** Run a query that returns rows. */
export async function dbAll<T>(sql: string, args: DbValue[] = []): Promise<T[]> {
  const client = await getDbClient();
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

/** Run a query that returns at most one row. */
export async function dbGet<T>(sql: string, args: DbValue[] = []): Promise<T | null> {
  const rows = await dbAll<T>(sql, args);
  return rows[0] ?? null;
}

/** Run a statement that changes data. */
export async function dbRun(
  sql: string,
  args: DbValue[] = [],
): Promise<{ changes: number; lastInsertRowid: bigint | undefined }> {
  if (isReadOnlyFallback()) throw new ReadOnlyDatabaseError();

  const client = await getDbClient();
  const result = await client.execute({ sql, args });
  return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}

/** Run several statements atomically in a single transaction. */
export async function dbBatch(statements: InStatement[]): Promise<void> {
  if (isReadOnlyFallback()) throw new ReadOnlyDatabaseError();

  const client = await getDbClient();
  await client.batch(statements, "write");
}
