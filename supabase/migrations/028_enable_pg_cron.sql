-- supabase/migrations/028_enable_pg_cron.sql

-- Enable the pg_cron extension if it's not already enabled.
-- This ensures the 'cron' schema exists before scheduling jobs.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage on the schema to the postgres role (or the role running migrations/cron jobs)
-- Supabase typically handles this, but explicitly granting can prevent permission issues.
GRANT USAGE ON SCHEMA cron TO postgres;

-- Grant necessary permissions for the postgres user to manage cron jobs
-- Adjust the role if your Supabase setup uses a different superuser/admin role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cron TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cron TO postgres;
