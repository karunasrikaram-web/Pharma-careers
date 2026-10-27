export const SITE = {
  name: "Pharma Careers",
  tagline: "PHARMA & LIFE SCIENCES CAREERS",
  description:
    "A simpler way to discover careers in pharma, biotechnology and life sciences across India.",
} as const;

export const DEPARTMENTS = [
  "Quality Control (QC)",
  "Quality Assurance (QA)",
  "Production",
  "Microbiology",
  "R&D",
  "Regulatory Affairs",
  "Pharmacovigilance",
  "Clinical Research",
  "Sales",
] as const;

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
] as const;

export const JOB_STATUSES = ["draft", "published", "archived"] as const;

export const QUALIFICATIONS = [
  "B.Pharm",
  "M.Pharm",
  "Pharm.D",
  "B.Sc",
  "M.Sc",
  "B.Tech / B.E.",
  "Diploma",
  "PhD",
  "Other",
] as const;

export const EXPERIENCE_LEVELS = [
  "Fresher",
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
] as const;

export const USER_DETAIL_STATUSES = [
  "new",
  "reviewed",
  "shortlisted",
  "archived",
] as const;

export const USER_DETAIL_KINDS = ["job_alert", "job_application"] as const;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_EXTENSIONS = ["pdf", "doc", "docx"] as const;

export const REPORT_REASONS = [
  "Inaccurate information",
  "Expired vacancy",
  "Suspected scam or fraud",
  "Broken application link",
  "Duplicate listing",
  "Other",
] as const;

export const SESSION_COOKIE = "pc_admin_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours absolute
export const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const DEMO_DISCLAIMER =
  "Listings marked “Demo” are illustrative sample data. They are not verified live vacancies.";
