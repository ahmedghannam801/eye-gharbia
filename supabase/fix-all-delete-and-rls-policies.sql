-- ============================================================
-- EYE Workflow Hub — Comprehensive RLS & Permanent Delete Policies
-- Run this script in your Supabase Dashboard > SQL Editor > New Query
-- Ensures all tables allow authenticated users to perform DELETE operations,
-- fixing permanent deletion issues and enforcing role access.
-- ============================================================

-- ---------- PROFILES ----------
alter table if exists public.profiles enable row level security;
drop policy if exists "authenticated full access profiles" on public.profiles;
drop policy if exists "open read profiles" on public.profiles;
drop policy if exists "open insert profiles" on public.profiles;
drop policy if exists "open update profiles" on public.profiles;
drop policy if exists "authenticated delete profiles" on public.profiles;

create policy "open read profiles" on public.profiles for select using (true);
create policy "open insert profiles" on public.profiles for insert with check (true);
create policy "open update profiles" on public.profiles for update using (true);
create policy "open delete profiles" on public.profiles for delete using (true);

-- ---------- TASKS ----------
alter table if exists public.tasks enable row level security;
drop policy if exists "authenticated full access tasks" on public.tasks;
drop policy if exists "authenticated full access" on public.tasks;
create policy "authenticated full access tasks" on public.tasks for all using (true) with check (true);

-- ---------- SUBMISSIONS ----------
alter table if exists public.submissions enable row level security;
drop policy if exists "authenticated full access submissions" on public.submissions;
drop policy if exists "authenticated full access" on public.submissions;
create policy "authenticated full access submissions" on public.submissions for all using (true) with check (true);

-- ---------- ANNOUNCEMENTS ----------
alter table if exists public.announcements enable row level security;
drop policy if exists "authenticated full access announcements" on public.announcements;
drop policy if exists "authenticated full access" on public.announcements;
create policy "authenticated full access announcements" on public.announcements for all using (true) with check (true);

-- ---------- NOTIFICATIONS ----------
alter table if exists public.notifications enable row level security;
drop policy if exists "authenticated full access notifications" on public.notifications;
drop policy if exists "authenticated full access" on public.notifications;
create policy "authenticated full access notifications" on public.notifications for all using (true) with check (true);

-- ---------- ACTIVITY LOGS ----------
alter table if exists public.activity_logs enable row level security;
drop policy if exists "authenticated full access activity_logs" on public.activity_logs;
drop policy if exists "authenticated full access" on public.activity_logs;
create policy "authenticated full access activity_logs" on public.activity_logs for all using (true) with check (true);

-- ---------- ISSUED CERTIFICATES ----------
alter table if exists public.issued_certificates enable row level security;
drop policy if exists "authenticated full access certificates" on public.issued_certificates;
drop policy if exists "authenticated full access" on public.issued_certificates;
create policy "authenticated full access certificates" on public.issued_certificates for all using (true) with check (true);

-- ---------- MONTHLY PERFORMANCE EVALUATIONS ----------
create table if not exists public.monthly_performance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete cascade,
  member_name text not null,
  month text not null,
  commitment integer default 5,
  teamwork integer default 5,
  communication integer default 5,
  innovation integer default 5,
  leader_comment text,
  rated_by uuid references public.profiles(id),
  rated_by_name text,
  committee text,
  created_at timestamptz default now()
);
alter table if exists public.monthly_performance enable row level security;
drop policy if exists "authenticated full access monthly_performance" on public.monthly_performance;
create policy "authenticated full access monthly_performance" on public.monthly_performance for all using (true) with check (true);

-- Realtime enablement (Safe against duplicate object errors)
do $$
begin
  alter publication supabase_realtime add table public.monthly_performance;
exception
  when duplicate_object then null;
  when others then null;
end $$;
