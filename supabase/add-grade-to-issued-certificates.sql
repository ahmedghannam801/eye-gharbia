-- ============================================================
-- EYE Workflow Hub — Add grade column to issued_certificates table
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) Add the grade column if it does not already exist
alter table public.issued_certificates 
  add column if not exists grade integer;

-- 2) Notify PostgREST to reload the schema cache so the backend application is aware of the new column
notify pgrst, 'reload schema';
