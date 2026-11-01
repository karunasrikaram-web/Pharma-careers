import { getPublicSupabase } from "./publicSupabase";

export interface PublicJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  locationType: string | null;
  employmentType: string | null;
  level: string | null;
  category: string | null;
  department?: string | null;
  role?: string | null;
  photoUrl?: string | null;
  description: string | null;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  publishedAt: string | null;
  isSample: boolean;
}

export const DEPARTMENTS = [
  "Quality Assurance",
  "Production",
  "Research & Development",
  "Regulatory Affairs",
  "Clinical Research",
  "Pharmacovigilance",
  "Sales & Marketing",
  "Analytical Development",
] as const;

/** Human-readable labels for the stored enum-ish values. */
export const LOCATION_TYPE_LABELS: Record<string, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  location_type: string | null;
  employment_type: string | null;
  level: string | null;
  category: string | null;
  department: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  published_at: string | null;
}

function mapRow(row: JobRow): PublicJob {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    locationType: row.location_type,
    employmentType: row.employment_type,
    level: row.level,
    category: row.category,
    department: row.department ?? null,
    role: row.role ?? null,
    photoUrl: row.photo_url ?? null,
    description: row.description,
    requirements: row.requirements,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    currency: row.currency,
    publishedAt: row.published_at,
    isSample: false,
  };
}

/**
 * Published jobs from Supabase with the anon key (RLS: published only).
 * Returns [] when Supabase is not configured or the request fails — callers
 * fall back to the illustrative sample vacancies.
 */
export async function fetchPublishedJobs(): Promise<PublicJob[]> {
  const db = getPublicSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as JobRow[]).map(mapRow);
}

export async function fetchPublishedJob(id: string): Promise<PublicJob | null> {
  const db = getPublicSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as JobRow);
}

export function findSampleJob(id: string): PublicJob | null {
  return SAMPLE_JOBS.find((j) => j.id === id) ?? null;
}

/**
 * Illustrative sample vacancies — clearly labelled in the UI with the
 * "Illustrative sample vacancy" badge so they can never be mistaken for
 * live openings. Used when no published jobs exist yet.
 */
export const SAMPLE_JOBS: PublicJob[] = [
  {
    id: "sample-qa-senior",
    title: "Senior QA Officer",
    company: "Sunrise Biotech Ltd",
    location: "Hyderabad, Telangana",
    locationType: "onsite",
    employmentType: "full_time",
    level: "Mid–Senior level",
    category: "Quality Assurance",
    description:
      "Own batch record reviews, deviation investigations and GMP compliance for a sterile injectables facility. You will lead floor audits and drive CAPA closure with production teams.",
    requirements:
      "B.Pharm / M.Sc with 5+ years in pharmaceutical QA. Working knowledge of Schedule M and ICH Q7. Experience with electronic QMS tools is a plus.",
    salaryMin: 900000,
    salaryMax: 1400000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-production",
    title: "Production Chemist — Oral Solids",
    company: "Nova Therapeutics",
    location: "Baddi, Himachal Pradesh",
    locationType: "onsite",
    employmentType: "full_time",
    level: "Entry level",
    category: "Production",
    description:
      "Run and monitor granulation, compression and coating lines for a high-volume oral solids plant. Ensure yield targets and cGMP documentation are met every shift.",
    requirements:
      "B.Pharm / B.Sc (Chemistry) with 0–2 years in a regulated formulation plant. Familiarity with GMP documentation and equipment logbooks.",
    salaryMin: 350000,
    salaryMax: 550000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-rd-formulation",
    title: "Formulation R&D Scientist",
    company: "Aurora Life Sciences",
    location: "Remote (India)",
    locationType: "remote",
    employmentType: "full_time",
    level: "Mid–Senior level",
    category: "Research & Development",
    description:
      "Develop NDDS and generic formulations from concept to pilot batch. Design DoE studies, author development reports and support tech transfers to plants.",
    requirements:
      "M.Pharm (Pharmaceutics) with 4+ years in R&D. Experience with QbD, DoE and scale-up of oral dosage forms.",
    salaryMin: 1200000,
    salaryMax: 1800000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-regulatory",
    title: "Regulatory Affairs Associate",
    company: "Crest Pharma Group",
    location: "Pune, Maharashtra",
    locationType: "hybrid",
    employmentType: "full_time",
    level: "Mid level",
    category: "Regulatory Affairs",
    description:
      "Prepare and compile CTD dossiers for EU and US filings, manage health-authority queries and maintain regulatory databases for a generics portfolio.",
    requirements:
      "B.Pharm / M.Pharm with 2+ years in regulatory affairs. Knowledge of eCTD and ICH M4 is required; EU/US submission experience preferred.",
    salaryMin: 800000,
    salaryMax: 1200000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-clinical",
    title: "Clinical Research Coordinator",
    company: "Meridian Trials Network",
    location: "Chennai, Tamil Nadu",
    locationType: "onsite",
    employmentType: "contract",
    level: "Mid level",
    category: "Clinical Research",
    description:
      "Coordinate Phase II–III site activities: patient recruitment, source-document verification, IRB submissions and query resolution for multinational sponsors.",
    requirements:
      "Life-science graduate with 2+ years at a clinical research site. ICH-GCP certification required.",
    salaryMin: 600000,
    salaryMax: 900000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-pv",
    title: "Pharmacovigilance Case Processor",
    company: "BlueRidge Safety Solutions",
    location: "Remote (India)",
    locationType: "remote",
    employmentType: "full_time",
    level: "Entry level",
    category: "Pharmacovigilance",
    description:
      "Intake and triage adverse-event reports, code cases in MedDRA and prepare narratives for aggregate safety submissions.",
    requirements:
      "B.Pharm / M.Pharm / Pharm.D. Knowledge of MedDRA and ICSR processing (E2B) is desirable; training provided.",
    salaryMin: 450000,
    salaryMax: 700000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-analytical",
    title: "Analytical Development Chemist",
    company: "Sunrise Biotech Ltd",
    location: "Hyderabad, Telangana",
    locationType: "onsite",
    employmentType: "full_time",
    level: "Mid level",
    category: "Analytical Development",
    description:
      "Develop and validate stability-indicating HPLC/UPLC methods for new molecules and transfer them to QC. Author method-validation protocols and reports.",
    requirements:
      "M.Sc (Analytical Chemistry) / M.Pharm with 3+ years in method development. Hands-on HPLC, LC-MS and method-validation guidelines (ICH Q2).",
    salaryMin: 850000,
    salaryMax: 1250000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
  {
    id: "sample-sales",
    title: "Medical Sales Representative",
    company: "Nova Therapeutics",
    location: "Bengaluru, Karnataka",
    locationType: "onsite",
    employmentType: "full_time",
    level: "Entry level",
    category: "Sales & Marketing",
    description:
      "Promote a specialty portfolio to prescribers and chemists, meet monthly call goals and coordinate CME events with key opinion leaders.",
    requirements:
      "B.Pharm / life-science graduate with a valid two-wheeler and driving licence. 0–3 years in pharma field sales.",
    salaryMin: 400000,
    salaryMax: 650000,
    currency: "INR",
    publishedAt: null,
    isSample: true,
  },
];

export function formatSalary(job: PublicJob): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const sym = job.currency === "INR" ? "₹" : "";
  const fmt = (n: number) => `${sym}${(n / 100000).toFixed(1)}L`;
  if (job.salaryMin != null && job.salaryMax != null) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)} / year`;
  const n = (job.salaryMin ?? job.salaryMax) as number;
  return `${sym ? "" : ""}from ${fmt(n)} / year`;
}

export function formatPublishedDate(job: PublicJob): string | null {
  if (!job.publishedAt) return null;
  const d = new Date(job.publishedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
