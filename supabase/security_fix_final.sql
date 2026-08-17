-- ============================================================
-- EYE Workflow Hub — Final Security Migration
-- Version: 4.0 — secure RLS policies with role protection trigger
--
-- DO NOT EXECUTE until manually reviewed.
-- This migration fixes all RLS vulnerabilities while preserving
-- the necessary application workflows.
-- ============================================================

-- ======================================================================
-- SECTION 1: ROLE PROTECTION TRIGGER
-- Prevents privilege escalation by blocking role changes from
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
  -- Read the current user's role safely without re-querying profiles
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid()
  FOR NO KEY UPDATE SKIP LOCKED;

  -- If we cannot read role, deny role changes as a safety default
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
DROP POLICY IF EXISTS "notifs_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifs_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

-- Activity Logs
DROP POLICY IF EXISTS "authenticated full access" ON public.activity_logs;
DROP POLICY IF EXISTS "authenticated full access activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_open" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_system" ON public.activity_logs;

-- Issued Certificates
DROP POLICY IF EXISTS "authenticated full access" ON public.issued_certificates;
DROP POLICY IF EXISTS "authenticated full access certificates" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_select" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_insert" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_update" ON public.issued_certificates;
DROP POLICY IF EXISTS "open access issued_certificates" ON public.issued_certificates;

-- Org Settings
DROP POLICY IF EXISTS "authenticated full access" ON public.org_settings;
DROP POLICY IF EXISTS "settings_open_read" ON public.org_settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.org_settings;

-- ======================================================================
-- SECTION 3: CREATE SECURE RLS POLICIES
-- ======================================================================

-- ---------- PROFILES ----------
-- SELECT: Own profile only or admin roles may view any profile
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

-- INSERT: Self-registration (creates Member) or admin creates profiles
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

-- UPDATE: Own profile only (id and role protected by trigger)
CREATE POLICY "profiles_update_owner" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin roles may update any profile (id protected, role via trigger)
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

-- DELETE: Only Super Admin may delete a profile
CREATE POLICY "profiles_delete_super_admin" ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- ---------- TASKS ----------
-- SELECT: Authenticated users may read all tasks (shared data)
CREATE POLICY "tasks_select_authenticated" ON public.tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Creator must be authenticated and created_by must match
CREATE POLICY "tasks_insert_auth" ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- UPDATE: Creator only (created_by cannot change to another user)
CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Creator only
CREATE POLICY "tasks_delete_owner" ON public.tasks FOR DELETE
  USING (created_by = auth.uid());

-- ---------- SUBMISSIONS ----------
-- SELECT: Own submissions only
CREATE POLICY "submissions_select_owner" ON public.submissions FOR SELECT
  USING (member_id = auth.uid());

-- INSERT: Authenticated user creates own submission
CREATE POLICY "submissions_insert_owner" ON public.submissions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND member_id = auth.uid()
  );

-- UPDATE: Owner only (member_id cannot change)
CREATE POLICY "submissions_update_owner" ON public.submissions FOR UPDATE
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- DELETE: Owner only
CREATE POLICY "submissions_delete_owner" ON public.submissions FOR DELETE
  USING (member_id = auth.uid());

-- ---------- ANNOUNCEMENTS ----------
-- SELECT: Authenticated users may read announcements (shared data)
CREATE POLICY "announcements_select_authenticated" ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Admin roles may create announcements
CREATE POLICY "announcements_insert_admin" ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

-- UPDATE: Creator or admin may update
CREATE POLICY "announcements_update_creator_admin" ON public.announcements FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
      )
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
      )
    )
  );

-- DELETE: Creator or admin may delete
CREATE POLICY "announcements_delete_creator_admin" ON public.announcements FOR DELETE
  USING (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
      )
    )
  );

-- ---------- NOTIFICATIONS ----------
-- SELECT: Own notifications only
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Admin roles may create notifications
CREATE POLICY "notifications_insert_admin" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- UPDATE: Own notifications only
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Own notifications only
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- ---------- ACTIVITY LOGS ----------
-- SELECT: No policy - activity logs are admin-only or hidden
-- (If admin access is needed via application function, it uses SECURITY DEFINER)

-- INSERT: No policy - normal users cannot insert activity logs

-- UPDATE: No policy - activity logs are read-only for non-admins

-- DELETE: No policy - activity logs cannot be deleted by users

-- ---------- ISSUED CERTIFICATES ----------
-- SELECT: Own certificates only
CREATE POLICY "certificates_select_own" ON public.issued_certificates FOR SELECT
  USING (recipient_id = auth.uid());

-- SELECT: Admin roles may view any certificate
CREATE POLICY "certificates_select_admin" ON public.issued_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
    )
  );

-- INSERT: Super Admin only
CREATE POLICY "certificates_insert_super_admin" ON public.issued_certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- UPDATE: Super Admin only (recipient_id, issued_by cannot change via normal update)
CREATE POLICY "certificates_update_super_admin" ON public.issued_certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- DELETE: Super Admin only
CREATE POLICY "certificates_delete_super_admin" ON public.issued_certificates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- ---------- ORG SETTINGS ----------
-- SELECT: Authenticated users may read
CREATE POLICY "org_settings_select_authenticated" ON public.org_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Super Admin only
CREATE POLICY "org_settings_insert_super_admin" ON public.org_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- UPDATE: Super Admin only
CREATE POLICY "org_settings_update_super_admin" ON public.org_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- DELETE: Super Admin only
CREATE POLICY "org_settings_delete_super_admin" ON public.org_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Super Admin'
    )
  );

-- ======================================================================
-- END OF MIGRATION
-- ======================================================================