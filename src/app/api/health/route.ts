import { dbGet, getDatabaseMode } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Reports whether this build can reach its database
 * without exposing credentials or content. Useful for confirming which commit
 * is live after a deployment. In read-only fallback mode the site is serving
 * bundled demo content, so the check still succeeds.
 */
export async function GET(): Promise<Response> {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const mode = getDatabaseMode();
  const headers = { "Cache-Control": "no-store" };

  try {
    await dbGet("SELECT 1 AS ok");
    return Response.json(
      { status: "ok", database: "connected", mode, commit },
      { headers },
    );
  } catch {
    return Response.json(
      {
        status: "error",
        database: mode === "remote" ? "unavailable" : "not_configured",
        mode,
        commit,
      },
      { status: 503, headers },
    );
  }
}
