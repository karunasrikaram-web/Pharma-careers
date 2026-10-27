import { loadEnv } from "./env";
import { getDb } from "../src/lib/db";
import { todayIST } from "../src/lib/dates";

loadEnv();

const db = getDb();
const today = todayIST();

const jobs = db
  .prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'published' AND (application_deadline IS NULL OR application_deadline >= ?) THEN 1 ELSE 0 END) AS public_jobs,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_jobs
     FROM jobs`,
  )
  .get(today, today) as {
  total: number;
  public_jobs: number | null;
  drafts: number | null;
  demo_jobs: number | null;
};

const articles = db
  .prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'published' AND (scheduled_at IS NULL OR scheduled_at <= ?) THEN 1 ELSE 0 END) AS public_articles,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo_articles
     FROM articles`,
  )
  .get(new Date().toISOString(), new Date().toISOString()) as {
  total: number;
  public_articles: number | null;
  drafts: number | null;
  demo_articles: number | null;
};

const admins = db.prepare("SELECT COUNT(*) AS count FROM admins WHERE is_active = 1").get() as {
  count: number;
};
const categories = db.prepare("SELECT COUNT(*) AS count FROM categories").get() as {
  count: number;
};
const settings = db.prepare("SELECT COUNT(*) AS count FROM site_settings").get() as {
  count: number;
};

console.log("Database check");
console.log(`  Today (IST):      ${today}`);
console.log(`  Jobs:             ${jobs.total} total, ${jobs.public_jobs ?? 0} public, ${jobs.drafts ?? 0} drafts, ${jobs.demo_jobs ?? 0} demo`);
console.log(`  Articles:         ${articles.total} total, ${articles.public_articles ?? 0} public, ${articles.drafts ?? 0} drafts, ${articles.demo_articles ?? 0} demo`);
console.log(`  Active admins:    ${admins.count}`);
console.log(`  Categories:       ${categories.count}`);
console.log(`  Settings rows:    ${settings.count}`);

if (admins.count === 0) {
  console.warn("Warning: no active administrator exists. Run npm run admin:create.");
  process.exitCode = 1;
}
