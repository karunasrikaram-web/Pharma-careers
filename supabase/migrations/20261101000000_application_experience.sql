-- Pharma Careers — candidate experience on applications (2026-11-01)
-- The apply form asks the candidate to describe their experience; admins see
-- it in the console next to the other candidate details.

alter table public.applications add column if not exists experience text;
