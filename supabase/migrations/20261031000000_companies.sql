-- Pharma Careers — companies table (2026-10-31)
create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  photo_url text, -- logo / hero image for the company page
  salary_visible boolean not null default true, -- if false, hide min/max salary on public job page
  documents_for_interview text, -- what candidates should carry to the interview
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Allow public read (company pages are public)
drop policy if exists "public can view companies" on public.companies;
create policy "public can view companies"
  on public.companies
  for select
  using (true);

-- Admin full access
drop policy if exists "admin full access on companies" on public.companies;
create policy "admin full access on companies"
  on public.companies
  for all
  using (true)
  with check (true);