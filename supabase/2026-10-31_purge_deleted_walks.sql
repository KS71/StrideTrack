-- StrideTrack 2.6.0: permanently remove soft-deleted walks after 30 days.
-- Run once in the Supabase SQL editor. Requires the pg_cron extension
-- (Dashboard -> Database -> Extensions -> enable "pg_cron" first).
-- Safe to run more than once: the job is replaced if it already exists.

create extension if not exists pg_cron;

select cron.unschedule('purge_deleted_walks')
where exists (select 1 from cron.job where jobname = 'purge_deleted_walks');

select cron.schedule(
  'purge_deleted_walks',
  '0 3 * * *', -- every night at 03:00 UTC
  $$ delete from public.walks where deleted_at is not null and deleted_at < now() - interval '30 days' $$
);
