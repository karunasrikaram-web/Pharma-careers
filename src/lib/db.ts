import type { Client, InStatement } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Database access layer.
 *
 * Production deployments (including Vercel) must use a remote libSQL/Turso
 * database configured through TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. The
 * deployment filesystem is read-only, so no files are created there.
 *
 * Local development falls back to a SQLite file on disk through DATABASE_PATH.
 */

export type DbValue = string | number | bigint | boolean | null | Uint8Array | Date;

const globalForDb = globalThis as unknown as {
  __pharmaCareersClient?: Promise<Client>;
};

interface DatabaseConfig {
  url: string;
  authToken?: string;
}

function resolveDatabaseConfig(): DatabaseConfig {
  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  const onVercel = Boolean(process.env.VERCEL);

  if (remoteUrl) {
    if (onVercel && remoteUrl.startsWith("file:")) {
      throw new Error(
        "TURSO_DATABASE_URL points to a local file, which Vercel cannot use. " +
          "Set it to the libsql:// URL of your Turso database instead.",
      );
    }

    return {
      url: remoteUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
    };
  }

  if (onVercel) {
    throw new Error(
      "No persistent database is configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN " +
        "in the Vercel project environment variables. Vercel's filesystem is read-only, so a " +
        "local SQLite file cannot be used in production.",
    );
  }

  const configured = process.env.DATABASE_PATH?.trim();
  const value = configured && configured.length > 0 ? configured : "./data/pharma-careers.db";
  const absolute = path.isAbsolute(value) ? value : path.join(process.cwd(), value);

  // Local development only: create the directory that holds the SQLite file.
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

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
 * is never loaded. Local development keeps the Node client for `file:` URLs.
 */
async function createClientFor(config: DatabaseConfig): Promise<Client> {
  if (config.url.startsWith("file:")) {
    const { createClient } = await import("@libsql/client");
    return createClient(config);
  }

  const { createClient } = await import("@libsql/client/web");
  return createClient(config);
}

async function connect(): Promise<Client> {
  const config = resolveDatabaseConfig();
  const client = await createClientFor(config);

  try {
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
  const client = await getDbClient();
  const result = await client.execute({ sql, args });
  return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
}

/** Run several statements atomically in a single transaction. */
export async function dbBatch(statements: InStatement[]): Promise<void> {
  const client = await getDbClient();
  await client.batch(statements, "write");
}
