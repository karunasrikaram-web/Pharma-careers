import { dbAll, dbGet } from "@/lib/db";
import type { ContactMessage, JobReport } from "@/lib/types";

export interface MessageCounts {
  total: number;
  unread: number;
  read: number;
  archived: number;
}

export async function listContactMessages(status?: string): Promise<ContactMessage[]> {
  if (status && ["new", "read", "archived"].includes(status)) {
    return dbAll<ContactMessage>(
      "SELECT * FROM contact_messages WHERE status = ? ORDER BY created_at DESC",
      [status],
    );
  }
  return dbAll<ContactMessage>("SELECT * FROM contact_messages ORDER BY created_at DESC");
}

export async function getMessageCounts(): Promise<MessageCounts> {
  const row = await dbGet<{
    total: number;
    unread: number;
    readCount: number;
    archived: number;
  }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS unread,
            COALESCE(SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END), 0) AS readCount,
            COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) AS archived
     FROM contact_messages`,
  );

  return {
    total: row?.total ?? 0,
    unread: row?.unread ?? 0,
    read: row?.readCount ?? 0,
    archived: row?.archived ?? 0,
  };
}

export async function getContactMessage(id: string): Promise<ContactMessage | null> {
  return dbGet<ContactMessage>("SELECT * FROM contact_messages WHERE id = ?", [id]);
}

export interface ReportCounts {
  total: number;
  open: number;
  resolved: number;
}

export async function listJobReports(status?: string): Promise<JobReport[]> {
  const where = status && ["open", "resolved"].includes(status) ? "WHERE r.status = ?" : "";
  return dbAll<JobReport>(
    `SELECT r.*, j.title AS job_title, j.slug AS job_slug
     FROM job_reports r
     LEFT JOIN jobs j ON j.id = r.job_id
     ${where}
     ORDER BY r.created_at DESC`,
    where ? [status as string] : [],
  );
}

export async function getReportCounts(): Promise<ReportCounts> {
  const row = await dbGet<{ total: number; open: number; resolved: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open,
            COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) AS resolved
     FROM job_reports`,
  );

  return {
    total: row?.total ?? 0,
    open: row?.open ?? 0,
    resolved: row?.resolved ?? 0,
  };
}
