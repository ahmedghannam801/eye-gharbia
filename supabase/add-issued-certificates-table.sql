-- ============================================================
-- EYE Workflow Hub — Add issued_certificates table
-- Safe migration for existing Supabase instances.
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists public.issued_certificates (
  id text primary key,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_role text,
  cert_type text not null,
  title text not null,
  body text,
  committee text,
  issued_by uuid references public.profiles(id),
  issued_by_name text not null,
  issued_by_title text,
  issued_at timestamptz default now(),
  grade integer
);

create index if not exists idx_issued_certificates_recipient
  on public.issued_certificates(recipient_id, issued_at desc);

alter table public.issued_certificates enable row level security;

drop policy if exists "authenticated full access" on public.issued_certificates;
create policy "authenticated full access"
  on public.issued_certificates
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Add to realtime publication (so live updates work for certs)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'issued_certificates'
  ) then
    alter publication supabase_realtime add table public.issued_certificates;
  end if;
end $$;

-- Done. The Certificate Generator will now persist issued certs
-- to Supabase, send an email, and show them on the recipient's profile.
