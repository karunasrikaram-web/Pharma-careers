export type JobStatus = "draft" | "published" | "archived";

export interface Job {
  id: string;
  slug: string;
  title: string;
  company_name: string;
  department: string;
  city: string;
  state: string;
  experience_min: number | null;
  experience_max: number | null;
  employment_type: string | null;
  salary_range: string | null;
  description: string;
  responsibilities: string | null;
  qualifications: string | null;
  skills: string | null;
  application_instructions: string | null;
  application_url: string | null;
  published_at: string | null;
  application_deadline: string | null;
  status: JobStatus;
  is_featured: number;
  is_demo: number;
  source_name: string | null;
  source_url: string | null;
  external_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login_at: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  created_at: string;
}

export interface JobReport {
  id: string;
  job_id: string;
  job_title: string | null;
  job_slug: string | null;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: "open" | "resolved";
  created_at: string;
}

export interface JobFilters {
  q?: string;
  location?: string;
  department?: string;
  sort?: "latest";
  page?: number;
  perPage?: number;
}

export interface PaginatedJobs {
  jobs: Job[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface DashboardStats {
  total: number;
  published: number;
  drafts: number;
  expired: number;
  archived: number;
}

export type ArticleStatus = "draft" | "published" | "archived";

export interface Category {
  id: string;
  name: string;
  slug: string;
  content_type: "article" | "job";
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  author_name: string | null;
  tags: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: ArticleStatus;
  is_featured: number;
  is_demo: number;
  scheduled_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleFilters {
  q?: string;
  category?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ArticleStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  scheduled: number;
}

export type UserDetailKind = "job_alert" | "job_application";
export type UserDetailStatus = "new" | "reviewed" | "shortlisted" | "archived";

export interface UserDetail {
  id: string;
  kind: UserDetailKind;
  job_id: string | null;
  job_title: string | null;
  name: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  qualification: string | null;
  experience: string | null;
  preferred_departments: string | null;
  message: string | null;
  resume_name: string | null;
  resume_mime: string | null;
  resume_size: number | null;
  has_resume: number;
  status: UserDetailStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDetailsStats {
  total: number;
  jobAlerts: number;
  applications: number;
  resumes: number;
  newCount: number;
}
