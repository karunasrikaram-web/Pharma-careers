import { getDb } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import type {
  DashboardStats,
  Job,
  JobFilters,
  JobStatus,
  PaginatedJobs,
} from "@/lib/types";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface WhereClause {
  sql: string;
  params: Array<string | number>;
}

function buildPublicWhere(filters: JobFilters, today: string): WhereClause {
  const clauses = [
    "status = 'published'",
    "(application_deadline IS NULL OR application_deadline >= ?)",
  ];
  const params: Array<string | number> = [today];

  const q = filters.q?.trim().slice(0, 120);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const columns = [
      "title",
      "company_name",
      "department",
      "description",
      "skills",
      "qualifications",
      "responsibilities",
      "employment_type",
    ];
    clauses.push(
      `(${columns.map((column) => `${column} LIKE ? ESCAPE '\\'`).join(" OR ")})`,
    );
    params.push(...columns.map(() => like));
  }

  const location = filters.location?.trim().slice(0, 80);
  if (location) {
    const like = `%${escapeLike(location)}%`;
    clauses.push(`(city LIKE ? ESCAPE '\\' OR state LIKE ? ESCAPE '\\')`);
    params.push(like, like);
  }

  const department = filters.department?.trim().slice(0, 80);
  if (department) {
    clauses.push("department = ?");
    params.push(department);
  }

  return { sql: clauses.join(" AND "), params };
}

export function listPublicJobs(filters: JobFilters = {}): PaginatedJobs {
  const db = getDb();
  const today = todayIST();
  const perPage = clamp(filters.perPage ?? 9, 1, 50);
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const where = buildPublicWhere(filters, today);

  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM jobs WHERE ${where.sql}`)
    .get(...where.params) as { count: number };

  const total = countRow.count;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);

  const jobs = db
    .prepare(
      `SELECT * FROM jobs
       WHERE ${where.sql}
       ORDER BY is_featured DESC, published_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...where.params, perPage, (page - 1) * perPage) as Job[];

  return { jobs, total, page, perPage, totalPages };
}

export function getLatestPublicJobs(limit = 5): Job[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM jobs
       WHERE status = 'published'
         AND (application_deadline IS NULL OR application_deadline >= ?)
       ORDER BY is_featured DESC, published_at DESC, created_at DESC
       LIMIT ?`,
    )
    .all(todayIST(), clamp(limit, 1, 50)) as Job[];
}

export function getPublicJobBySlug(slug: string): Job | null {
  const db = getDb();
  const job = db
    .prepare(
      `SELECT * FROM jobs
       WHERE slug = ?
         AND status = 'published'
         AND (application_deadline IS NULL OR application_deadline >= ?)`,
    )
    .get(slug, todayIST()) as Job | undefined;
  return job ?? null;
}

export function countPublicDemoJobs(): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM jobs
       WHERE is_demo = 1
         AND status = 'published'
         AND (application_deadline IS NULL OR application_deadline >= ?)`,
    )
    .get(todayIST()) as { count: number };
  return row.count;
}

export function getJobById(id: string): Job | null {
  const db = getDb();
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job | undefined;
  return job ?? null;
}

export function getAdminJobs(options: { search?: string; status?: string } = {}): Job[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: string[] = [];
  const today = todayIST();

  const search = options.search?.trim().slice(0, 120);
  if (search) {
    const like = `%${escapeLike(search)}%`;
    clauses.push(
      `(title LIKE ? ESCAPE '\\' OR company_name LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR state LIKE ? ESCAPE '\\')`,
    );
    params.push(like, like, like, like, like);
  }

  switch (options.status) {
    case "published":
      clauses.push("status = 'published' AND (application_deadline IS NULL OR application_deadline >= ?)");
      params.push(today);
      break;
    case "draft":
      clauses.push("status = 'draft'");
      break;
    case "expired":
      clauses.push("status = 'published' AND application_deadline IS NOT NULL AND application_deadline < ?");
      params.push(today);
      break;
    case "archived":
      clauses.push("status = 'archived'");
      break;
    default:
      break;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM jobs ${where} ORDER BY updated_at DESC`)
    .all(...params) as Job[];
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const today = todayIST();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'published' AND (application_deadline IS NULL OR application_deadline >= ?) THEN 1 ELSE 0 END) AS published,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
         SUM(CASE WHEN status = 'published' AND application_deadline IS NOT NULL AND application_deadline < ? THEN 1 ELSE 0 END) AS expired,
         SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
       FROM jobs`,
    )
    .get(today, today) as {
    total: number;
    published: number | null;
    drafts: number | null;
    expired: number | null;
    archived: number | null;
  };

  return {
    total: row.total,
    published: row.published ?? 0,
    drafts: row.drafts ?? 0,
    expired: row.expired ?? 0,
    archived: row.archived ?? 0,
  };
}

export function getRecentJobs(limit = 6): Job[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM jobs ORDER BY updated_at DESC LIMIT ?")
    .all(clamp(limit, 1, 20)) as Job[];
}

export function findPotentialDuplicate(
  title: string,
  companyName: string,
  city: string,
  excludeId?: string,
): Job | null {
  const db = getDb();
  const job = db
    .prepare(
      `SELECT * FROM jobs
       WHERE lower(title) = lower(?)
         AND lower(company_name) = lower(?)
         AND lower(city) = lower(?)
         AND status IN ('draft', 'published')
         ${excludeId ? "AND id != ?" : ""}
       LIMIT 1`,
    )
    .get(...(excludeId ? [title, companyName, city, excludeId] : [title, companyName, city])) as
    | Job
    | undefined;
  return job ?? null;
}

export function slugExists(slug: string): boolean {
  const db = getDb();
  return Boolean(db.prepare("SELECT 1 FROM jobs WHERE slug = ?").get(slug));
}

export function isJobStatus(value: string): value is JobStatus {
  return value === "draft" || value === "published" || value === "archived";
}
