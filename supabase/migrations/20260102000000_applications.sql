-- Pharma Careers — job applications (candidates apply on the public site with
-- NO login; admins review them in the console, grouped separately per role
-- and per company).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
-- job_id is ON DELETE SET NULL (not cascade): deleting a vacancy must never
-- silently destroy candidate applications. `job_title` and `company` are
-- snapshots taken at apply time so the admin still sees which role and which
-- company someone applied for, even after the job is edited or removed.
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  job_title text not null,
  company text not null,
  applicant_name text not null,
  surname text not null,
  email text not null,
  phone text not null,
  location text not null,
  cover_note text,
  resume_path text,
  resume_filename text,
  resume_size integer,
  resume_type text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_check
    check (status in ('new', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'))
);

create index if not exists applications_job_id_idx on public.applications (job_id);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_created_at_idx on public.applications (created_at desc);

-- ONE application per email per role title (case-insensitive), even when the
-- same role is offered by another company. This is the hard backstop behind
-- the friendlier pre-check in the API; the "+" badge in the apply form is
-- driven by the same rule.
create unique index if not exists applications_email_role_uniq
  on public.applications (lower(email), lower(job_title));

alter table public.applications enable row level security;

-- No public policies at all: applications contain candidate PII. Anonymous
-- users cannot read or write them — submissions go through the public
-- /api/applications endpoint (service role, rate-limited, Zod-validated) and
-- reviews happen in the admin console (Firebase-verified, allowlisted).

-- ---------------------------------------------------------------------------
-- resumes storage bucket (PRIVATE)
-- ---------------------------------------------------------------------------
-- Uploads happen only server-side with the service role; admins fetch files
-- through short-lived signed URLs minted by the admin API. The anon key has
-- no access whatsoever.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  3145728, -- 3 MB cap, enforced again in the API layer
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
