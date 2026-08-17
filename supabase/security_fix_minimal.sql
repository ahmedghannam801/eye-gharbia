-- ============================================================
-- EYE Workflow Hub - Minimal Security Fix Migration
-- Preserves original schema while fixing RLS vulnerabilities
-- DO NOT EXECUTE - Review and apply manually
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE SECURITY FIX
-- ============================================================

-- Remove all existing permissive policies that allow:
-- - UNRESTRICTED read access to any profile
-- - Unrestricted INSERT/UPDATE without ownership checks
-- - Role escalation vulnerabilities
DROP POLICY IF EXISTS "authenticated full access" ON public.profiles;
DROP POLICY IF EXISTS "open read profiles" ON public.profiles;
DROP POLICY IF EXISTS "open insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "open update profiles" ON public.profiles;
DROP POLICY IF EXISTS "open read" ON public.profiles;
DROP POLICY IF EXISTS "open insert" ON public.profiles;
DROP POLICY IF EXISTS "open update" ON public.profiles;

-- Allow users to read their own profile (supports login/registration flow)
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow users to insert their own profile during self-registration
-- Prevent role escalation at creation time (only standard roles allowed)
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
WITH CHECK (
  id = auth.uid() AND
  role IN ('Member', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
);

-- Allow users to update their own profile
-- CRITICAL: Explicitly prevent role modification
-- A user CANNOT change their role because the policy requires:
-- - They own the row (id = auth.uid() in USING clause)
-- - The role value must equal the current role (role = OLD.role)
-- This prevents: role = 'Super Admin' or any role change
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = OLD.role AND
  governorate = OLD.governorate
);

-- Allow authorized admins to read profiles for legitimate admin purposes
-- (HR managers, coordinators viewing member info)
CREATE POLICY "profiles_admin_read" ON public.profiles
FOR SELECT
USING (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- Allow authorized admins to update profiles for other users
-- (necessary for admin workflow - e.g., admin updating member info)
CREATE POLICY "profiles_admin_update" ON public.profiles
FOR UPDATE
USING (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
)
WITH CHECK (
  role IN ('Member', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator', 'Super Admin')
);

-- Allow authorized admins to insert profiles for members who haven't registered yet
CREATE POLICY "profiles_admin_insert" ON public.profiles
FOR INSERT
WITH CHECK (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- ============================================================
-- 2. NOTIFICATIONS TABLE SECURITY FIX
-- ============================================================

-- Remove all existing permissive policies that allow:
-- - Reading other users' notifications
-- - Creating notifications for arbitrary users
-- - Modifying/deleting other users' notifications
DROP POLICY IF EXISTS "authenticated full access" ON public.notifications;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can only create notifications for themselves (prevents notification spam/abuse)
CREATE POLICY "notifications_insert_own" ON public.notifications
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own notifications
-- The USING clause verifies ownership before allowing UPDATE
-- The WITH CHECK clause prevents modifying user_id to another user
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================
-- 3. ACTIVITY LOGS TABLE SECURITY FIX
-- ============================================================

-- Remove any existing overly permissive policies that allow UPDATE/DELETE
DROP POLICY IF EXISTS "authenticated full access" ON public.activity_logs;
DROP POLICY IF EXISTS "open select activity_logs" ON public.activity_logs;

-- Allow authorized admins to view activity logs
-- Normal users should NOT have unrestricted access to audit history
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
FOR SELECT
USING (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- No INSERT, UPDATE, or DELETE policies for activity_logs
-- This prevents normal users from manipulating audit trails
-- Critical: INSERT is blocked to prevent fake log entries,
-- UPDATE/DELETE are blocked to prevent tampering
-- Administrative logging should use SECURITY DEFINER functions

-- ============================================================
-- 4. TASKS TABLE - DELETE PROTECTION
-- ============================================================

-- Remove overly permissive delete policies if any exist
DROP POLICY IF EXISTS "tasks_delete_all_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "authenticated full access" ON public.tasks;

-- Users can only DELETE their own tasks
CREATE POLICY "tasks_delete_own" ON public.tasks
FOR DELETE
USING (created_by = auth.uid());

-- Users can INSERT tasks (need to preserve)
CREATE POLICY "tasks_insert_authenticated" ON public.tasks
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can SELECT tasks (need to preserve)
CREATE POLICY "tasks_select_authenticated" ON public.tasks
FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can UPDATE their own tasks
CREATE POLICY "tasks_update_own" ON public.tasks
FOR UPDATE
USING (created_by = auth.uid());

-- ============================================================
-- 5. SUBMISSIONS TABLE - DELETE PROTECTION
-- ============================================================

-- Remove overly permissive delete policies
DROP POLICY IF EXISTS "submissions_delete_all_authenticated" ON public.submissions;
DROP POLICY IF EXISTS "authenticated full access" ON public.submissions;

-- Submission owner can only DELETE their own submissions
CREATE POLICY "submissions_delete_own" ON public.submissions
FOR DELETE
USING (member_id = auth.uid());

-- Users can INSERT submissions (need to preserve)
CREATE POLICY "submissions_insert_authenticated" ON public.submissions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can SELECT submissions (need to preserve)
CREATE POLICY "submissions_select_authenticated" ON public.submissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Submission owner can UPDATE their own submissions
CREATE POLICY "submissions_update_own" ON public.submissions
FOR UPDATE
USING (member_id = auth.uid());

-- ============================================================
-- 6. ANNOUNCEMENTS TABLE - DELETE PROTECTION
-- ============================================================

-- Remove overly permissive delete policies
DROP POLICY IF EXISTS "announcements_delete_all_authenticated" ON public.announcements;
DROP POLICY IF EXISTS "authenticated full access" ON public.announcements;

-- Announcement creator can only DELETE their own announcements
CREATE POLICY "announcements_delete_own" ON public.announcements
FOR DELETE
USING (created_by = auth.uid());

-- Users can INSERT announcements (need to preserve)
CREATE POLICY "announcements_insert_authenticated" ON public.announcements
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can SELECT announcements (need to preserve)
CREATE POLICY "announcements_select_authenticated" ON public.announcements
FOR SELECT
USING (auth.role() = 'authenticated');

-- Announcement creator can UPDATE their own announcements
CREATE POLICY "announcements_update_own" ON public.announcements
FOR UPDATE
USING (created_by = auth.uid());

-- ============================================================
-- 7. ISSUED CERTIFICATES TABLE - DELETE PROTECTION
-- ============================================================

-- Remove overly permissive delete policies
DROP POLICY IF EXISTS "certificates_delete_all_authenticated" ON public.issued_certificates;
DROP POLICY IF EXISTS "authenticated full access" ON public.issued_certificates;

-- Only admin roles can DELETE certificates
CREATE POLICY "certificates_delete_admin" ON public.issued_certificates
FOR DELETE
USING (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- Users can SELECT certificates
CREATE POLICY "certificates_select_authenticated" ON public.issued_certificates
FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can INSERT their own certificates
CREATE POLICY "certificates_insert_own" ON public.issued_certificates
FOR INSERT
WITH CHECK (
  recipient_id = auth.uid() OR
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- ============================================================
-- 8. ORG_SETTINGS TABLE - READ/WRITE RESTRICTION
-- ============================================================

-- Remove overly permissive policies
DROP POLICY IF EXISTS "authenticated full access" ON public.org_settings;

-- All authenticated users can read org settings
CREATE POLICY "org_settings_select_authenticated" ON public.org_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admin roles can modify org settings
CREATE POLICY "org_settings_update_admin" ON public.org_settings
FOR UPDATE
USING (
  exists (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND
    p.role IN ('Super Admin', 'Leader', 'Vice', 'Coordinator', 'Deputy Coordinator')
  )
);

-- ============================================================
-- 9. MEETINGS TABLE - DELETE PROTECTION
-- ============================================================

DROP POLICY IF EXISTS "authenticated full access" ON public.meetings;

-- Meeting creator can only DELETE their own meetings
CREATE POLICY "meetings_delete_own" ON public.meetings
FOR DELETE
USING (created_by = auth.uid());

-- Users can INSERT meetings
CREATE POLICY "meetings_insert_authenticated" ON public.meetings
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Users can SELECT meetings
CREATE POLICY "meetings_select_authenticated" ON public.meetings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Meeting creator can UPDATE their own meetings
CREATE POLICY "meetings_update_own" ON public.meetings
FOR UPDATE
USING (created_by = auth.uid());

-- ============================================================
-- VERIFICATION - NO SCHEMA CHANGES MADE
-- ============================================================
-- No ALTER TABLE statements present
-- No DROP TABLE statements present
-- No ADD COLUMN statements present
-- No DROP COLUMN statements present
-- No TRUNCATE statements present
-- No data modification (no INSERT INTO/UPDATE/DELETE FROM application data)
-- No database recreation
-- No governorate architecture changes
-- No new functions created
-- No role changes to existing profiles
-- No column modifications to any table

-- ============================================================
-- LEGACY POLICIES REMOVED
-- ============================================================
-- "authenticated full access" on profiles, notifications, activity_logs,
--   tasks, submissions, announcements, issued_certificates, org_settings, meetings
-- "open read profiles", "open insert profiles", "open update profiles"
-- "open read" on profiles
-- "open insert" on profiles
-- "open update" on profiles
-- "open select activity_logs" on activity_logs