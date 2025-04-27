-- Migration: Enhance Events Table, Add Registrations, and Auto-Cancellation

BEGIN; -- Wrap in transaction

-- Step 1: Modify the existing 'events' table

-- Rename columns first to avoid conflicts if adding columns with old names
ALTER TABLE public.events RENAME COLUMN name TO title;
ALTER TABLE public.events RENAME COLUMN image_path TO banner_image_path;
ALTER TABLE public.events RENAME COLUMN start_time TO event_datetime;
ALTER TABLE public.events RENAME COLUMN location TO venue;

-- Add new columns to the 'events' table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS total_seats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10, 2) NULL DEFAULT 0.00, -- Allow NULL, default 0
  ADD COLUMN IF NOT EXISTS sponsors text[] NULL,
  ADD COLUMN IF NOT EXISTS is_seminar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guests text[] NULL,
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.events.title IS 'The main title of the event.';
COMMENT ON COLUMN public.events.banner_image_path IS 'Path to the event banner image in storage.';
COMMENT ON COLUMN public.events.event_datetime IS 'The starting date and time of the event.';
COMMENT ON COLUMN public.events.end_time IS 'The ending date and time of the event (optional).';
COMMENT ON COLUMN public.events.venue IS 'The location/venue where the event takes place.';
COMMENT ON COLUMN public.events.total_seats IS 'Total number of available seats for the event.';
COMMENT ON COLUMN public.events.is_paid IS 'Flag indicating if the event requires payment for registration.';
COMMENT ON COLUMN public.events.payment_amount IS 'The amount required for paid events (if is_paid is true).';
COMMENT ON COLUMN public.events.sponsors IS 'Array of sponsor names or identifiers.';
COMMENT ON COLUMN public.events.is_seminar IS 'Flag indicating if the event is specifically a seminar.';
COMMENT ON COLUMN public.events.guests IS 'Array of guest speakers or notable attendees.';
COMMENT ON COLUMN public.events.registration_deadline IS 'The date and time after which registration is no longer possible (optional).';


-- Step 2: Create the event_registration_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_registration_status') THEN
        CREATE TYPE public.event_registration_status AS ENUM (
          'reserved',
          'paid',
          'cancelled',
          'attended'
        );
        COMMENT ON TYPE public.event_registration_status IS 'Status of a student registration for an event.';
    END IF;
END $$;


-- Step 3: Create the 'event_registrations' table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_time timestamptz NOT NULL DEFAULT now(),
    status public.event_registration_status NOT NULL DEFAULT 'reserved',
    payment_intent_id text NULL, -- For tracking payment gateway transactions
    paid_at timestamptz NULL,    -- Timestamp when payment was confirmed
    expires_at timestamptz NULL, -- Timestamp when a 'reserved' status expires if unpaid (for paid events)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_student_id ON public.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_expires_at ON public.event_registrations(expires_at);

-- Add comments
COMMENT ON TABLE public.event_registrations IS 'Tracks student registrations for events.';
COMMENT ON COLUMN public.event_registrations.status IS 'The current status of the registration.';
COMMENT ON COLUMN public.event_registrations.payment_intent_id IS 'Identifier from the payment gateway, if applicable.';
COMMENT ON COLUMN public.event_registrations.paid_at IS 'Timestamp when the registration was successfully paid for.';
COMMENT ON COLUMN public.event_registrations.expires_at IS 'Timestamp when a reservation expires if not paid (only for paid events).';

-- Add updated_at trigger to event_registrations
-- Ensure the trigger function exists before creating the trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
        CREATE TRIGGER set_event_registrations_timestamp
        BEFORE UPDATE ON public.event_registrations
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();
    ELSE
        RAISE WARNING 'Function trigger_set_timestamp() not found. Skipping trigger creation for event_registrations table.';
    END IF;
END $$;

-- Step 4: Enable RLS and add policies for event_registrations table
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access
DROP POLICY IF EXISTS "Allow admin full access on event_registrations" ON public.event_registrations;
CREATE POLICY "Allow admin full access on event_registrations"
ON public.event_registrations FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 2: Students can manage (create, view, potentially cancel 'reserved') their own registrations
DROP POLICY IF EXISTS "Allow students to manage own event registrations" ON public.event_registrations;
CREATE POLICY "Allow students to manage own event registrations"
ON public.event_registrations FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
-- Note: More granular checks (e.g., preventing update to 'paid' by student) should happen in application logic or DB functions.

-- Policy 3: Clubs can view registrations for their own events
DROP POLICY IF EXISTS "Allow clubs to view registrations for their events" ON public.event_registrations;
CREATE POLICY "Allow clubs to view registrations for their events"
ON public.event_registrations FOR SELECT
USING (
  is_club() AND
  event_id IN (SELECT id FROM public.events WHERE club_id = auth.uid())
);
-- Note: Clubs might need UPDATE permission later (e.g., to mark 'attended'), requiring a separate policy or function.


-- Step 5: Create the auto-cancellation function
CREATE OR REPLACE FUNCTION public.cancel_expired_event_reservations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cancelled_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.event_registrations
    SET status = 'cancelled'
    WHERE
      status = 'reserved'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING id -- Return IDs of cancelled registrations
  )
  SELECT count(*) INTO cancelled_count FROM expired;

  IF cancelled_count > 0 THEN
    RAISE LOG 'Cancelled % expired event reservations.', cancelled_count;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in cancel_expired_event_reservations: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.cancel_expired_event_reservations() IS 'Sets the status to "cancelled" for event registrations that were "reserved" for paid events and whose expiration timestamp has passed.';


-- Step 6: Schedule the auto-cancellation function using pg_cron
-- Ensure pg_cron is enabled (usually done once per project, see migration 028)
-- Schedule to run every 5 minutes
SELECT cron.schedule(
  'cancel-expired-event-reservations', -- Job name (unique)
  '*/5 * * * *', -- Cron syntax for every 5 minutes
  $$ SELECT public.cancel_expired_event_reservations(); $$
);

-- Optional: Unschedule previous versions if job name changed
-- SELECT cron.unschedule('old-job-name');

COMMIT; -- End transaction
