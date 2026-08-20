-- ============================================================
-- EYE Platform - Comprehensive Schema Upgrade for All Tables
-- Adds missing columns, RLS enablement, and schema refresh
-- ============================================================

-- 1. Tasks enhancements
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_by_name text,
  ADD COLUMN IF NOT EXISTS completed_date timestamptz,
  ADD COLUMN IF NOT EXISTS max_score numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS allowed_file_types jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS max_upload_size_mb numeric DEFAULT 25,
  ADD COLUMN IF NOT EXISTS allow_resubmission boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_team_task boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_video_task boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS assigned_member_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 2. Attendance enhancements
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS attended_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS method text DEFAULT 'Code',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Present',
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 3. Excuses & Freezes enhancements
ALTER TABLE public.excuses_freezes
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_name text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 4. Work Plans enhancements
ALTER TABLE public.work_plans
  ADD COLUMN IF NOT EXISTS target_month text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 5. Volunteer Ideas enhancements
ALTER TABLE public.volunteer_ideas
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_committee text,
  ADD COLUMN IF NOT EXISTS author_role text,
  ADD COLUMN IF NOT EXISTS votes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 6. Member Evaluations enhancements
ALTER TABLE public.member_evaluations
  ADD COLUMN IF NOT EXISTS member_id uuid,
  ADD COLUMN IF NOT EXISTS member_name text,
  ADD COLUMN IF NOT EXISTS month integer,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS evaluated_by uuid,
  ADD COLUMN IF NOT EXISTS evaluated_by_name text,
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 7. Leader Feedbacks enhancements
ALTER TABLE public.leader_feedbacks
  ADD COLUMN IF NOT EXISTS leader_role text,
  ADD COLUMN IF NOT EXISTS month integer,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS ratings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_by_name text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 8. Live Workshops enhancements
ALTER TABLE public.live_workshops
  ADD COLUMN IF NOT EXISTS instructor text,
  ADD COLUMN IF NOT EXISTS instructor_title text,
  ADD COLUMN IF NOT EXISTS date_time timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 9. Academy Courses enhancements
ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS instructor text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS lessons jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 10. Reward Items & Purchases
ALTER TABLE public.reward_items
  ADD COLUMN IF NOT EXISTS points_cost numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

ALTER TABLE public.reward_purchases
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_committee text,
  ADD COLUMN IF NOT EXISTS item_id uuid,
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS points_spent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_by text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- 11. Weekly Quizzes & Challenges & Posters & Occasions
ALTER TABLE public.weekly_quizzes
  ADD COLUMN IF NOT EXISTS time_limit_minutes numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS questions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS points numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS target_committee text,
  ADD COLUMN IF NOT EXISTS submission_type text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

ALTER TABLE public.occasions
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

ALTER TABLE public.issued_posters
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS committee text,
  ADD COLUMN IF NOT EXISTS poster_type text,
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- Reload schema
NOTIFY pgrst, 'reload schema';
