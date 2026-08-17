-- ================================================================
-- EYE Platform — Multi-Governorate Support Rollback Script
-- آمن وإيديمبوتنت — يعيد الجداول وسياسات RLS للوضع الأصلي
-- ================================================================

-- ════════════════════════════════════════════════
-- 1. إيقاف RLS وتحديث السياسات للجداول الرئيسية
-- ════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_gov_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_delete" ON public.profiles;
DROP POLICY IF EXISTS "open access profiles" ON public.profiles;
CREATE POLICY "open access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS governorate;

-- ── issued_certificates ──────────────────────
ALTER TABLE public.issued_certificates DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certs_gov_select" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_insert" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_update" ON public.issued_certificates;
DROP POLICY IF EXISTS "open access issued_certificates" ON public.issued_certificates;
CREATE POLICY "open access issued_certificates" ON public.issued_certificates FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.issued_certificates DROP COLUMN IF EXISTS governorate;

-- ── tasks ─────────────────────────────────────
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_gov_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_delete" ON public.tasks;
DROP POLICY IF EXISTS "open access tasks" ON public.tasks;
CREATE POLICY "open access tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.tasks DROP COLUMN IF EXISTS governorate;

-- ── submissions ───────────────────────────────
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_gov_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_update" ON public.submissions;
DROP POLICY IF EXISTS "open access submissions" ON public.submissions;
CREATE POLICY "open access submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.submissions DROP COLUMN IF EXISTS governorate;

-- ── announcements ─────────────────────────────
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_gov_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_delete" ON public.announcements;
DROP POLICY IF EXISTS "open access announcements" ON public.announcements;
CREATE POLICY "open access announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.announcements DROP COLUMN IF EXISTS governorate;

-- ── meetings ──────────────────────────────────
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meetings_gov_select" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_insert" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_update" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_delete" ON public.meetings;
DROP POLICY IF EXISTS "open access meetings" ON public.meetings;
CREATE POLICY "open access meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.meetings DROP COLUMN IF EXISTS governorate;

-- ── work_plans ────────────────────────────────
ALTER TABLE public.work_plans DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_plans_gov_select" ON public.work_plans;
DROP POLICY IF EXISTS "work_plans_gov_insert" ON public.work_plans;
DROP POLICY IF EXISTS "work_plans_gov_update" ON public.work_plans;
DROP POLICY IF EXISTS "open access work_plans" ON public.work_plans;
CREATE POLICY "open access work_plans" ON public.work_plans FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.work_plans DROP COLUMN IF EXISTS governorate;

-- ── volunteer_ideas ───────────────────────────
ALTER TABLE public.volunteer_ideas DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ideas_gov_select" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "ideas_gov_insert" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "ideas_gov_update" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "open access volunteer_ideas" ON public.volunteer_ideas;
CREATE POLICY "open access volunteer_ideas" ON public.volunteer_ideas FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.volunteer_ideas DROP COLUMN IF EXISTS governorate;

-- ── member_evaluations ────────────────────────
ALTER TABLE public.member_evaluations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evals_gov_select" ON public.member_evaluations;
DROP POLICY IF EXISTS "evals_gov_insert" ON public.member_evaluations;
DROP POLICY IF EXISTS "open access member_evaluations" ON public.member_evaluations;
CREATE POLICY "open access member_evaluations" ON public.member_evaluations FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.member_evaluations DROP COLUMN IF EXISTS governorate;

-- ── leader_feedbacks ──────────────────────────
ALTER TABLE public.leader_feedbacks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lfeed_gov_select" ON public.leader_feedbacks;
DROP POLICY IF EXISTS "lfeed_gov_insert" ON public.leader_feedbacks;
DROP POLICY IF EXISTS "open access leader_feedbacks" ON public.leader_feedbacks;
CREATE POLICY "open access leader_feedbacks" ON public.leader_feedbacks FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.leader_feedbacks DROP COLUMN IF EXISTS governorate;

-- ── live_workshops ────────────────────────────
ALTER TABLE public.live_workshops DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshops_gov_select" ON public.live_workshops;
DROP POLICY IF EXISTS "workshops_gov_insert" ON public.live_workshops;
DROP POLICY IF EXISTS "workshops_gov_update" ON public.live_workshops;
DROP POLICY IF EXISTS "open access live_workshops" ON public.live_workshops;
CREATE POLICY "open access live_workshops" ON public.live_workshops FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.live_workshops DROP COLUMN IF EXISTS governorate;


-- ════════════════════════════════════════════════
-- 2. إعادة سياسات الجداول المشتركة
-- ════════════════════════════════════════════════

ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_open" ON public.activity_logs;
CREATE POLICY "open access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifs_user_select" ON public.notifications;
DROP POLICY IF EXISTS "notifs_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifs_update_own" ON public.notifications;
DROP POLICY IF EXISTS "open access notifications" ON public.notifications;
CREATE POLICY "open access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.org_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_open_read" ON public.org_settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.org_settings;
DROP POLICY IF EXISTS "open access org_settings" ON public.org_settings;
CREATE POLICY "open access org_settings" ON public.org_settings FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════
-- 3. حذف الدالة المساعدة
-- ════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.is_super_admin();
