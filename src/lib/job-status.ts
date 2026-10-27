import { todayIST } from "@/lib/dates";
import type { Job } from "@/lib/types";

export type StatusTone = "published" | "draft" | "archived" | "expired";

export function getJobStatusLabel(job: Job): { label: string; tone: StatusTone } {
  if (job.status === "archived") return { label: "Archived", tone: "archived" };
  if (job.status === "draft") return { label: "Draft", tone: "draft" };
  if (job.application_deadline && job.application_deadline < todayIST()) {
    return { label: "Expired", tone: "expired" };
  }
  return { label: "Published", tone: "published" };
}
