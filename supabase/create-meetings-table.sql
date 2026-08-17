-- ============================================================
-- EYE Workflow Hub — Meetings & Attendance Schema (Safe & Idempotent)
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists public.meetings (
  id text primary key,
  title text not null,
  description text,
  type text not null default 'General',
  committee text default 'All',
  department text default 'All',
  scheduled_at timestamptz not null,
  location text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  status text not null default 'Scheduled',
  attendance_code text not null
);

create table if not exists public.attendance (
  id text primary key,
  meeting_id text references public.meetings(id) on delete cascade,
  member_id uuid,
  member_name text not null,
  member_email text,
  committee text,
  department text,
  checked_in_at timestamptz default now(),
  is_excused boolean default false,
  excuse_reason text
);

-- Enable RLS
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;

-- Drop existing policies if any to prevent duplicate errors
drop policy if exists "open access meetings" on public.meetings;
drop policy if exists "open access attendance" on public.attendance;

-- Create policies for access
create policy "open access meetings" on public.meetings for all using (true) with check (true);
create policy "open access attendance" on public.attendance for all using (true) with check (true);

-- Enable Realtime (Ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.meetings, public.attendance;
exception
  when others then null;
end $$;
