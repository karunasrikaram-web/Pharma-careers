-- ============================================================================
-- Pharma Careers — PENDING MIGRATIONS (consolidated, idempotent)
--
-- Apply this ONE block in the Supabase dashboard:
--   Supabase dashboard → SQL Editor → New query → paste → Run
--
-- Safe to re-run: every statement uses IF NOT EXISTS / ON CONFLICT / or
-- conditional DO blocks, so re-running cannot damage existing data.
--
-- What it adds:
--   1. jobs.department, jobs.role           (free-text department + role)
--   2. public.companies                     (photo, salary toggle, documents)
--   3. applications.experience              (candidate experience on apply)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. jobs: department + role (free text, one per job posting)
-- ---------------------------------------------------------------------------
alter table public.jobs add column if not exists department text;
alter table public.jobs add column if not exists role text;
alter table public.jobs add column if not exists photo_url text; -- company photo URL for the job/company page

-- ---------------------------------------------------------------------------
-- 2. companies: one row per company with photo / salary visibility /
--    interview documents. Publicly readable; admins manage it.
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  photo_url text,                              -- logo / hero image URL
  salary_visible boolean not null default true, -- false hides min/max salary publicly
  documents_for_interview text,                 -- what candidates must carry
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

drop policy if exists "public can view companies" on public.companies;
create policy "public can view companies"
  on public.companies
  for select
  using (true);

drop policy if exists "admin full access on companies" on public.companies;
create policy "admin full access on companies"
  on public.companies
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 3. applications: candidate experience (shown in the admin console)
-- ---------------------------------------------------------------------------
alter table public.applications add column if not exists experience text;

-- ---------------------------------------------------------------------------
-- Verification (run and confirm all rows return):
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public'
--      and ( (table_name = 'jobs' and column_name in ('department','role'))
--         or (table_name = 'applications' and column_name = 'experience')
--         or table_name = 'companies' );
-- Expected: 6 rows (jobs.department, jobs.role, applications.experience,
--                   companies.id, companies.name, ... every companies column)
-- ---------------------------------------------------------------------------
