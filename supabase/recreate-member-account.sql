-- ============================================================
-- EYE Workflow Hub — Recreate deleted member's account
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- This migration:
--   1) Ensures the issued_certificates table exists (so the
--      Certificate Generator can persist + email recipients).
--   2) Adds a SECURITY DEFINER helper function `recreate_account`
--      that creates a Supabase Auth user AND a matching
--      public.profiles row in one call, callable by any
--      Super Admin from the SQL editor.
--
-- After running this, you can restore your own account with
-- one statement (see the EXAMPLE at the bottom of this file).
-- ============================================================

-- ─────────────────────────────────────────
-- 1) issued_certificates table (if missing)
-- ─────────────────────────────────────────
create table if not exists public.issued_certificates (
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

create index if not exists idx_issued_certificates_recipient
  on public.issued_certificates(recipient_id, issued_at desc);

alter table public.issued_certificates enable row level security;

drop policy if exists "authenticated full access" on public.issued_certificates;
create policy "authenticated full access"
  on public.issued_certificates
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'issued_certificates'
  ) then
    alter publication supabase_realtime add table public.issued_certificates;
  end if;
end $$;

-- ─────────────────────────────────────────
-- 2) recreate_account() — restores a deleted member
-- ─────────────────────────────────────────
-- Runs with the privileges of the function creator (SECURITY DEFINER),
-- which is what lets us INSERT into auth.users and into profiles
-- from a single SQL call. We then grant EXECUTE to the anon role so
-- it can be called from the SQL Editor (and the service role key from
-- the Edge Function) — but NOT from the browser directly.
create or replace function public.recreate_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'Member',
  p_status text default 'Active',
  p_committee text default 'None',
  p_department text default 'None',
  p_phone text default '+201000000000',
  p_membership_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_code text;
  v_count int;
  v_existing_profile_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Invalid email');
  end if;
  if p_password is null or length(p_password) < 6 then
    return jsonb_build_object('ok', false, 'error', 'Password must be at least 6 characters');
  end if;

  -- 1) If a profile row with this email already exists, drop it so
  --    we don't hit a unique-email conflict on the new insert.
  select id into v_existing_profile_id
    from public.profiles
    where lower(email) = lower(p_email)
    limit 1;
  if v_existing_profile_id is not null then
    delete from public.profiles where id = v_existing_profile_id;
  end if;

  -- 2) Create the Supabase Auth user (auto-confirmed so login works
  --    immediately, no email confirmation step needed).
  v_user_id := gen_random_uuid();
  begin
    insert into auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(), now(), '', '', '', ''
    );
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'auth.users insert failed: ' || sqlerrm);
  end;

  -- Also seed the identity table so email/password login works.
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    p_email,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', true),
    'email',
    now(), now(), now()
  );

  -- 3) Auto-generate membership code if not provided
  if p_membership_code is null or p_membership_code = '' then
    select count(*) into v_count from public.profiles;
    v_code := 'EYE-' || coalesce(nullif(p_committee, 'None'), 'M') || '-' ||
              case p_role
                when 'Leader' then 'L'
                when 'Vice' then 'V'
                when 'Coordinator' then 'C'
                when 'Deputy Coordinator' then 'DC'
                else ''
              end ||
              lpad(((v_count + 1))::text, 4, '0');
  else
    v_code := p_membership_code;
  end if;

  -- 4) Insert the matching public.profiles row
  insert into public.profiles (
    id, full_name, email, phone_number, role, status,
    committee, department, membership_code,
    joined_date, avatar_url, bio
  ) values (
    v_user_id, p_full_name, p_email, p_phone,
    p_role, p_status, p_committee, p_department, v_code,
    current_date,
    'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(convert_to(p_full_name, 'UTF8'), 'hex') || '&backgroundColor=0b59b1',
    'Official ' || p_role || ' of the ' || p_department || ' department.'
  );

  return jsonb_build_object(
    'ok', true,
    'userId', v_user_id,
    'email', p_email,
    'role', p_role,
    'committee', p_committee,
    'department', p_department,
    'membershipCode', v_code
  );
end;
$$;

-- Allow the function to be called from the SQL editor (and from
-- the service-role key in Edge Functions). NOT callable by anon.
revoke all on function public.recreate_account(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.recreate_account(text, text, text, text, text, text, text, text, text) to service_role;

-- ============================================================
-- EXAMPLE — restore Ahmed Ghannam (HRM Leader) account
-- ============================================================
-- Uncomment and run after the function above is installed:
--
-- select public.recreate_account(
--   p_email       := 'ahmedghannam801@gmail.com',
--   p_password    := 'Ahmed801*',
--   p_full_name   := 'أحمد غنام',
--   p_role        := 'Leader',
--   p_status      := 'Active',
--   p_committee   := 'HR',
--   p_department  := 'HRM',
--   p_phone       := '+201027053876',
--   p_membership_code := 'EYE-OWNER'
-- );
--
-- Then sign in at https://eye-workflow-hub.vercel.app with the
-- email + password above. You should land on the dashboard as the
-- HRM Leader with full Super-Admin-equivalent powers.
-- ============================================================
