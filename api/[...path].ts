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

import applications from "../server/applications";
import checkApplication from "../server/check-application";
import contact from "../server/contact";
import adminApplications from "../server/admin/applications";
import adminArticles from "../server/admin/articles";
import adminArticleArchive from "../server/admin/articles/archive";
import adminArticlePublish from "../server/admin/articles/publish";
import adminArticleUnpublish from "../server/admin/articles/unpublish";
import adminContactMessages from "../server/admin/contact-messages";
import adminJobs from "../server/admin/jobs";
import adminJobArchive from "../server/admin/jobs/archive";
import adminJobPublish from "../server/admin/jobs/publish";
import adminJobUnpublish from "../server/admin/jobs/unpublish";
import adminLeads from "../server/admin/leads";
import adminLogout from "../server/admin/logout";
import adminMe from "../server/admin/me";
import adminSiteContent from "../server/admin/site-content";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  "contact": contact,
  "applications": applications,
  "check-application": checkApplication,
  "admin/me": adminMe,
  "admin/logout": adminLogout,
  "admin/leads": adminLeads,
  "admin/jobs": adminJobs,
  "admin/jobs/publish": adminJobPublish,
  "admin/jobs/archive": adminJobArchive,
  "admin/jobs/unpublish": adminJobUnpublish,
  "admin/applications": adminApplications,
  "admin/contact-messages": adminContactMessages,
  "admin/site-content": adminSiteContent,
  "admin/articles": adminArticles,
  "admin/articles/publish": adminArticlePublish,
  "admin/articles/archive": adminArticleArchive,
  "admin/articles/unpublish": adminArticleUnpublish,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const key = segments.join("/");

  const route = ROUTES[key];
  if (!route) {
    return res.status(404).json({ error: "Not found" });
  }
  return route(req, res);
}
