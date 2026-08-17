-- ============================================================
-- EYE Workflow Hub — MASTER PLATFORM CLOUD SCHEMA & SYNC
-- Run in Supabase SQL Editor. Fully idempotent & safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- 1. PROFILES TABLE ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone_number text,
  role text NOT NULL DEFAULT 'Member',
  status text NOT NULL DEFAULT 'Active',
  committee text DEFAULT 'None',
  department text DEFAULT 'None',
  membership_code text,
  avatar_url text,
  joined_date date DEFAULT now(),
  bio text,
  governorate text DEFAULT 'الغربية',
  skills text[] DEFAULT '{}',
  endorsements jsonb DEFAULT '{}',
  points integer DEFAULT 0,
  level text DEFAULT 'Bronze',
  created_at timestamptz DEFAULT now()
);

-- Ensure all columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية',
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS endorsements jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level text DEFAULT 'Bronze',
  ADD COLUMN IF NOT EXISTS membership_code text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- ---------- 2. TASKS & SUBMISSIONS ----------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  instructions text,
  priority text NOT NULL DEFAULT 'Medium',
  deadline timestamptz,
  committee text DEFAULT 'All',
  department text DEFAULT 'All',
  status text NOT NULL DEFAULT 'Published',
  created_by uuid,
  created_by_name text,
  created_date timestamptz DEFAULT now(),
  allowed_file_types text[] DEFAULT '{}',
  max_upload_size_mb integer DEFAULT 25,
  allow_resubmission boolean DEFAULT true,
  attachments jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية',
  assigned_member_ids text[] DEFAULT '{}',
  target_audience text DEFAULT 'all_committee',
  is_video_task boolean DEFAULT false,
  video_url text,
  subtasks jsonb DEFAULT '[]',
  is_team_task boolean DEFAULT false
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية',
  ADD COLUMN IF NOT EXISTS assigned_member_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all_committee',
  ADD COLUMN IF NOT EXISTS is_video_task boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_team_task boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id_code text,
  task_id uuid,
  task_name text,
  member_id uuid,
  member_name text,
  member_email text,
  committee text,
  department text,
  submitted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Pending',
  file_url text,
  file_name text,
  file_size text,
  comment text,
  rejection_reason text,
  history jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية',
  completed_subtasks text[] DEFAULT '{}',
  grade integer,
  grading_criteria jsonb DEFAULT '{}'
);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية',
  ADD COLUMN IF NOT EXISTS completed_subtasks text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS grade integer,
  ADD COLUMN IF NOT EXISTS grading_criteria jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS submission_id_code text;

-- ---------- 3. ANNOUNCEMENTS & NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  committee text DEFAULT 'All',
  created_by uuid,
  created_by_name text,
  created_date timestamptz DEFAULT now(),
  is_pinned boolean DEFAULT false,
  governorate text DEFAULT 'الغربية',
  banner_url text,
  reactions jsonb DEFAULT '{}'
);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية',
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  related_id text
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS related_id text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- ---------- 4. MEETINGS & ATTENDANCE ----------
CREATE TABLE IF NOT EXISTS public.meetings (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'General',
  committee text DEFAULT 'All',
  department text DEFAULT 'All',
  scheduled_at timestamptz NOT NULL,
  location text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'Scheduled',
  attendance_code text NOT NULL,
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية',
  ADD COLUMN IF NOT EXISTS attendance_code text;

CREATE TABLE IF NOT EXISTS public.attendance (
  id text PRIMARY KEY,
  meeting_id text,
  member_id uuid,
  member_name text NOT NULL,
  member_email text,
  committee text,
  department text,
  checked_in_at timestamptz DEFAULT now(),
  is_excused boolean DEFAULT false,
  excuse_reason text,
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS is_excused boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excuse_reason text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 5. EXCUSES & FREEZE REQUESTS ----------
CREATE TABLE IF NOT EXISTS public.excuses_freezes (
  id text PRIMARY KEY,
  user_id uuid,
  user_name text NOT NULL,
  committee text,
  department text,
  type text NOT NULL, -- 'Excuse' or 'Freeze'
  reason text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  decision_by uuid,
  decision_by_name text,
  decision_notes text,
  created_at timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.excuses_freezes
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 6. ISSUED CERTIFICATES ----------
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id text PRIMARY KEY,
  recipient_id uuid,
  recipient_name text NOT NULL,
  recipient_role text,
  cert_type text NOT NULL,
  title text NOT NULL,
  body text,
  committee text,
  issued_by uuid,
  issued_by_name text NOT NULL,
  issued_by_title text,
  issued_at timestamptz DEFAULT now(),
  grade numeric,
  lang text DEFAULT 'ar',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS grade numeric,
  ADD COLUMN IF NOT EXISTS lang text DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 7. WORK PLANS & OKRS ----------
CREATE TABLE IF NOT EXISTS public.work_plans (
  id text PRIMARY KEY,
  title text NOT NULL,
  objective text,
  committee text DEFAULT 'All',
  department text DEFAULT 'All',
  month text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'On Track',
  key_results jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.work_plans
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 8. VOLUNTEER IDEAS (IDEA BANK) ----------
CREATE TABLE IF NOT EXISTS public.volunteer_ideas (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  committee text DEFAULT 'All',
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  upvotes jsonb DEFAULT '[]',
  status text DEFAULT 'Pitching',
  comments jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.volunteer_ideas
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 9. EVALUATIONS & 360 FEEDBACK ----------
CREATE TABLE IF NOT EXISTS public.member_evaluations (
  id text PRIMARY KEY,
  target_user_id uuid,
  target_user_name text,
  target_user_role text DEFAULT 'Member',
  evaluator_id uuid,
  evaluator_name text,
  evaluator_role text DEFAULT 'Leader',
  committee text,
  department text,
  overall_rating numeric DEFAULT 5,
  commitment_rating numeric DEFAULT 5,
  quality_rating numeric DEFAULT 5,
  teamwork_rating numeric DEFAULT 5,
  activity_rating numeric DEFAULT 5,
  feedback_comment text,
  created_at timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.member_evaluations
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

CREATE TABLE IF NOT EXISTS public.leader_feedbacks (
  id text PRIMARY KEY,
  leader_id uuid,
  leader_name text,
  committee text DEFAULT 'All',
  reviewer_id uuid,
  rating numeric DEFAULT 5,
  communication numeric DEFAULT 5,
  support numeric DEFAULT 5,
  fairness numeric DEFAULT 5,
  comment text,
  submitted_at timestamptz DEFAULT now(),
  is_anonymous boolean DEFAULT false,
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.leader_feedbacks
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 10. DISCIPLINARY RECORDS ----------
CREATE TABLE IF NOT EXISTS public.disciplinary_records (
  id text PRIMARY KEY,
  member_id uuid,
  member_name text NOT NULL,
  member_role text,
  committee text,
  department text,
  type text NOT NULL, -- 'Warning', 'Notice', 'Penalty', 'Dismissal'
  reason text NOT NULL,
  action_taken text,
  issued_by uuid,
  issued_by_name text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  status text DEFAULT 'Active',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.disciplinary_records
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 11. LIVE WORKSHOPS & ACADEMY ----------
CREATE TABLE IF NOT EXISTS public.live_workshops (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  stream_type text DEFAULT 'youtube_live',
  stream_url text,
  committee text DEFAULT 'All',
  department text DEFAULT 'All',
  status text DEFAULT 'Scheduled',
  scheduled_at timestamptz,
  points_reward integer DEFAULT 50,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  attendees_count integer DEFAULT 0,
  attendee_ids jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.live_workshops
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

CREATE TABLE IF NOT EXISTS public.academy_courses (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text DEFAULT 'General',
  committee text DEFAULT 'All',
  reads_count integer DEFAULT 0,
  completed_by jsonb DEFAULT '[]',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 12. REWARDS SHOP & PURCHASES ----------
CREATE TABLE IF NOT EXISTS public.reward_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  cost_points integer DEFAULT 100,
  stock integer DEFAULT 10,
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.reward_items
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

CREATE TABLE IF NOT EXISTS public.reward_purchases (
  id text PRIMARY KEY,
  reward_id text,
  reward_title text NOT NULL,
  cost_points integer DEFAULT 100,
  member_id uuid,
  member_name text NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  status text DEFAULT 'Pending',
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.reward_purchases
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 13. WEEKLY QUIZZES & CHALLENGES ----------
CREATE TABLE IF NOT EXISTS public.weekly_quizzes (
  id text PRIMARY KEY,
  question text NOT NULL,
  options jsonb DEFAULT '[]',
  correct_answer_index integer DEFAULT 0,
  points_reward integer DEFAULT 50,
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.weekly_quizzes
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  points integer DEFAULT 100,
  committee text DEFAULT 'All',
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 14. MEMORY WALL (PHOTO/STORY SHARING) ----------
CREATE TABLE IF NOT EXISTS public.memory_wall (
  id text PRIMARY KEY,
  author_id uuid,
  author_name text NOT NULL,
  author_avatar text,
  author_role text,
  committee text,
  image_url text NOT NULL,
  caption text,
  likes jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.memory_wall
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- ---------- 15. ACTIVITY LOGS & ORG SETTINGS ----------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_role text,
  action text,
  details text,
  timestamp timestamptz DEFAULT now(),
  governorate text DEFAULT 'الغربية'
);

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

CREATE TABLE IF NOT EXISTS public.org_settings (
  id integer PRIMARY KEY DEFAULT 1,
  org_name text DEFAULT 'EYE Workflow Hub',
  org_logo_url text,
  theme text DEFAULT 'System',
  language text DEFAULT 'Arabic',
  allow_self_registration boolean DEFAULT true,
  default_max_file_size_mb integer DEFAULT 25,
  notification_channels jsonb DEFAULT '{"email": true, "push": true, "system": true}',
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.org_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ENABLE RLS & CREATE OPEN POLICIES FOR ALL TABLES (VIP COMPATIBLE)
-- ============================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'profiles', 'tasks', 'submissions', 'announcements', 'notifications',
    'activity_logs', 'org_settings', 'issued_certificates', 'meetings',
    'attendance', 'excuses_freezes', 'work_plans', 'volunteer_ideas',
    'member_evaluations', 'leader_feedbacks', 'disciplinary_records',
    'live_workshops', 'academy_courses', 'reward_items', 'reward_purchases',
    'weekly_quizzes', 'weekly_challenges', 'memory_wall'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- 1. Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    -- 2. Drop existing open/all policies if any
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'open_access_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_all_auth', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_insert_any_auth', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_update_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_delete_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'open access ' || tbl, tbl);

    -- 3. Create clean Open Policy allowing full select, insert, update, delete for VIP & Auth
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', 'open_access_' || tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- RECREATE / ENSURE REALTIME SUBSCRIPTIONS
-- ============================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.profiles,
    public.tasks,
    public.submissions,
    public.announcements,
    public.notifications,
    public.activity_logs,
    public.issued_certificates,
    public.meetings,
    public.attendance,
    public.excuses_freezes,
    public.work_plans,
    public.volunteer_ideas,
    public.member_evaluations,
    public.leader_feedbacks,
    public.disciplinary_records,
    public.live_workshops,
    public.academy_courses,
    public.reward_items,
    public.reward_purchases,
    public.weekly_quizzes,
    public.weekly_challenges,
    public.memory_wall;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ============================================================
-- STORAGE BUCKETS (Make Public and Open RLS)
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('task-submissions', 'task-submissions', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('memory-wall', 'memory-wall', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage open policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
  DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
  DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
  DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

  CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (true);
  CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE USING (true);
EXCEPTION
  WHEN others THEN NULL;
END $$;
