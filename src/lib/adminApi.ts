import type { User } from "firebase/auth";
import { getPublicSupabase } from "./publicSupabase";

/**
 * fetch() wrapper for admin endpoints: attaches the caller's Firebase ID
 * token as a Bearer header. Used by every console page.
 */
export async function adminFetch(user: User, path: string, init?: RequestInit): Promise<Response> {
  const token = await user.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Upload a file to Supabase Storage (job-photos bucket) and return the public URL.
 * Requires the caller to be an admin (checked on the server via requireAdmin).
 */
export async function uploadJobPhoto(user: User, file: File, jobId: string): Promise<string> {
  const token = await user.getIdToken();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const fileName = `${jobId}-${Date.now()}.${ext}`;

  // Read file as base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // remove data: prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/admin/upload-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName,
      jobId,
      dataBase64: base64,
      contentType: file.type,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  const { publicUrl } = await res.json();
  return publicUrl;
}

/** Shared status colours for the dark console. */
export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#26304a", fg: "#9aa7bd" },
  published: { bg: "#123527", fg: "#5ee6a8" },
  archived: { bg: "#3a2b12", fg: "#f2c14e" },
  new: { bg: "#12314f", fg: "#7cc4ff" },
  reviewing: { bg: "#2d2a12", fg: "#f2c14e" },
  shortlisted: { bg: "#241a3f", fg: "#b79bff" },
  interviewed: { bg: "#123527", fg: "#5ee6a8" },
  offered: { bg: "#123527", fg: "#5ee6a8" },
  hired: { bg: "#123527", fg: "#5ee6a8" },
  rejected: { bg: "#3f1a1a", fg: "#ff9b9b" },
};

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interviewed",
  "offered",
  "hired",
  "rejected",
] as const;

export const EMPLOYMENT_TYPES = [
  ["full_time", "Full-time"],
  ["part_time", "Part-time"],
  ["contract", "Contract"],
  ["internship", "Internship"],
] as const;

export const LOCATION_TYPES = [
  ["onsite", "On-site"],
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
] as const;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
