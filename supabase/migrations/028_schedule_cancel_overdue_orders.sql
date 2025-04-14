-- supabase/migrations/028_schedule_cancel_overdue_orders.sql

-- This migration schedules the cancel_overdue_pickup_orders function to run periodically.
-- Assumes the pg_cron extension is enabled in the Supabase project.
-- If not enabled, it needs to be enabled via the Supabase Dashboard (Database -> Extensions).

-- Schedule the job to run every 5 minutes
-- The job name 'cancel-overdue-orders' should be unique.
-- The cron syntax '*/5 * * * *' means "at every 5th minute".
SELECT cron.schedule(
    'cancel-overdue-orders', -- Unique name for the cron job
    '*/5 * * * *',           -- Cron schedule: run every 5 minutes
    $$ SELECT public.cancel_overdue_pickup_orders(); $$ -- The command to execute
);

-- Optional: To view scheduled jobs, you can run: SELECT * FROM cron.job;
-- Optional: To unschedule this job if needed later, run: SELECT cron.unschedule('cancel-overdue-orders');
