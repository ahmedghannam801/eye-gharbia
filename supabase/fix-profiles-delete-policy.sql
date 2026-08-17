-- ============================================================
-- EYE Workflow Hub — Fix: Add DELETE policy on profiles table
-- Run this in: Supabase Dashboard > SQL Editor > New query
--
-- The profiles table is missing a DELETE policy, so client-side
-- bulk deletes silently fail with RLS violation. This adds it.
-- ============================================================

-- Allow any authenticated user to delete profiles
-- (matches the "authenticated full access" pattern used on the
--  other tables like tasks, submissions, notifications, etc.)
create policy "authenticated full access"
on public.profiles
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Done. You can now use the "Delete All Members" button in
-- Settings → Danger Zone, and it will actually delete from Supabase.
