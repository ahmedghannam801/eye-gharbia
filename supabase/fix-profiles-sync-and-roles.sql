-- ============================================================
-- EYE Workflow Hub — Fix Profiles Table Schema, Sync & Roles Constraint
-- Execute this script in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Ensure all columns exist on public.profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sub_committee text,
  ADD COLUMN IF NOT EXISTS date_of_birth text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS endorsements jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_avatar_protected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_in_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS lft_nazar_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inzar_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 2. Drop existing restrictive role check constraint (if any)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Add comprehensive role check constraint including all roles supported by the platform
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('Member', 'Leader', 'Super Admin', 'HRM', 'Vice', 'Head', 'Coordinator', 'Deputy Coordinator', 'Central'));

-- 4. Enable Row Level Security and add open policies for reliable client-side synchronization
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open read profiles" ON public.profiles;
DROP POLICY IF EXISTS "open insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "open update profiles" ON public.profiles;
DROP POLICY IF EXISTS "open delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_delete" ON public.profiles;

CREATE POLICY "open read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "open insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "open update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "open delete profiles" ON public.profiles FOR DELETE USING (true);

-- 5. Enable Realtime updates on public.profiles
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;
