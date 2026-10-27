import { loadEnv } from "./env";

loadEnv();

async function main(): Promise<void> {
const { dbRun } = await import("../src/lib/db");

const jobs = await dbRun("DELETE FROM jobs WHERE is_demo = 1");
const articles = await dbRun("DELETE FROM articles WHERE is_demo = 1");

console.log(
  `Removed ${jobs.changes} demo jobs and ${articles.changes} demo articles. Real content was not touched.`,
);
}

main().catch((error) => {
  console.error("Failed to remove demo data:", error);
  process.exitCode = 1;
});
