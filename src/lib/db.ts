import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type DatabaseInstance = Database.Database;

const globalForDb = globalThis as unknown as {
  __pharmaCareersDb?: DatabaseInstance;
};

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  const value = configured && configured.length > 0 ? configured : "./data/pharma-careers.db";
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function runMigrations(db: DatabaseInstance): void {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(
      `Database migrations directory not found at ${migrationsDir}. ` +
        "Make sure the db/migrations folder is deployed with the application.",
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare("SELECT name FROM schema_migrations")
      .all()
      .map((row) => (row as { name: string }).name),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
        file,
        new Date().toISOString(),
      );
    });
    apply();
  }
}

export function getDb(): DatabaseInstance {
  if (globalForDb.__pharmaCareersDb) {
    return globalForDb.__pharmaCareersDb;
  }

  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  runMigrations(db);

  globalForDb.__pharmaCareersDb = db;
  return db;
}
