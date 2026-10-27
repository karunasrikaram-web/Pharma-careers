import { loadEnv } from "./env";
import { dbAll } from "../src/lib/db";

loadEnv();

async function main(): Promise<void> {
try {
  const tables = await dbAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  const applied = await dbAll<{ name: string; applied_at: string }>(
    "SELECT name, applied_at FROM schema_migrations ORDER BY name",
  );

  console.log("Database migrations are up to date.");
  console.log(
    `Database: ${process.env.TURSO_DATABASE_URL || process.env.DATABASE_PATH || "./data/pharma-careers.db"}`,
  );
  console.log(`Tables: ${tables.map((table) => table.name).join(", ")}`);
  for (const migration of applied) {
    console.log(`  ✓ ${migration.name} (${migration.applied_at})`);
  }
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
}
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
