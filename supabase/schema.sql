-- ============================================================
-- EYE Workflow Hub — Supabase schema (v2)
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run: drops old tables first if they exist.
-- ============================================================

drop table if exists public.activity_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.submissions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.announcements cascade;
drop table if exists public.org_settings cascade;
drop table if exists public.profiles cascade;

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
-- id matches the Supabase Auth user id for people who self-registered
-- (via the Register form). Admin-added members without a login yet
-- get a random id until they self-register with a matching email.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone_number text,
  role text not null default 'Member' check (role in ('Member','Leader','Super Admin','Vice','Coordinator','Deputy Coordinator')),
  status text not null default 'Pending Approval' check (status in ('Pending Approval','Active','Disabled')),
  committee text default 'None',
  department text default 'None',
  membership_code text,
  avatar_url text,
  joined_date date default now(),
  bio text
);

-- ---------- TASKS ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  instructions text,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  deadline timestamptz,
  committee text,
  department text,
  status text not null default 'Draft' check (status in ('Draft','Published','Closed')),
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_date timestamptz default now(),
  allowed_file_types text[] default '{}',
  max_upload_size_mb integer default 10,
  allow_resubmission boolean default false,
  attachments jsonb default '[]'
);

-- ---------- SUBMISSIONS ----------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id_code text unique,
  task_id uuid references public.tasks(id) on delete cascade,
  task_name text,
  member_id uuid references public.profiles(id),
  member_name text,
  member_email text,
  committee text,
  department text,
  submitted_at timestamptz default now(),
  status text not null default 'Pending' check (status in ('Pending','Accepted','Rejected','Resubmission Requested')),
  file_url text,
  file_name text,
  file_size text,
  comment text,
  rejection_reason text,
  history jsonb default '[]'
);

-- ---------- ANNOUNCEMENTS ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  committee text default 'All',
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_date timestamptz default now(),
  is_pinned boolean default false
);

-- ---------- NOTIFICATIONS ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text,
  type text default 'info' check (type in ('info','success','warning','error')),
  is_read boolean default false,
  created_at timestamptz default now(),
  related_id text
);

-- ---------- ACTIVITY LOGS ----------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_role text,
  action text,
  details text,
  timestamp timestamptz default now()
);

-- ---------- ORGANIZATION SETTINGS (single row) ----------
create table public.org_settings (
  id integer primary key default 1,
  org_name text default 'EYE Workflow Hub',
  org_logo_url text,
  theme text default 'System',
  language text default 'English',
  allow_self_registration boolean default true,
  default_max_file_size_mb integer default 10,
  notification_channels jsonb default '{"email": true, "push": true, "system": true}',
  constraint single_row check (id = 1)
);
insert into public.org_settings (id) values (1);

-- ---------- ISSUED CERTIFICATES ----------
-- Persists every certificate issued by an admin so the recipient
-- can view it from any device, and so emails / notifications can
-- reference a stable id.
create table public.issued_certificates (
  id text primary key,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_role text,
  cert_type text not null,
  title text not null,
  body text,
  committee text,
  issued_by uuid references public.profiles(id),
  issued_by_name text not null,
  issued_by_title text,
  issued_at timestamptz default now(),
  grade integer
);
create index idx_issued_certificates_recipient on public.issued_certificates(recipient_id, issued_at desc);

-- ============================================================
-- Row Level Security
-- This is an internal org tool: any authenticated (logged-in) member
-- can read/write shared data. Tighten per-role later if needed.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.org_settings enable row level security;
alter table public.issued_certificates enable row level security;

create policy "authenticated full access" on public.tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.submissions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.announcements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.notifications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.activity_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.org_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.issued_certificates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Profiles: allow anon (logged-out) access too, since login/registration
-- need to check for existing emails and read the freshly created row
-- before the client's session is fully established.
create policy "open read" on public.profiles for select using (true);
create policy "open insert" on public.profiles for insert with check (true);
create policy "open update" on public.profiles for update using (true);

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.profiles, public.tasks, public.submissions, public.announcements, public.notifications, public.activity_logs, public.org_settings, public.issued_certificates;
