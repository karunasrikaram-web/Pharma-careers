/**
 * Single catch-all Serverless Function for every `/api/*` route.
 *
 * The Hobby plan allows at most 12 Serverless Functions per deployment, and
 * this project exposes 17 API routes — so instead of one file per route we
 * ship ONE function here that dispatches to the same handler modules the
 * local dev server (`scripts/dev-api.ts`) uses.
 *
 * Route table mirrors the filesystem: `/api/admin/jobs/publish` →
 * `server/admin/jobs/publish.ts`.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import applications from "../server/applications.js";
import checkApplication from "../server/check-application.js";
import contact from "../server/contact.js";
import reviews from "../server/reviews.js";
import adminApplications from "../server/admin/applications.js";
import adminArticles from "../server/admin/articles.js";
import adminArticleArchive from "../server/admin/articles/archive.js";
import adminArticlePublish from "../server/admin/articles/publish.js";
import adminArticleUnpublish from "../server/admin/articles/unpublish.js";
import adminCompanies from "../server/admin/companies.js";
import adminContactMessages from "../server/admin/contact-messages.js";
import adminJobs from "../server/admin/jobs.js";
import adminJobArchive from "../server/admin/jobs/archive.js";
import adminJobPublish from "../server/admin/jobs/publish.js";
import adminJobUnpublish from "../server/admin/jobs/unpublish.js";
import adminLeads from "../server/admin/leads.js";
import adminLogout from "../server/admin/logout.js";
import adminMe from "../server/admin/me.js";
import adminReviews from "../server/admin/reviews.js";
import adminSiteContent from "../server/admin/site-content.js";
import adminUploadPhoto from "../server/admin/upload-photo.js";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  "contact": contact,
  "reviews": reviews,
  "applications": applications,
  "check-application": checkApplication,
  "admin/me": adminMe,
  "admin/logout": adminLogout,
  "admin/leads": adminLeads,
  "admin/jobs": adminJobs,
  "admin/jobs/publish": adminJobPublish,
  "admin/jobs/archive": adminJobArchive,
  "admin/jobs/unpublish": adminJobUnpublish,
  "admin/companies": adminCompanies,
  "admin/applications": adminApplications,
  "admin/contact-messages": adminContactMessages,
  "admin/site-content": adminSiteContent,
  "admin/articles": adminArticles,
  "admin/articles/publish": adminArticlePublish,
  "admin/articles/archive": adminArticleArchive,
  "admin/articles/unpublish": adminArticleUnpublish,
  "admin/upload-photo": adminUploadPhoto,
  "admin/reviews": adminReviews,
};

/**
 * Resolve the route key (`admin/jobs/publish`, `contact`, …) from whichever
 * shape the platform hands us:
 *
 *  1. `req.query.path` — the standard Vercel catch-all convention (array of
 *     segments, or a single string). This is what the local tests and
 *     `scripts/dev-api.ts` exercise.
 *  2. `req.query["...path"]` — the destination-param form Vercel emits when a
 *     rewrite forwards `/api/(.*)` → `/api/[...path]?...path=$1`.
 *  3. `req.url` — a raw fallback (`/api/admin/me` → `admin/me`) in case the
 *     platform rewrites without surfacing a query param at all.
 *
 * Being liberal here means a routing-config change on Vercel's side can't
 * silently 404 every admin route again.
 */
function resolveRouteKey(req: VercelRequest): string {
  const fromQuery = req.query?.path;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery.length) return fromQuery.join("/");

  const dotted = (req.query as Record<string, unknown> | undefined)?.["...path"];
  if (typeof dotted === "string" && dotted) return dotted;
  if (Array.isArray(dotted) && dotted.length) return dotted.join("/");

  const url = req.url ?? "";
  const m = url.match(/^\/api\/([^?]*)/);
  if (m) {
    const seg = m[1].replace(/^\/+|\/+$/g, "");
    // Ignore the literal catch-all placeholder (`[...path]`) the rewrite dest
    // can leave in the URL path.
    if (seg && !seg.startsWith("[")) return seg;
  }
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = resolveRouteKey(req);

  const route = ROUTES[key];
  if (!route) {
    return res.status(404).json({ error: "Not found" });
  }
  return route(req, res);
}