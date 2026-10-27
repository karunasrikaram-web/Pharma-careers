import { getDb } from "@/lib/db";
import { USER_DETAIL_KINDS, USER_DETAIL_STATUSES } from "@/lib/constants";
import type { UserDetail, UserDetailsStats } from "@/lib/types";

const LIST_COLUMNS = `
  id, kind, job_id, job_title, name, email, phone, city, state,
  qualification, experience, preferred_departments, message,
  resume_name, resume_mime, resume_size, status, admin_note,
  created_at, updated_at,
  CASE WHEN resume_data IS NULL THEN 0 ELSE 1 END AS has_resume
`;

export interface UserDetailFilters {
  search?: string;
  kind?: string;
  status?: string;
}

export function isUserDetailStatus(value: string): boolean {
  return (USER_DETAIL_STATUSES as readonly string[]).includes(value);
}

export function isUserDetailKind(value: string): boolean {
  return (USER_DETAIL_KINDS as readonly string[]).includes(value);
}

export function listUserDetails(filters: UserDetailFilters = {}): UserDetail[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  const search = filters.search?.trim().slice(0, 120);
  if (search) {
    where.push(
      `(instr(lower(name), lower(?)) > 0
        OR instr(lower(email), lower(?)) > 0
        OR instr(lower(phone), lower(?)) > 0
        OR instr(lower(COALESCE(job_title, '')), lower(?)) > 0
        OR instr(lower(COALESCE(city, '')), lower(?)) > 0)`,
    );
    params.push(search, search, search, search, search);
  }

  if (filters.kind && isUserDetailKind(filters.kind)) {
    where.push("kind = ?");
    params.push(filters.kind);
  }

  if (filters.status && isUserDetailStatus(filters.status)) {
    where.push("status = ?");
    params.push(filters.status);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT ${LIST_COLUMNS}
       FROM user_details
       ${clause}
       ORDER BY created_at DESC
       LIMIT 500`,
    )
    .all(...params) as UserDetail[];
}

export function getUserDetailById(id: string): UserDetail | null {
  if (!id) return null;
  const row = getDb()
    .prepare(`SELECT ${LIST_COLUMNS} FROM user_details WHERE id = ?`)
    .get(id) as UserDetail | undefined;
  return row ?? null;
}

export interface UserDetailResume {
  name: string;
  mime: string;
  size: number;
  data: Buffer;
}

export function getUserDetailResume(id: string): UserDetailResume | null {
  if (!id) return null;
  const row = getDb()
    .prepare(
      `SELECT resume_name, resume_mime, resume_size, resume_data
       FROM user_details
       WHERE id = ? AND resume_data IS NOT NULL`,
    )
    .get(id) as
    | {
        resume_name: string | null;
        resume_mime: string | null;
        resume_size: number | null;
        resume_data: Buffer;
      }
    | undefined;

  if (!row || !row.resume_data) return null;
  return {
    name: row.resume_name?.trim() || "resume.pdf",
    mime: row.resume_mime?.trim() || "application/octet-stream",
    size: row.resume_size ?? row.resume_data.length,
    data: row.resume_data,
  };
}

export function getUserDetailsStats(): UserDetailsStats {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN kind = 'job_alert' THEN 1 ELSE 0 END), 0) AS jobAlerts,
         COALESCE(SUM(CASE WHEN kind = 'job_application' THEN 1 ELSE 0 END), 0) AS applications,
         COALESCE(SUM(CASE WHEN resume_data IS NOT NULL THEN 1 ELSE 0 END), 0) AS resumes,
         COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS newCount
       FROM user_details`,
    )
    .get() as {
    total: number;
    jobAlerts: number;
    applications: number;
    resumes: number;
    newCount: number;
  };

  return {
    total: row.total,
    jobAlerts: row.jobAlerts,
    applications: row.applications,
    resumes: row.resumes,
    newCount: row.newCount,
  };
}

export function getRecentUserDetails(limit = 5): UserDetail[] {
  return getDb()
    .prepare(
      `SELECT ${LIST_COLUMNS}
       FROM user_details
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(Math.max(1, Math.min(20, limit))) as UserDetail[];
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function userDetailKindLabel(kind: string): string {
  return kind === "job_application" ? "Job application" : "Job alert";
}
