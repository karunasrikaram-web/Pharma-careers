import { loadEnv } from "./env";
import { getDb } from "../src/lib/db";

loadEnv();

try {
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>;
  const applied = db
    .prepare("SELECT name, applied_at FROM schema_migrations ORDER BY name")
    .all() as Array<{ name: string; applied_at: string }>;

  console.log("Database migrations are up to date.");
  console.log(`Database: ${process.env.DATABASE_PATH || "./data/pharma-careers.db"}`);
  console.log(`Tables: ${tables.map((table) => table.name).join(", ")}`);
  for (const migration of applied) {
    console.log(`  ✓ ${migration.name} (${migration.applied_at})`);
  }
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
}
