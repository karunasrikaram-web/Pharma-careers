export const IST_TIMEZONE = "Asia/Kolkata";

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDateValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDateValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function parseDateValue(value: string): Date | null {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+05:30`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isExpired(deadline: string | null | undefined, today = todayIST()): boolean {
  if (!deadline) return false;
  return deadline < today;
}

export function isPublishedActive(
  job: { status: string; application_deadline: string | null },
  today = todayIST(),
): boolean {
  return job.status === "published" && !isExpired(job.application_deadline, today);
}

export function isRecentlyPosted(publishedAt: string | null, days = 7): boolean {
  if (!publishedAt) return false;
  const time = Date.parse(publishedAt);
  if (Number.isNaN(time)) return false;
  const age = Date.now() - time;
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

export function experienceLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Experience not specified";
  if (min != null && max != null) {
    if (min === max) return `${min} ${min === 1 ? "year" : "years"}`;
    if (min === 0) return `0–${max} years`;
    return `${min}–${max} years`;
  }
  if (min != null) return `${min}+ years`;
  return `Up to ${max} years`;
}

export function splitLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

export function splitParagraphs(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}
