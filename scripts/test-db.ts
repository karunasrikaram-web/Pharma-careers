import { loadEnv } from "./env";
import { dbGet } from "../src/lib/db";
import { todayIST } from "../src/lib/dates";

loadEnv();

async function main(): Promise<void> {
const today = todayIST();

const jobs = await dbGet<{
  total: number;
  public_jobs: number | null;
  drafts: number | null;
  demo_jobs: number | null;
}>(
  `SELECT
     COUNT(*) AS total,
     SUM(CASE WHEN status = 'published' AND (application_deadline IS NULL OR application_deadline >= ?) THEN 1 ELSE 0 END) AS public_jobs,
     SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
     SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_jobs
   FROM jobs`,
  [today, today],
);

const articles = await dbGet<{
  total: number;
  public_articles: number | null;
  drafts: number | null;
  demo_articles: number | null;
}>(
  `SELECT
     COUNT(*) AS total,
     SUM(CASE WHEN status = 'published' AND (scheduled_at IS NULL OR scheduled_at <= ?) THEN 1 ELSE 0 END) AS public_articles,
     SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
     SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_articles
   FROM articles`,
  [new Date().toISOString(), new Date().toISOString()],
);

const admins = await dbGet<{ count: number }>(
  "SELECT COUNT(*) AS count FROM admins WHERE is_active = 1",
);
const categories = await dbGet<{ count: number }>(
  "SELECT COUNT(*) AS count FROM categories",
);
const settings = await dbGet<{ count: number }>(
  "SELECT COUNT(*) AS count FROM site_settings",
);

const adminCount = admins?.count ?? 0;

console.log("Database check");
console.log(`  Today (IST):      ${today}`);
console.log(
  `  Jobs:             ${jobs?.total ?? 0} total, ${jobs?.public_jobs ?? 0} public, ${jobs?.drafts ?? 0} drafts, ${jobs?.demo_jobs ?? 0} demo`,
);
console.log(
  `  Articles:         ${articles?.total ?? 0} total, ${articles?.public_articles ?? 0} public, ${articles?.drafts ?? 0} drafts, ${articles?.demo_articles ?? 0} demo`,
);
console.log(`  Active admins:    ${adminCount}`);
console.log(`  Categories:       ${categories?.count ?? 0}`);
console.log(`  Settings rows:    ${settings?.count ?? 0}`);

if (adminCount === 0) {
  console.warn("Warning: no active administrator exists. Run npm run admin:create.");
  process.exitCode = 1;
}
}

main().catch((error) => {
  console.error("Database check failed:", error);
  process.exitCode = 1;
});
