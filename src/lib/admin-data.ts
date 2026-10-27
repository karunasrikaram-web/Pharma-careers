import { getDb } from "@/lib/db";
import type { ContactMessage, JobReport } from "@/lib/types";

export interface MessageCounts {
  total: number;
  unread: number;
  read: number;
  archived: number;
}

export function listContactMessages(status?: string): ContactMessage[] {
  const db = getDb();
  if (status && ["new", "read", "archived"].includes(status)) {
    return db
      .prepare("SELECT * FROM contact_messages WHERE status = ? ORDER BY created_at DESC")
      .all(status) as ContactMessage[];
  }
  return db
    .prepare("SELECT * FROM contact_messages ORDER BY created_at DESC")
    .all() as ContactMessage[];
}

export function getMessageCounts(): MessageCounts {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS unread,
              COALESCE(SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END), 0) AS readCount,
              COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) AS archived
       FROM contact_messages`,
    )
    .get() as { total: number; unread: number; readCount: number; archived: number };
  return {
    total: row.total,
    unread: row.unread,
    read: row.readCount,
    archived: row.archived,
  };
}

export function getContactMessage(id: string): ContactMessage | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(id) as
      | ContactMessage
      | undefined) ?? null
  );
}

export interface ReportCounts {
  total: number;
  open: number;
  resolved: number;
}

export function listJobReports(status?: string): JobReport[] {
  const db = getDb();
  const where = status && ["open", "resolved"].includes(status) ? "WHERE r.status = ?" : "";
  return db
    .prepare(
      `SELECT r.*, j.title AS job_title, j.slug AS job_slug
       FROM job_reports r
       LEFT JOIN jobs j ON j.id = r.job_id
       ${where}
       ORDER BY r.created_at DESC`,
    )
    .all(...(where ? [status] : [])) as JobReport[];
}

export function getReportCounts(): ReportCounts {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open,
              COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) AS resolved
       FROM job_reports`,
    )
    .get() as { total: number; open: number; resolved: number };
  return { total: row.total, open: row.open, resolved: row.resolved };
}
