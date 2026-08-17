-- ============================================================
-- EYE Workflow Hub — Schema Update (v3)
-- Adds support for:
-- 1. Skills & Endorsements on user profiles
-- 2. Structured grading and completed subtasks on submissions
-- 3. Subtasks checklist and team task flag on tasks
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- 1. PROFILES UPDATE ----------
alter table public.profiles 
  add column if not exists skills text[] default '{}',
  add column if not exists endorsements jsonb default '{}';

-- ---------- 2. TASKS UPDATE ----------
alter table public.tasks
  add column if not exists subtasks jsonb default '[]',
  add column if not exists is_team_task boolean default false;

-- ---------- 3. SUBMISSIONS UPDATE ----------
alter table public.submissions
  add column if not exists grade integer,
  add column if not exists grading_criteria jsonb default '{}',
  add column if not exists completed_subtasks text[] default '{}';

-- ---------- 4. RECREATE REALTIME TABLES ----------
-- Force re-subscription to ensure Supabase sends updates for new columns
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.submissions;
