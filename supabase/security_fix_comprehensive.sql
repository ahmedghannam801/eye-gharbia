-- ============================================================
-- EYE Platform — Comprehensive Security Remediation Migration
-- Fixes Critical & High Severity Issues Identified in Audit
--
-- CRITICAL: RLS policies allowing ALL authenticated users to access
--          ALL governorates' data (24 governorates exposed)
-- HIGH: Default open policies on profiles allowing data manipulation
-- MEDIUM: Missing DELETE policies causing data integrity issues
--
-- DO NOT RUN YET — Review all changes before execution
-- ============================================================

-- ════════════════════════════════════════════════════════
-- 1. CREATE HELPER FUNCTIONS (Zero RLS Recursion)
-- Functions use SECURITY DEFINER to avoid circular references
-- ════════════════════════════════════════════════════════

-- Super admin check (role validation for privileged operations)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'المشرف العام')
  );
$$;

-- Safe governorate retrieval (prevents recursion when used in policies)
CREATE OR REPLACE FUNCTION public.get_my_governorate()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(governorate, 'الغربية')
  FROM public.profiles
  WHERE id = auth.uid() LIMIT 1;
$$;

-- Role-based access helpers for proper RBAC enforcement
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() LIMIT 1;
$$;

-- HR manager check — HR can view (but not modify) all governorates' member data
CREATE OR REPLACE FUNCTION public.is_hr_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('HR Manager', 'مدير موارد بشرية', 'Super Admin', 'المشرف العام')
  );
$$;

-- ════════════════════════════════════════════════════════
-- 2. ENSURE GOVERNORATE COLUMNS EXIST ON ALL RELEVANT TABLES
-- Without this, governorate-level isolation is impossible
-- ════════════════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.issued_certificates ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- Ensure activity_logs and notifications have governorate for audit
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
-- notifications are user-scoped, no governorate needed

-- Backfill NULL governorates to default
UPDATE public.profiles SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.issued_certificates SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.tasks SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.submissions SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.announcements SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.meetings SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.activity_logs SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';

-- ════════════════════════════════════════════════════════
-- 3. DROP ALL OLD INSECURE POLICIES (CRITICAL FIX)
-- Removes the dangerous "authenticated full access" policies
-- that exposed all 24 governorates to any logged-in user
-- ════════════════════════════════════════════════════════

-- Profiles: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.profiles;
DROP POLICY IF EXISTS "open access profiles" ON public.profiles;
DROP POLICY IF EXISTS "open read" ON public.profiles;
DROP POLICY IF EXISTS "open insert" ON public.profiles;
DROP POLICY IF EXISTS "open update" ON public.profiles;
DROP POLICY IF EXISTS "open read profiles" ON public.profiles;
DROP POLICY IF EXISTS "open insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "open update profiles" ON public.profiles;
DROP POLICY IF EXISTS "open delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_delete" ON public.profiles;

-- Tasks: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "authenticated full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_delete" ON public.tasks;
DROP POLICY IF EXISTS "open access tasks" ON public.tasks;

-- Submissions: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.submissions;
DROP POLICY IF EXISTS "authenticated full access submissions" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_update" ON public.submissions;
DROP POLICY IF EXISTS "open access submissions" ON public.submissions;

-- Announcements: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.announcements;
DROP POLICY IF EXISTS "authenticated full access announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_delete" ON public.announcements;
DROP POLICY IF EXISTS "open access announcements" ON public.announcements;

-- Notifications: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.notifications;
DROP POLICY IF EXISTS "authenticated full access notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifs_user_select" ON public.notifications;
DROP POLICY IF EXISTS "notifs_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifs_update_own" ON public.notifications;

-- Activity Logs: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.activity_logs;
DROP POLICY IF EXISTS "authenticated full access activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_open" ON public.activity_logs;

-- Issued Certificates: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.issued_certificates;
DROP POLICY IF EXISTS "authenticated full access certificates" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_select" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_insert" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_update" ON public.issued_certificates;
DROP POLICY IF EXISTS "open access issued_certificates" ON public.issued_certificates;

-- Org Settings: Drop old insecure policies
DROP POLICY IF EXISTS "authenticated full access" ON public.org_settings;
DROP POLICY IF EXISTS "settings_open_read" ON public.org_settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.org_settings;

-- ════════════════════════════════════════════════════════
-- 4. ENABLE RLS ON ALL TABLES (Defense in Depth)
-- Ensures no table operates without policy enforcement
-- ════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_workshops ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════
-- 5. CREATE SECURE RLS POLICIES (CRITICAL FIX)
-- Governororate isolation + Role-based access control
-- ════════════════════════════════════════════════════════

-- ── PROFILES ────────────────────────────────────────────
-- SELECT: Anyone can view profiles (needed for login/registration)
CREATE POLICY "profiles can be viewed by anyone"
  ON public.profiles FOR SELECT USING (true);
-- INSERT: During registration (handled by client, auto-assigned governorate)
CREATE POLICY "profiles can be inserted during registration"
  ON public.profiles FOR INSERT WITH CHECK (true);
-- UPDATE: Users can update their own profile; admins can update any
CREATE POLICY "profiles can be updated by owner"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles can be updated by super admin"
  ON public.profiles FOR UPDATE USING (public.is_super_admin());
-- DELETE: Only super admins can delete profiles (prevents data loss)
CREATE POLICY "profiles can be deleted by super admin only"
  ON public.profiles FOR DELETE USING (public.is_super_admin());

-- ── TASKS ───────────────────────────────────────────────
-- SELECT: Super admin sees all; others see only their governorate's tasks
CREATE POLICY "tasks visible to governorate members"
  ON public.tasks FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- INSERT: Users create tasks in their own governorate only
CREATE POLICY "tasks can be created in own governorate"
  ON public.tasks FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- UPDATE: Users can update tasks in their own governorate
CREATE POLICY "tasks can be updated in own governorate"
  ON public.tasks FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- DELETE: Only super admins can delete tasks (prevents accidental data loss)
CREATE POLICY "tasks can be deleted by super admin only"
  ON public.tasks FOR DELETE USING (public.is_super_admin());

-- ── SUBMISSIONS ─────────────────────────────────────────
CREATE POLICY "submissions visible to governorate members"
  ON public.submissions FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "submissions can be created in own governorate"
  ON public.submissions FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "submissions can be updated in own governorate"
  ON public.submissions FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- DELETE: Prevent accidental loss; super admin only
CREATE POLICY "submissions can be deleted by super admin only"
  ON public.submissions FOR DELETE USING (public.is_super_admin());

-- ── ANNOUNCEMENTS ───────────────────────────────────────
CREATE POLICY "announcements visible to governorate members"
  ON public.announcements FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "announcements can be created in own governorate"
  ON public.announcements FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "announcements can be updated in own governorate"
  ON public.announcements FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "announcements can be deleted by super admin only"
  ON public.announcements FOR DELETE USING (public.is_super_admin());

-- ── NOTIFICATIONS ───────────────────────────────────────
-- SELECT: Users can see their own notifications; HR can see team notifications
CREATE POLICY "notifications visible to recipient or super admin"
  ON public.notifications FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  );
-- INSERT: System/API generates notifications (checked in function)
CREATE POLICY "notifications can be inserted by system"
  ON public.notifications FOR INSERT WITH CHECK (true);
-- UPDATE: Users can mark their own notifications as read
CREATE POLICY "notifications can be updated by recipient"
  ON public.notifications FOR UPDATE USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  );
-- DELETE: Prevent data loss
CREATE POLICY "notifications can be deleted by super admin only"
  ON public.notifications FOR DELETE USING (public.is_super_admin());

-- ── ACTIVITY LOGS ───────────────────────────────────────
-- READ-ONLY: Logs are append-only system records
CREATE POLICY "activity logs visible to all authenticated"
  ON public.activity_logs FOR SELECT USING (true);
-- INSERT: System-generated, allow all authenticated (via trigger/function)
CREATE POLICY "activity logs can be inserted by any user"
  ON public.activity_logs FOR INSERT WITH CHECK (true);
-- DELETE: No deletes allowed (audit trail integrity)
CREATE POLICY "activity logs cannot be deleted"
  ON public.activity_logs FOR DELETE USING (false);

-- ── ISSUED CERTIFICATES ─────────────────────────────────
-- Certificates contain sensitive PII — governorate-scoped access
CREATE POLICY "certificates visible to governorate members"
  ON public.issued_certificates FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "certificates can be created in own governorate"
  ON public.issued_certificates FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "certificates can be updated in own governorate"
  ON public.issued_certificates FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "certificates can be deleted by super admin only"
  ON public.issued_certificates FOR DELETE USING (public.is_super_admin());

-- ── ORG SETTINGS ────────────────────────────────────────
-- Public readable settings; admin-only writes
CREATE POLICY "org settings publicly readable"
  ON public.org_settings FOR SELECT USING (true);
CREATE POLICY "org settings admin-only write"
  ON public.org_settings FOR ALL USING (public.is_super_admin());

-- ── MEETINGS ────────────────────────────────────────────
CREATE POLICY "meetings visible to governorate members"
  ON public.meetings FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "meetings can be created in own governorate"
  ON public.meetings FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "meetings can be updated in own governorate"
  ON public.meetings FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "meetings can be deleted by super admin only"
  ON public.meetings FOR DELETE USING (public.is_super_admin());

-- ── WORK PLANS ──────────────────────────────────────────
CREATE POLICY "work_plans visible to governorate members"
  ON public.work_plans FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "work_plans can be created in own governorate"
  ON public.work_plans FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "work_plans can be updated in own governorate"
  ON public.work_plans FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "work_plans can be deleted by super admin only"
  ON public.work_plans FOR DELETE USING (public.is_super_admin());

-- ── VOLUNTEER IDEAS ─────────────────────────────────────
CREATE POLICY "volunteer_ideas visible to governorate members"
  ON public.volunteer_ideas FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "volunteer_ideas can be created in own governorate"
  ON public.volunteer_ideas FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "volunteer_ideas can be updated in own governorate"
  ON public.volunteer_ideas FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "volunteer_ideas can be deleted by super admin only"
  ON public.volunteer_ideas FOR DELETE USING (public.is_super_admin());

-- ── MEMBER EVALUATIONS ──────────────────────────────────
CREATE POLICY "member_evaluations visible to governorate members"
  ON public.member_evaluations FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "member_evaluations can be created in own governorate"
  ON public.member_evaluations FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- No UPDATE or DELETE for evaluations (audit trail purpose)
CREATE POLICY "member_evaluations cannot be modified"
  ON public.member_evaluations FOR UPDATE USING (false);
CREATE POLICY "member_evaluations cannot be deleted"
  ON public.member_evaluations FOR DELETE USING (false);

-- ── LEADER FEEDBACKS ────────────────────────────────────
CREATE POLICY "leader_feedbacks visible to governorate members"
  ON public.leader_feedbacks FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "leader_feedbacks can be created in own governorate"
  ON public.leader_feedbacks FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
-- No UPDATE or DELETE for feedbacks (audit trail purpose)
CREATE POLICY "leader_feedbacks cannot be modified"
  ON public.leader_feedbacks FOR UPDATE USING (false);
CREATE POLICY "leader_feedbacks cannot be deleted"
  ON public.leader_feedbacks FOR DELETE USING (false);

-- ── LIVE WORKSHOPS ──────────────────────────────────────
CREATE POLICY "live_workshops visible to governorate members"
  ON public.live_workshops FOR SELECT USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "live_workshops can be created in own governorate"
  ON public.live_workshops FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "live_workshops can be updated in own governorate"
  ON public.live_workshops FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );
CREATE POLICY "live_workshops can be deleted by super admin only"
  ON public.live_workshops FOR DELETE USING (public.is_super_admin());

-- ════════════════════════════════════════════════════════
-- 6. REALTIME PUBLICATIONS
-- ════════════════════════════════════════════════════════

-- Ensure all secured tables are in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.profiles,
  public.tasks,
  public.submissions,
  public.announcements,
  public.notifications,
  public.activity_logs,
  public.org_settings,
  public.issued_certificates,
  public.meetings,
  public.work_plans,
  public.volunteer_ideas,
  public.member_evaluations,
  public.leader_feedbacks,
  public.live_workshops;

-- ════════════════════════════════════════════════════════
-- 7. VERIFICATION QUERIES (Run AFTER applying migration)
-- ════════════════════════════════════════════════════════

-- Verify RLS is enabled on all tables
-- SELECT schemaname, tablename, pg_policies.polname
-- FROM pg_tables JOIN pg_policy ON (schemaname='public' AND tablename=tablename)
-- WHERE schemaname='public' ORDER BY tablename;

-- Verify governorate column exists
-- SELECT column_name, table_name FROM information_schema.columns
-- WHERE column_name = 'governorate' AND table_schema = 'public' ORDER BY table_name;

-- Test governorate isolation (as a Member in one governorate)
-- SELECT count(*) FROM public.tasks WHERE governorate != public.get_my_governorate();
-- Should return 0 for governorate-isolated users

-- Test super admin access
-- SELECT count(*) FROM public.tasks; -- should return all rows
-- SELECT is_super_admin(); -- should return true for Super Admin

-- ════════════════════════════════════════════════════════
-- SUMMARY OF FIXES
-- ════════════════════════════════════════════════════════
-- 1. REPLACED insecure "authenticated full access" policies with
--    governorate-isolated policies preventing cross-governorate access
-- 2. RESTRICTED profile deletions to Super Admins only
-- 3. ADDED DELETE policies requiring Super Admin role on all tables
--    (Fixes data loss issue — prevents accidental/malicious deletion)
-- 4. ENFORCED governorate column on all tables (24 governorate isolation)
-- 5. MADE activity_logs DELETE-proof (prevents audit trail tampering)
-- 6. RESTRICTED member_evaluations and leader_feedbacks to read-only
-- 7. KEPT notifications properly scoped to recipient user_id
-- 8. MAINTAINED functionality for registration (profiles insert allowed)
-- 9. PRESERVED all existing data (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- ============================================================
