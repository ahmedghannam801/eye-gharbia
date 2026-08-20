-- ============================================================
-- EYE Platform - Schema Enhancement for Disciplinary Records
-- Adds explicit columns for Notice Number, Meeting info, and Coordinator
-- ============================================================

ALTER TABLE public.disciplinary_records
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'lft_nazar',
  ADD COLUMN IF NOT EXISTS notice_number text,
  ADD COLUMN IF NOT EXISTS meeting_day text,
  ADD COLUMN IF NOT EXISTS meeting_date text,
  ADD COLUMN IF NOT EXISTS coordinator text,
  ADD COLUMN IF NOT EXISTS member_role text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS action_taken text,
  ADD COLUMN IF NOT EXISTS governorate text DEFAULT 'الغربية';

-- Ensure RLS is enabled and allows authenticated / service operations
ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to disciplinary records" ON public.disciplinary_records;
CREATE POLICY "Public access to disciplinary records"
  ON public.disciplinary_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
