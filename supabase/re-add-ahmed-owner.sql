-- ============================================================
-- EYE Workflow Hub — Re-add the HR Committee Head account
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) Make sure the auth user exists. If you ran the bulk delete,
--    only the `profiles` row was removed — the auth account in
--    auth.users is still there, so just re-link the profile.

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
  avatar_url,
  joined_date,
  bio
)
values (
  (select id from auth.users where email = 'ahmedghannam801@gmail.com' limit 1),
  'Ahmed Ebrahim',         -- ◀── الاسم الكامل
  'ahmedghannam801@gmail.com',
  '+201027053876',         -- ◀── الرقم
  'Super Admin',           -- ◀── HR Committee Head = Super Admin
  'Active',
  'HR',                    -- ◀── HR Committee
  'HRM',                   -- ◀── HR Management
  'EYE-OWNER',             -- ◀── membership code
  'https://api.dicebear.com/7.x/initials/svg?seed=AhmedEbrahim&backgroundColor=d97706',
  current_date,
  'رئيس لجنة الموارد البشرية — كيان المصريون الشباب EYE. المؤسس والمدير التنفيذي لمنظومة EYE.'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  phone_number = excluded.phone_number,
  role = excluded.role,
  status = excluded.status,
  committee = excluded.committee,
  department = excluded.department,
  membership_code = excluded.membership_code,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio;

-- 2) Verify the profile was created
select id, full_name, email, role, status, committee, department, membership_code
from public.profiles
where email = 'ahmedghannam801@gmail.com';

-- 3) (OPTIONAL) If the auth user was deleted too, you'll need to
--    recreate it via the Supabase Dashboard:
--    Authentication → Users → Add user → Add user manually
--    email:    ahmedghannam801@gmail.com
--    password: Ahmed801*
--    Then re-run step 1 above to link the profile.
