-- ============================================================
-- EYE Workflow Hub — Delete all users except the current owner
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- ⚠️  DESTRUCTIVE — read carefully before running!
-- This script will:
--   1) DELETE every row in public.profiles EXCEPT the one matching
--      the email below.
--   2) DELETE every task/submission/announcement/notification that
--      belongs to those removed users (to avoid orphan records).
--   3) DELETE the corresponding Supabase Auth accounts from
--      auth.users, so the removed members can no longer log in.
--   4) LEAVE the current user's data + auth account untouched.
--
-- The SQL Editor runs as the postgres superuser, so it has
-- permission to touch auth.users directly (no service_role key
-- needed when running from the SQL Editor).
-- ============================================================

-- ┌─────────────────────────────────────────────────────────────┐
-- │  STEP 1 — PREVIEW: shows exactly which users WILL be deleted │
-- │  (read-only, safe to run as many times as you want)          │
-- └─────────────────────────────────────────────────────────────┘
select
  id,
  full_name,
  email,
  role,
  status,
  committee,
  department,
  membership_code,
  joined_date
from public.profiles
where email <> 'ahmedghannam801@gmail.com'   -- ◀── your email (keep this row)
order by joined_date desc;

-- ┌─────────────────────────────────────────────────────────────┐
-- │  STEP 2 — ACTUAL DELETION                                   │
-- │  Uncomment the block below ONLY after you've reviewed       │
-- │  the preview above and are sure you want to proceed.        │
-- └─────────────────────────────────────────────────────────────┘

/*
begin;

-- 2a) Notifications linked to users about to be deleted
--     (CASCADE would also handle this, but we do it explicitly for clarity)
delete from public.notifications
where user_id in (
  select id from public.profiles
  where email <> 'ahmedghannam801@gmail.com'
);

-- 2b) Submissions submitted by users about to be deleted
delete from public.submissions
where member_id in (
  select id from public.profiles
  where email <> 'ahmedghannam801@gmail.com'
);

-- 2c) Tasks created by users about to be deleted
delete from public.tasks
where created_by in (
  select id from public.profiles
  where email <> 'ahmedghannam801@gmail.com'
);

-- 2d) Announcements created by users about to be deleted
delete from public.announcements
where created_by in (
  select id from public.profiles
  where email <> 'ahmedghannam801@gmail.com'
);

-- 2e) Activity log entries from those users
delete from public.activity_logs
where user_id in (
  select id from public.profiles
  where email <> 'ahmedghannam801@gmail.com'
);

-- 2f) Finally, delete the profile rows themselves.
--     CASCADE on auth.users.id (foreign key from public.profiles)
--     will automatically remove the matching auth.users rows.
delete from public.profiles
where email <> 'ahmedghannam801@gmail.com';

-- 2g) Belt-and-suspenders: any auth.users row whose email is no
--     longer in public.profiles gets cleaned up here too. This
--     catches the case where an admin added a member who never
--     self-registered (no profile row existed in the first place).
delete from auth.users
where email <> 'ahmedghannam801@gmail.com';

commit;
*/

-- ┌─────────────────────────────────────────────────────────────┐
-- │  STEP 3 — VERIFY: should return exactly 1 row (your account)│
-- └─────────────────────────────────────────────────────────────┘
select count(*) as remaining_profiles from public.profiles;
select id, full_name, email, role from public.profiles;

-- Also confirm the matching auth.users is the only one left.
select count(*) as remaining_auth_users from auth.users;
