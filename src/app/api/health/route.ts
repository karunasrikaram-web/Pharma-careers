import { dbGet } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Reports whether this build can reach its database
 * without exposing credentials or content. Useful for confirming which commit
 * is live after a deployment.
 */
export async function GET(): Promise<Response> {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const configured = Boolean(process.env.TURSO_DATABASE_URL?.trim());

  const headers = { "Cache-Control": "no-store" };

  if (!configured && !process.env.DATABASE_PATH) {
    return Response.json(
      { status: "error", database: "not_configured", commit },
      { status: 503, headers },
    );
  }

  try {
    await dbGet("SELECT 1 AS ok");
    return Response.json({ status: "ok", database: "connected", commit }, { headers });
  } catch {
    return Response.json(
      { status: "error", database: "unavailable", commit },
      { status: 503, headers },
    );
  }
}
