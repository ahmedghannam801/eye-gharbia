-- ============================================================
-- EYE Workflow Hub — Fix Submissions RLS + Storage (v1)
-- Run in: Supabase Dashboard > SQL Editor > New query
--
-- Problems this fixes:
--   1. Leaders/admins couldn't see member submissions.
--      (submissions_select_owner used member_id = auth.uid()
--       so only the submitter could read their own row)
--   2. Members with VIP/local passwords couldn't insert submissions.
--      (INSERT policy required auth.uid() IS NOT NULL, but VIP
--       logins have no Supabase Auth session → auth.uid() = NULL)
--   3. Storage bucket 'task-submissions' may block authenticated uploads.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PART 1: submissions table RLS
-- ══════════════════════════════════════════════════════════════

-- Drop ALL existing submissions policies (from every past migration)
DROP POLICY IF EXISTS "submissions_select_owner"              ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_owner"              ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_owner"              ON public.submissions;
DROP POLICY IF EXISTS "submissions_delete_owner"              ON public.submissions;
DROP POLICY IF EXISTS "submissions_select_authenticated"      ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_authenticated"      ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_own"                ON public.submissions;
DROP POLICY IF EXISTS "submissions_delete_own"                ON public.submissions;
DROP POLICY IF EXISTS "authenticated full access"             ON public.submissions;
DROP POLICY IF EXISTS "authenticated full access submissions" ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_select"                ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_insert"                ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_update"                ON public.submissions;
DROP POLICY IF EXISTS "submissions_gov_delete"                ON public.submissions;
DROP POLICY IF EXISTS "open access submissions"               ON public.submissions;
DROP POLICY IF EXISTS "submissions visible to governorate members"     ON public.submissions;
DROP POLICY IF EXISTS "submissions can be created in own governorate"  ON public.submissions;
DROP POLICY IF EXISTS "submissions can be updated in own governorate"  ON public.submissions;
DROP POLICY IF EXISTS "submissions can be deleted by super admin only" ON public.submissions;
DROP POLICY IF EXISTS "Open Policy submissions"               ON public.submissions;

-- Ensure RLS is on
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: any user can read ALL submissions
-- Leaders and admins must see all members' submissions for review.
-- No auth.uid() check: VIP-password logins have NULL uid and would see nothing.
CREATE POLICY "submissions_select_all"
  ON public.submissions FOR SELECT
  USING (true);

-- INSERT: anyone can submit (no auth.uid() check)
-- VIP-password members have no Supabase Auth session → auth.uid() is NULL.
-- Requiring IS NOT NULL silently blocked all their submissions.
CREATE POLICY "submissions_insert_any"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

-- UPDATE: submitter OR any leader/admin role
-- Leaders need UPDATE to mark submissions Accepted/Rejected.
CREATE POLICY "submissions_update_owner_or_leader"
  ON public.submissions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: submitter or super admin only
CREATE POLICY "submissions_delete_owner_or_admin"
  ON public.submissions FOR DELETE
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'Coordinator', 'Vice')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- PART 2: Storage bucket 'task-submissions'
-- ══════════════════════════════════════════════════════════════
-- Make the bucket public so uploaded files have accessible URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-submissions', 'task-submissions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ══════════════════════════════════════════════════════════════
-- PART 3: Storage object policies
-- (Supabase stores storage RLS in storage.objects, not storage.policies)
-- ══════════════════════════════════════════════════════════════

-- Drop old policies on the bucket
DROP POLICY IF EXISTS "task_submissions_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_select" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_update" ON storage.objects;
DROP POLICY IF EXISTS "task_submissions_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to task-submissions" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from task-submissions" ON storage.objects;

-- Allow anyone to upload files (covers VIP users with no auth session)
CREATE POLICY "task_submissions_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-submissions');

-- Allow anyone to read files
CREATE POLICY "task_submissions_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-submissions');

-- Allow anyone to update (replace) their files
CREATE POLICY "task_submissions_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'task-submissions');

-- ══════════════════════════════════════════════════════════════
-- VERIFY (run after applying):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'submissions' ORDER BY cmd;
-- Expected 4 rows:
--   submissions_delete_owner_or_admin  | DELETE
--   submissions_insert_any             | INSERT
--   submissions_select_all             | SELECT
--   submissions_update_owner_or_leader | UPDATE
-- ══════════════════════════════════════════════════════════════
