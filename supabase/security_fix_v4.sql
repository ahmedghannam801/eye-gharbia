-- ============================================================
-- EYE Workflow Hub — Final Security Migration
-- Version: 4.0 — secure RLS policies with role protection trigger
-- ============================================================

-- DO NOT EXECUTE until manually reviewed.
-- This migration fixes all RLS vulnerabilities while preserving
-- the necessary application workflows.
-- ============================================================


-- ======================================================================
-- SECTION 1: ROLE PROTECTION TRIGGER
-- Prevent privilege escalation by blocking role changes from
-- non-administrative users.
-- ======================================================================


DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.profile_role_change_allowed();

CREATE OR REPLACE FUNCTION public.profile_role_change_allowed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Read the current user's role safely
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If we cannot read role, deny role/id changes as a safety default
  IF current_user_role IS NULL THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Role changes are restricted to authorized administrators only';
    END IF;
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'ID changes are not permitted';
    END IF;
    RETURN NEW;
  END IF;

  -- Admins may change roles and ids
  IF current_user_role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator') THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot change role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role changes are restricted to authorized administrators only';
  END IF;

  -- Non-admins cannot change id
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'ID changes are not permitted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profile_role_change_allowed();

-- ======================================================================
-- SECTION 2: DROP ALL INSECURE POLICIES
-- ======================================================================


-- Profiles
DROP POLICY IF EXISTS "authenticated full access" ON public.profiles;
DROP POLICY IF EXISTS "open read" ON public.profiles;
DROP POLICY IF EXISTS "open insert" ON public.profiles;
DROP POLICY IF EXISTS "open update" ON public.profiles;
DROP POLICY IF EXISTS "open delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_anyone" ON public.profiles;

-- Tasks
DROP POLICY IF EXISTS "authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "authenticated full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_delete" ON public.tasks;
DROP POLICY IF EXISTS "open access tasks" ON public.tasks;

-- Submissions
DROP POLICY IF EXISTS "authenticated full access" ON public.submissions;
DROP POLICY IF EXISTS "authenticated full access submissions" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_update" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_delete" ON public.submissions;
DROP POLICY IF EXISTS "open access submissions" ON public.submissions;

-- Announcements
DROP POLICY IF EXISTS "authenticated full access" ON public.announcements;
DROP POLICY IF EXISTS "authenticated full access announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_delete" ON public.announcements;
DROP POLICY IF EXISTS "open access announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_anyone" ON public.announcements;

-- Notifications
DROP POLICY IF EXISTS "authenticated full access" ON public.notifications;
DROP POLICY IF EXISTS "authenticated full access notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifs_user_select" ON public.notifications;

-- FIX 1: With CHECK added
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_hr_head" ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

-- ======================================================================
-- SECTION 3: CREATE SECURE RLS POLICIES
-- ======================================================================

-- ---------- PROFILES ----------

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "profiles_update_owner" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- FIX 2: WITH CHECK added
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

-- FIX 3: HR HEAD can delete profiles
CREATE POLICY "profiles_delete_hr_head" ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

-- ---------- TASKS ----------

CREATE POLICY "tasks_select_authenticated" ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_insert_auth" ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "tasks_delete_owner" ON public.tasks FOR DELETE
  USING (created_by = auth.uid());

-- ---------- SUBMISSIONS ----------

CREATE POLICY "submissions_select_owner" ON public.submissions FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "submissions_insert_owner" ON public.submissions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND member_id = auth.uid()
  );

CREATE POLICY "submissions_update_owner" ON public.submissions FOR UPDATE
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "submissions_delete_owner" ON public.submissions FOR DELETE
  USING (member_id = auth.uid());

-- ---------- ANNOUNCEMENTS ----------

CREATE POLICY "announcements_select_authenticated" ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_insert_admin" ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "announcements_update_creator_admin" ON public.announcements FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "announcements_delete_creator_admin" ON public.announcements FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

-- ---------- NOTIFICATIONS ----------

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- FIX 4: Admin roles may create notifications (normal Members cannot)
CREATE POLICY "notifications_insert_admin" ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- ---------- ACTIVITY LOGS ----------

-- No policies: activity logs are admin-only via SECURITY DEFINER functions
-- Normal users cannot SELECT, INSERT, UPDATE, or DELETE activity logs

-- ---------- ISSUED CERTIFICATES ----------

CREATE POLICY "certificates_select_own" ON public.issued_certificates FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "certificates_select_admin" ON public.issued_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

CREATE POLICY "certificates_insert_hr_head" ON public.issued_certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

CREATE POLICY "certificates_update_hr_head" ON public.issued_certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

CREATE POLICY "certificates_delete_hr_head" ON public.issued_certificates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

-- ---------- ORG SETTINGS ----------

CREATE POLICY "org_settings_select_authenticated" ON public.org_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "org_settings_insert_hr_head" ON public.org_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

CREATE POLICY "org_settings_update_hr_head" ON public.org_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

CREATE POLICY "org_settings_delete_hr_head" ON public.org_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HR HEAD'
    )
  );

-- ======================================================================
-- END OF MIGRATION
-- ======================================================================
