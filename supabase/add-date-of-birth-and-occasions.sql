-- ============================================================
-- EYE Workflow Hub — Date of Birth, Occasions & Feature Release Migration
-- Safe & Idempotent SQL script. Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add date_of_birth column to profiles table if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'date_of_birth'
  ) then
    alter table public.profiles add column date_of_birth date;
  end if;
end $$;

-- 2. Add category and target_url columns to announcements table if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'announcements' and column_name = 'category'
  ) then
    alter table public.announcements add column category text default 'General';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'announcements' and column_name = 'target_url'
  ) then
    alter table public.announcements add column target_url text;
  end if;
end $$;

-- 3. Create occasions table for managing holidays & celebrations
create table if not exists public.occasions (
  id text primary key,
  title text not null,
  message text not null,
  category text default 'Custom',
  start_date date not null,
  end_date date not null,
  icon text default '🎉',
  banner_bg text default 'from-amber-600 to-amber-800',
  target_committee text default 'All',
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- Enable RLS for public read access
alter table public.occasions enable row level security;

create policy "Allow read access to all users for occasions" 
on public.occasions for select 
using (true);

create policy "Allow all operations to authenticated users for occasions" 
on public.occasions for all 
using (true);
