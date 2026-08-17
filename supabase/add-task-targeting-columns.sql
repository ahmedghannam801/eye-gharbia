-- ============================================================
-- EYE Workflow Hub — إضافة أعمدة التوجيه المخصص للمهام (Targeted Members)
-- يُرجى تشغيل هذا الكود في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_member_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all_committee',
  ADD COLUMN IF NOT EXISTS is_video_task boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text;
