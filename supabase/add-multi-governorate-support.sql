-- ================================================================
-- EYE Platform — Multi-Governorate Support Migration (v4 - Fixed Execution Order)
-- آمن، مبرهن، وبدون تكرار لا نهائي (Zero RLS Recursion)
-- ترتيب التنفيذ: إضافة الأعمدة أولاً ثم إنشاء الدوال والسياسات
-- ================================================================

-- ════════════════════════════════════════════════
-- 1. إضافة عمود governorate أولاً لجميع الجداول
-- ════════════════════════════════════════════════

ALTER TABLE public.profiles            ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.issued_certificates ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.tasks               ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.submissions         ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.announcements       ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.meetings            ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.work_plans          ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.volunteer_ideas     ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.member_evaluations  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.leader_feedbacks    ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';
ALTER TABLE public.live_workshops      ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';


-- ════════════════════════════════════════════════
-- 2. تحديث القيم الخالية السابقة لتصبح 'الغربية'
-- ════════════════════════════════════════════════

UPDATE public.profiles            SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.issued_certificates SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.tasks               SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.submissions         SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.announcements       SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.meetings            SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.work_plans          SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.volunteer_ideas     SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.member_evaluations  SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.leader_feedbacks    SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';
UPDATE public.live_workshops      SET governorate = 'الغربية' WHERE governorate IS NULL OR governorate = '';


-- ════════════════════════════════════════════════
-- 3. دمج الدوال المساعدة الآمنة (SECURITY DEFINER)
-- ════════════════════════════════════════════════

-- دالة للتحقق هل المستخدم المشرف العام (Super Admin)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'Super Admin' OR role = 'المشرف العام')
  );
$$;

-- دالة تجلب محافظة المستخدم الحالي بأمان وبدون RLS Recursion
CREATE OR REPLACE FUNCTION public.get_my_governorate()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(governorate, 'الغربية') 
  FROM public.profiles 
  WHERE id = auth.uid() 
  LIMIT 1;
$$;


-- ════════════════════════════════════════════════
-- 4. جدول المناصب الرسمية
-- ════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.positions (
  id          serial       PRIMARY KEY,
  code        text         NOT NULL UNIQUE,
  name_ar     text         NOT NULL,
  name_en     text         NOT NULL,
  created_at  timestamptz  DEFAULT now()
);

INSERT INTO public.positions (code, name_ar, name_en)
  VALUES 
    ('Head', 'رئيس اللجنة', 'Committee Head'),
    ('Vice', 'نائب', 'Vice')
  ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "positions_open_read" ON public.positions;
CREATE POLICY "positions_open_read" ON public.positions FOR SELECT USING (true);


-- ════════════════════════════════════════════════
-- 5. RLS المحمي والقوي للجداول (خالي من Recursion)
-- ════════════════════════════════════════════════

-- ── 1. PROFILES ─────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_gov_select"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_update"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_gov_delete"  ON public.profiles;
DROP POLICY IF EXISTS "open access profiles" ON public.profiles;

-- قراءة البروفايلات مفتوحة للجميع لضمان المصادقة والـ Login والعرض السلس
CREATE POLICY "profiles_gov_select" ON public.profiles FOR SELECT USING (true);
-- إنشاء البروفايل مسموح عند التسجيل
CREATE POLICY "profiles_gov_insert" ON public.profiles FOR INSERT WITH CHECK (true);
-- التحديث مسموح للمستخدم لصاحب الحساب أو للمشرف العام
CREATE POLICY "profiles_gov_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());
-- الحذف محصور بالمشرف العام
CREATE POLICY "profiles_gov_delete" ON public.profiles FOR DELETE USING (public.is_super_admin());


-- ── 2. ISSUED CERTIFICATES ───────────────────────
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certs_gov_select" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_insert" ON public.issued_certificates;
DROP POLICY IF EXISTS "certs_gov_update" ON public.issued_certificates;
DROP POLICY IF EXISTS "open access issued_certificates" ON public.issued_certificates;

CREATE POLICY "certs_gov_select" ON public.issued_certificates
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "certs_gov_insert" ON public.issued_certificates
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "certs_gov_update" ON public.issued_certificates
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 3. TASKS ─────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_gov_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_delete" ON public.tasks;
DROP POLICY IF EXISTS "open access tasks" ON public.tasks;

CREATE POLICY "tasks_gov_select" ON public.tasks
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "tasks_gov_insert" ON public.tasks
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "tasks_gov_update" ON public.tasks
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "tasks_gov_delete" ON public.tasks
  FOR DELETE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 4. SUBMISSIONS ───────────────────────────────
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_gov_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_update" ON public.submissions;
DROP POLICY IF EXISTS "open access submissions" ON public.submissions;

CREATE POLICY "submissions_gov_select" ON public.submissions
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "submissions_gov_insert" ON public.submissions
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "submissions_gov_update" ON public.submissions
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 5. ANNOUNCEMENTS ─────────────────────────────
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_gov_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_gov_delete" ON public.announcements;
DROP POLICY IF EXISTS "open access announcements" ON public.announcements;

CREATE POLICY "announcements_gov_select" ON public.announcements
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "announcements_gov_insert" ON public.announcements
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "announcements_gov_update" ON public.announcements
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "announcements_gov_delete" ON public.announcements
  FOR DELETE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 6. MEETINGS ──────────────────────────────────
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_gov_select" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_insert" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_update" ON public.meetings;
DROP POLICY IF EXISTS "meetings_gov_delete" ON public.meetings;
DROP POLICY IF EXISTS "open access meetings" ON public.meetings;

CREATE POLICY "meetings_gov_select" ON public.meetings
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "meetings_gov_insert" ON public.meetings
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "meetings_gov_update" ON public.meetings
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "meetings_gov_delete" ON public.meetings
  FOR DELETE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 7. WORK PLANS ────────────────────────────────
ALTER TABLE public.work_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_plans_gov_select" ON public.work_plans;
DROP POLICY IF EXISTS "work_plans_gov_insert" ON public.work_plans;
DROP POLICY IF EXISTS "work_plans_gov_update" ON public.work_plans;
DROP POLICY IF EXISTS "open access work_plans" ON public.work_plans;

CREATE POLICY "work_plans_gov_select" ON public.work_plans
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "work_plans_gov_insert" ON public.work_plans
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "work_plans_gov_update" ON public.work_plans
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 8. VOLUNTEER IDEAS ───────────────────────────
ALTER TABLE public.volunteer_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ideas_gov_select" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "ideas_gov_insert" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "ideas_gov_update" ON public.volunteer_ideas;
DROP POLICY IF EXISTS "open access volunteer_ideas" ON public.volunteer_ideas;

CREATE POLICY "ideas_gov_select" ON public.volunteer_ideas
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "ideas_gov_insert" ON public.volunteer_ideas
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "ideas_gov_update" ON public.volunteer_ideas
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 9. MEMBER EVALUATIONS ────────────────────────
ALTER TABLE public.member_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evals_gov_select" ON public.member_evaluations;
DROP POLICY IF EXISTS "evals_gov_insert" ON public.member_evaluations;
DROP POLICY IF EXISTS "open access member_evaluations" ON public.member_evaluations;

CREATE POLICY "evals_gov_select" ON public.member_evaluations
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "evals_gov_insert" ON public.member_evaluations
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 10. LEADER FEEDBACKS ─────────────────────────
ALTER TABLE public.leader_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lfeed_gov_select" ON public.leader_feedbacks;
DROP POLICY IF EXISTS "lfeed_gov_insert" ON public.leader_feedbacks;
DROP POLICY IF EXISTS "open access leader_feedbacks" ON public.leader_feedbacks;

CREATE POLICY "lfeed_gov_select" ON public.leader_feedbacks
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "lfeed_gov_insert" ON public.leader_feedbacks
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ── 11. LIVE WORKSHOPS ───────────────────────────
ALTER TABLE public.live_workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workshops_gov_select" ON public.live_workshops;
DROP POLICY IF EXISTS "workshops_gov_insert" ON public.live_workshops;
DROP POLICY IF EXISTS "workshops_gov_update" ON public.live_workshops;
DROP POLICY IF EXISTS "open access live_workshops" ON public.live_workshops;

CREATE POLICY "workshops_gov_select" ON public.live_workshops
  FOR SELECT USING (
    public.is_super_admin()
    OR governorate IS NULL OR governorate = ''
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "workshops_gov_insert" ON public.live_workshops
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );

CREATE POLICY "workshops_gov_update" ON public.live_workshops
  FOR UPDATE USING (
    public.is_super_admin()
    OR governorate = public.get_my_governorate()
  );


-- ════════════════════════════════════════════════
-- 6. جداول مشتركة — open access (logs, notifications, settings)
-- ════════════════════════════════════════════════

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_open" ON public.activity_logs;
CREATE POLICY "logs_open" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifs_user_select" ON public.notifications;
DROP POLICY IF EXISTS "notifs_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifs_update_own" ON public.notifications;

CREATE POLICY "notifs_user_select" ON public.notifications 
  FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "notifs_insert_all" ON public.notifications 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifs_update_own" ON public.notifications 
  FOR UPDATE USING (user_id = auth.uid() OR public.is_super_admin());

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_open_read"   ON public.org_settings;
DROP POLICY IF EXISTS "settings_admin_write" ON public.org_settings;

CREATE POLICY "settings_open_read" ON public.org_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.org_settings FOR ALL USING (public.is_super_admin());
