-- StrideTrack 2.6.0: robust cloud sync
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It is safe to run more than once.

-- Walks: track when a walk was last changed and when it was deleted.
-- Deleted walks stay in the table with deleted_at set ("soft delete"), so other
-- devices learn about the deletion instead of re-uploading the walk.
alter table public.walks
  add column if not exists updated_at timestamptz not null default now();

alter table public.walks
  add column if not exists deleted_at timestamptz;

-- Profiles: track when the goals themselves were last changed, separate from
-- updated_at (which is bumped on every sync and preference change).
alter table public.profiles
  add column if not exists goals_updated_at timestamptz;
