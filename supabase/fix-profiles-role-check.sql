-- ============================================================
-- EYE Workflow Hub — Fix Profiles Role Check Constraint
-- Run this query in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Drop existing constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add updated constraint supporting all roles in the app
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('Member', 'Leader', 'Super Admin', 'Vice', 'Coordinator', 'Deputy Coordinator'));
