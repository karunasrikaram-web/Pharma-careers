-- Pharma Careers — admin CMS schema (Firebase auth for admins, Supabase for data)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Drop legacy Supabase-Auth-era objects (no Supabase Auth users in this project;
-- admins authenticate via Firebase and authorization uses the `admin` custom claim).
-- ---------------------------------------------------------------------------
drop table if exists public.profiles cascade;
drop function if exists public.is_admin();

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  location_type text not null default 'onsite',
  employment_type text not null default 'full_time',
  level text,
  category text,
  description text,
  requirements text,
  salary_min integer,
  salary_max integer,
  currency text default 'USD',
  status text not null default 'draft',
  is_published boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);

alter table public.jobs enable row level security;

-- Anon may read published jobs only. No insert/update/delete policies for
-- anon or authenticated: writes happen only via the Supabase service role
-- from server-side admin endpoints.
drop policy if exists "anon can view published jobs" on public.jobs;
create policy "anon can view published jobs"
  on public.jobs
  for select
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text,
  category text,
  author text,
  status text not null default 'draft',
  is_published boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_idx on public.articles (status);

alter table public.articles enable row level security;

drop policy if exists "anon can view published articles" on public.articles;
create policy "anon can view published articles"
  on public.articles
  for select
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- site_content (generic key/value CMS content)
-- ---------------------------------------------------------------------------
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  type text not null default 'text',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "public can view site content" on public.site_content;
create policy "public can view site content"
  on public.site_content
  for select
  using (true);

-- ---------------------------------------------------------------------------
-- leads (viewing / candidate interest leads)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  candidate_name text,
  email text,
  phone text,
  source text,
  status text not null default 'viewing',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- No public policies: leads are written/read only by the server via service role.

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- No public policies: messages are written/read only by the server via service role.
