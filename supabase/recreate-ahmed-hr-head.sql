-- ============================================================
-- EYE Workflow Hub — Recreate Ahmed Ghannam (HRM Leader) account
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- What this does:
--   1) Inserts your profile row in public.profiles
--      (so the app recognises you as the HRM Leader).
--   2) Creates a Supabase Auth user so you can actually sign in.
--
-- BEFORE you run this:
--   - Open Authentication → Users in your Supabase Dashboard
--   - Click "Add user" → "Create new user"
--   - Email: ahmedghannam801@gmail.com
--   - Password: Ahmed801*
--   - Auto Confirm User: ON
--   - Click "Create user"
--   - COPY the User UID it shows you
--   - Then run this script, replacing 'PASTE-USER-UID-HERE' with that UID
-- ============================================================

-- 1) Create the profile row for the HRM Leader
insert into public.profiles (
  id,
  full_name,
  email,
  phone_number,
  role,
  status,
  committee,
  department,
  membership_code,
  joined_date,
  bio,
  avatar_url
) values (
  'PASTE-USER-UID-HERE'::uuid,                      -- the UUID from auth.users
  'أحمد غنام',
  'ahmedghannam801@gmail.com',
  '+201000000000',
  'Leader',
  'Active',
  'HR',
  'HRM',
  'EYE-HR-L0001',
  current_date,
  'رئيس لجنة الموارد البشرية — كيان المصريون الشباب EYE',
  'https://api.dicebear.com/7.x/initials/svg?seed=AhmedGhannam&backgroundColor=0b59b1'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  committee = excluded.committee,
  department = excluded.department,
  membership_code = excluded.membership_code,
  bio = excluded.bio;

-- 2) Verify the row was created
select id, full_name, email, role, status, committee, department, membership_code
from public.profiles
where email = 'ahmedghannam801@gmail.com';
