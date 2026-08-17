-- ============================================================
-- EYE Workflow Hub — Fix Task Visibility (v1)
-- Run in: Supabase Dashboard > SQL Editor > New query
--
-- What this does:
--   1. Drops ALL conflicting task RLS policies from every previous
--      migration (schema.sql, fix-all-delete-and-rls-policies.sql,
--      security_fix_final.sql, security_fix_v4.sql,
--      security_fix_comprehensive.sql)
--   2. Creates a single clean, correct set of policies:
--      - SELECT: any authenticated user (full cross-user visibility)
--      - INSERT: any authenticated user (no created_by match required)
--      - UPDATE: task creator OR any admin / leader role
--      - DELETE: task creator OR super admin / coordinator
-- ============================================================

-- STEP 1: Drop every task policy from all past migrations

DROP POLICY IF EXISTS "authenticated full access"                ON public.tasks;
DROP POLICY IF EXISTS "authenticated full access tasks"          ON public.tasks;
DROP POLICY IF EXISTS "open access tasks"                        ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_select"                         ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_insert"                         ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_update"                         ON public.tasks;
DROP POLICY IF EXISTS "tasks_gov_delete"                         ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_authenticated"               ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_auth"                        ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_owner"                       ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_owner"                       ON public.tasks;
DROP POLICY IF EXISTS "tasks visible to governorate members"     ON public.tasks;
DROP POLICY IF EXISTS "tasks can be created in own governorate"  ON public.tasks;
DROP POLICY IF EXISTS "tasks can be updated in own governorate"  ON public.tasks;
DROP POLICY IF EXISTS "tasks can be deleted by super admin only" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_all_auth"                    ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_any_auth"                    ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_creator_or_admin"            ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_creator_or_super_admin"      ON public.tasks;
DROP POLICY IF EXISTS "Open Policy tasks"                        ON public.tasks;

-- STEP 2: Ensure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create clean, correct policies

-- SELECT: ALL users can read ALL tasks (no auth.uid() check).
-- Reason: some users log in via local/VIP passwords without a Supabase
-- Auth session, so auth.uid() is NULL for them and the IS NOT NULL check
-- would block all task rows from being returned.
CREATE POLICY "tasks_select_all_auth"
  ON public.tasks FOR SELECT
  USING (true);

-- INSERT: Anyone can create a task (no auth.uid() check).
-- Same reason as SELECT: local/VIP password logins have no Supabase Auth
-- session, so auth.uid() IS NULL and the insert would be silently blocked.
CREATE POLICY "tasks_insert_any_auth"
  ON public.tasks FOR INSERT
  WITH CHECK (true);

-- UPDATE: Task creator OR any leadership / admin role.
CREATE POLICY "tasks_update_creator_or_admin"
  ON public.tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN (
          'Super Admin', 'Leader', 'Vice', 'Coordinator',
          'Deputy Coordinator', 'Head', 'HRM', 'Central'
        )
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN (
          'Super Admin', 'Leader', 'Vice', 'Coordinator',
          'Deputy Coordinator', 'Head', 'HRM', 'Central'
        )
    )
  );

-- DELETE: Task creator OR super admin / coordinator.
CREATE POLICY "tasks_delete_creator_or_super_admin"
  ON public.tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super Admin', 'Vice', 'Coordinator')
    )
  );

-- STEP 4: Verify (run this SELECT after applying)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks' ORDER BY cmd;
-- Expected 4 rows:
--   tasks_delete_creator_or_super_admin | DELETE
--   tasks_insert_any_auth               | INSERT
--   tasks_select_all_auth               | SELECT
--   tasks_update_creator_or_admin       | UPDATE
