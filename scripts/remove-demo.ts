import { loadEnv } from "./env";

loadEnv();

const { getDb } = await import("../src/lib/db");

const db = getDb();
const jobs = db.prepare("DELETE FROM jobs WHERE is_demo = 1").run();
const articles = db.prepare("DELETE FROM articles WHERE is_demo = 1").run();

console.log(
  `Removed ${jobs.changes} demo jobs and ${articles.changes} demo articles. Real content was not touched.`,
);
