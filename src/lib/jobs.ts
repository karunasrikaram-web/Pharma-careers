import { dbAll, dbGet } from "@/lib/db";
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

export async function listPublicJobs(filters: JobFilters = {}): Promise<PaginatedJobs> {
  const today = todayIST();
  const perPage = clamp(filters.perPage ?? 9, 1, 50);
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const where = buildPublicWhere(filters, today);

  const countRow = await dbGet<{ count: number }>(
    `SELECT COUNT(*) AS count FROM jobs WHERE ${where.sql}`,
    where.params,
  );

  const total = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);

  const orderBy =
    filters.sort === "latest"
      ? "COALESCE(published_at, created_at) DESC, created_at DESC"
      : "is_featured DESC, published_at DESC, created_at DESC";

  const jobs = await dbAll<Job>(
    `SELECT * FROM jobs
     WHERE ${where.sql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...where.params, perPage, (page - 1) * perPage],
  );

  return { jobs, total, page, perPage, totalPages };
}

export async function getLatestPublicJobs(limit = 5): Promise<Job[]> {
  return dbAll<Job>(
    `SELECT * FROM jobs
     WHERE status = 'published'
       AND (application_deadline IS NULL OR application_deadline >= ?)
     ORDER BY is_featured DESC, published_at DESC, created_at DESC
     LIMIT ?`,
    [todayIST(), clamp(limit, 1, 50)],
  );
}

export async function getPublicJobBySlug(slug: string): Promise<Job | null> {
  return dbGet<Job>(
    `SELECT * FROM jobs
     WHERE slug = ?
       AND status = 'published'
       AND (application_deadline IS NULL OR application_deadline >= ?)`,
    [slug, todayIST()],
  );
}

export async function countPublicDemoJobs(): Promise<number> {
  const row = await dbGet<{ count: number }>(
    `SELECT COUNT(*) AS count FROM jobs
     WHERE is_demo = 1
       AND status = 'published'
       AND (application_deadline IS NULL OR application_deadline >= ?)`,
    [todayIST()],
  );
  return row?.count ?? 0;
}

export async function getJobById(id: string): Promise<Job | null> {
  return dbGet<Job>("SELECT * FROM jobs WHERE id = ?", [id]);
}

export async function getAdminJobs(
  options: { search?: string; status?: string } = {},
): Promise<Job[]> {
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
  return dbAll<Job>(`SELECT * FROM jobs ${where} ORDER BY updated_at DESC`, params);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = todayIST();
  const row = await dbGet<{
    total: number;
    published: number | null;
    drafts: number | null;
    expired: number | null;
    archived: number | null;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'published' AND (application_deadline IS NULL OR application_deadline >= ?) THEN 1 ELSE 0 END) AS published,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
       SUM(CASE WHEN status = 'published' AND application_deadline IS NOT NULL AND application_deadline < ? THEN 1 ELSE 0 END) AS expired,
       SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
     FROM jobs`,
    [today, today],
  );

  return {
    total: row?.total ?? 0,
    published: row?.published ?? 0,
    drafts: row?.drafts ?? 0,
    expired: row?.expired ?? 0,
    archived: row?.archived ?? 0,
  };
}

export async function getRecentJobs(limit = 6): Promise<Job[]> {
  return dbAll<Job>("SELECT * FROM jobs ORDER BY updated_at DESC LIMIT ?", [
    clamp(limit, 1, 20),
  ]);
}

export async function findPotentialDuplicate(
  title: string,
  companyName: string,
  city: string,
  excludeId?: string,
): Promise<Job | null> {
  return dbGet<Job>(
    `SELECT * FROM jobs
     WHERE lower(title) = lower(?)
       AND lower(company_name) = lower(?)
       AND lower(city) = lower(?)
       AND status IN ('draft', 'published')
       ${excludeId ? "AND id != ?" : ""}
     LIMIT 1`,
    excludeId ? [title, companyName, city, excludeId] : [title, companyName, city],
  );
}

export async function slugExists(slug: string): Promise<boolean> {
  return Boolean(await dbGet("SELECT 1 AS found FROM jobs WHERE slug = ?", [slug]));
}

export function isJobStatus(value: string): value is JobStatus {
  return value === "draft" || value === "published" || value === "archived";
}
