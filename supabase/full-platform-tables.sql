-- ============================================================
-- EYE Workflow Hub — Full Cloud Database Schema (All Features)
-- Safe & Idempotent SQL script. Run in Supabase SQL Editor.
-- ============================================================

-- ---------- 1. MEETINGS & ATTENDANCE ----------
create table if not exists public.meetings (
  id text primary key,
  title text not null,
  description text,
  type text not null default 'General',
  committee text default 'All',
  department text default 'All',
  scheduled_at timestamptz not null,
  location text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  status text not null default 'Scheduled',
  attendance_code text not null
);

create table if not exists public.attendance (
  id text primary key,
  meeting_id text references public.meetings(id) on delete cascade,
  member_id uuid,
  member_name text not null,
  member_email text,
  committee text,
  department text,
  checked_in_at timestamptz default now(),
  is_excused boolean default false,
  excuse_reason text
);

-- ---------- 2. OKR WORK PLANS ----------
create table if not exists public.work_plans (
  id text primary key,
  title text not null,
  objective text,
  committee text default 'All',
  department text default 'All',
  month text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  status text default 'On Track',
  key_results jsonb default '[]'
);

-- ---------- 3. VOLUNTEER IDEAS (IDEA BANK) ----------
create table if not exists public.volunteer_ideas (
  id text primary key,
  title text not null,
  description text,
  committee text default 'All',
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  upvotes jsonb default '[]',
  status text default 'Pitching',
  comments jsonb default '[]'
);

-- ---------- 4. MEMBER EVALUATIONS ----------
create table if not exists public.member_evaluations (
  id text primary key,
  target_user_id uuid,
  target_user_name text,
  target_user_role text default 'Member',
  evaluator_id uuid,
  evaluator_name text,
  evaluator_role text default 'Leader',
  committee text,
  department text,
  overall_rating numeric default 5,
  commitment_rating numeric default 5,
  quality_rating numeric default 5,
  teamwork_rating numeric default 5,
  activity_rating numeric default 5,
  feedback_comment text,
  created_at timestamptz default now()
);

-- ---------- 5. 360 LEADER FEEDBACK ----------
create table if not exists public.leader_feedbacks (
  id text primary key,
  leader_id uuid,
  leader_name text,
  committee text default 'All',
  reviewer_id uuid,
  rating numeric default 5,
  communication numeric default 5,
  support numeric default 5,
  fairness numeric default 5,
  comment text,
  submitted_at timestamptz default now(),
  is_anonymous boolean default false
);

-- ---------- 6. LIVE WORKSHOPS ----------
create table if not exists public.live_workshops (
  id text primary key,
  title text not null,
  description text,
  stream_type text default 'youtube_live',
  stream_url text,
  committee text default 'All',
  department text default 'All',
  status text default 'Scheduled',
  scheduled_at timestamptz,
  points_reward integer default 50,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  attendees_count integer default 0,
  attendee_ids jsonb default '[]'
);

-- ---------- 7. ACADEMY COURSES & REWARDS ----------
create table if not exists public.academy_courses (
  id text primary key,
  title text not null,
  description text,
  category text default 'General',
  committee text default 'All',
  reads_count integer default 0,
  completed_by jsonb default '[]'
);

create table if not exists public.reward_items (
  id text primary key,
  title text not null,
  description text,
  cost_points integer default 100,
  stock integer default 10
);

create table if not exists public.reward_purchases (
  id text primary key,
  reward_id text references public.reward_items(id) on delete cascade,
  reward_title text not null,
  cost_points integer default 100,
  member_id uuid,
  member_name text not null,
  purchased_at timestamptz default now(),
  status text default 'Pending'
);

-- ---------- 8. WEEKLY QUIZZES & CHALLENGES ----------
create table if not exists public.weekly_quizzes (
  id text primary key,
  question text not null,
  options jsonb default '[]',
  correct_answer_index integer default 0,
  points_reward integer default 50,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists public.weekly_challenges (
  id text primary key,
  title text not null,
  description text,
  points integer default 100,
  committee text default 'All',
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now()
);

-- Ensure issued_certificates schema has lang and grade columns
alter table if exists public.issued_certificates add column if not exists lang text default 'ar';
alter table if exists public.issued_certificates add column if not exists grade numeric;

-- Enable RLS for all tables
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;
alter table public.work_plans enable row level security;
alter table public.volunteer_ideas enable row level security;
alter table public.member_evaluations enable row level security;
alter table public.leader_feedbacks enable row level security;
alter table public.live_workshops enable row level security;
alter table public.academy_courses enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_purchases enable row level security;
alter table public.weekly_quizzes enable row level security;
alter table public.weekly_challenges enable row level security;

-- Drop policies if exists
drop policy if exists "open access meetings" on public.meetings;
drop policy if exists "open access attendance" on public.attendance;
drop policy if exists "open access work_plans" on public.work_plans;
drop policy if exists "open access volunteer_ideas" on public.volunteer_ideas;
drop policy if exists "open access member_evaluations" on public.member_evaluations;
drop policy if exists "open access leader_feedbacks" on public.leader_feedbacks;
drop policy if exists "open access live_workshops" on public.live_workshops;
drop policy if exists "open access academy_courses" on public.academy_courses;
drop policy if exists "open access reward_items" on public.reward_items;
drop policy if exists "open access reward_purchases" on public.reward_purchases;
drop policy if exists "open access weekly_quizzes" on public.weekly_quizzes;
drop policy if exists "open access weekly_challenges" on public.weekly_challenges;

-- Open policies
create policy "open access meetings" on public.meetings for all using (true) with check (true);
create policy "open access attendance" on public.attendance for all using (true) with check (true);
create policy "open access work_plans" on public.work_plans for all using (true) with check (true);
create policy "open access volunteer_ideas" on public.volunteer_ideas for all using (true) with check (true);
create policy "open access member_evaluations" on public.member_evaluations for all using (true) with check (true);
create policy "open access leader_feedbacks" on public.leader_feedbacks for all using (true) with check (true);
create policy "open access live_workshops" on public.live_workshops for all using (true) with check (true);
create policy "open access academy_courses" on public.academy_courses for all using (true) with check (true);
create policy "open access reward_items" on public.reward_items for all using (true) with check (true);
create policy "open access reward_purchases" on public.reward_purchases for all using (true) with check (true);
create policy "open access weekly_quizzes" on public.weekly_quizzes for all using (true) with check (true);
create policy "open access weekly_challenges" on public.weekly_challenges for all using (true) with check (true);

-- Enable Realtime for all tables
do $$
begin
  alter publication supabase_realtime add table 
    public.meetings, 
    public.attendance, 
    public.work_plans, 
    public.volunteer_ideas, 
    public.member_evaluations, 
    public.leader_feedbacks, 
    public.live_workshops,
    public.academy_courses,
    public.reward_items,
    public.reward_purchases,
    public.weekly_quizzes,
    public.weekly_challenges;
exception
  when others then null;
end $$;
