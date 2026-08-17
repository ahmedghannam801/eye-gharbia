-- ========================================================
-- EYE Platform - Comprehensive Database Schema & RLS Setup
-- Copy and run this script in the Supabase SQL Editor.
-- ========================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Member',
    governorate TEXT NOT NULL,
    committee TEXT NOT NULL,
    department TEXT NOT NULL,
    national_id TEXT,
    phone TEXT,
    code TEXT,
    status TEXT DEFAULT 'Active',
    joined_date TIMESTAMPTZ DEFAULT NOW(),
    avatar_url TEXT,
    sub_committee TEXT
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    priority TEXT DEFAULT 'Medium',
    deadline TIMESTAMPTZ NOT NULL,
    committee TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'Draft',
    created_by TEXT,
    created_by_name TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    allowed_file_types TEXT[],
    max_upload_size_mb INT DEFAULT 10,
    allow_resubmission BOOLEAN DEFAULT true,
    attachments JSONB DEFAULT '[]'::jsonb,
    subtasks JSONB DEFAULT '[]'::jsonb,
    is_team_task BOOLEAN DEFAULT false
);

-- 3. Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    task_id TEXT NOT NULL,
    task_name TEXT,
    member_id TEXT NOT NULL,
    member_name TEXT,
    member_email TEXT,
    committee TEXT,
    department TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Pending',
    file_url TEXT,
    file_name TEXT,
    file_size TEXT,
    comment TEXT,
    rejection_reason TEXT,
    submission_id_code TEXT,
    grade INT,
    grading_criteria JSONB,
    completed_subtasks TEXT[],
    history JSONB DEFAULT '[]'::jsonb
);

-- 4. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'General',
    committee TEXT DEFAULT 'All',
    department TEXT DEFAULT 'All',
    scheduled_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    expected_attendees_count INT DEFAULT 0,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'Scheduled',
    attendance_code TEXT
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT,
    member_email TEXT,
    committee TEXT,
    department TEXT,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    is_excused BOOLEAN DEFAULT false
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    related_id TEXT
);

-- 7. Work Plans Table (OKR)
CREATE TABLE IF NOT EXISTS public.work_plans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    objective TEXT,
    committee TEXT DEFAULT 'All',
    department TEXT DEFAULT 'All',
    month TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'On Track',
    key_results JSONB DEFAULT '[]'::jsonb
);

-- 8. Volunteer Ideas Table
CREATE TABLE IF NOT EXISTS public.volunteer_ideas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    committee TEXT DEFAULT 'All',
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    upvotes TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Pitching',
    comments JSONB DEFAULT '[]'::jsonb
);

-- 9. Excuses & Freezes Table
CREATE TABLE IF NOT EXISTS public.excuses_freezes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    governorate TEXT,
    committee TEXT,
    request_type TEXT NOT NULL, -- 'Excuse' or 'Freeze'
    reason TEXT NOT NULL,
    target_item_id TEXT, -- Meeting or Task ID if excuse
    target_item_title TEXT,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
);

-- Enable RLS for all tables and allow full access
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public Access %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Public Access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;
