-- Migration to add function for registering and paying for events via balance

BEGIN;

-- Drop function if it exists to ensure clean creation/update
DROP FUNCTION IF EXISTS public.register_and_pay_event(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.register_and_pay_event(p_event_id uuid)
RETURNS public.event_registrations -- Return the created/updated registration record
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Runs with the privileges of the function owner (usually postgres)
SET search_path = public -- Ensure correct schema context
AS $$
DECLARE
  v_student_id uuid := auth.uid(); -- Get the ID of the currently authenticated user
  v_event record;
  v_student_profile record;
  v_existing_registration public.event_registrations;
  v_registration_count integer;
  v_new_registration public.event_registrations;
BEGIN
  -- 1. Input Validation
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: User must be logged in to register.';
  END IF;
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Event ID cannot be null.';
  END IF;

  -- 2. Fetch Event Details (Lock the row for consistency if needed, though less critical here)
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Event % not found.', p_event_id;
  END IF;

  -- 3. Fetch Student Profile and Balance (Lock the row for update)
  SELECT * INTO v_student_profile FROM public.profiles WHERE id = v_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Student profile % not found.', v_student_id;
  END IF;

  -- 4. Check if Event is Paid
  IF NOT v_event.is_paid OR v_event.payment_amount IS NULL OR v_event.payment_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_OPERATION: Event % is not a paid event or amount is invalid.', p_event_id;
  END IF;

  -- 5. Check Student Balance
  IF v_student_profile.balance < v_event.payment_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Insufficient balance. Required: %, Available: %', v_event.payment_amount, v_student_profile.balance;
  END IF;

  -- 6. Check Registration Deadline
  IF v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline < now() THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration deadline has passed.';
  END IF;

  -- 7. Check Existing Registration (Lock the potential row)
  SELECT * INTO v_existing_registration
  FROM public.event_registrations
  WHERE event_id = p_event_id AND student_id = v_student_id
  FOR UPDATE; -- Lock if exists

  IF v_existing_registration IS NOT NULL AND v_existing_registration.status <> 'cancelled' THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED: Already registered for this event with status %.', v_existing_registration.status;
  END IF;

  -- 8. Check Seat Availability (Count active registrations)
  SELECT count(*) INTO v_registration_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status IN ('reserved', 'paid');

  IF v_event.total_seats > 0 AND v_registration_count >= v_event.total_seats THEN
    RAISE EXCEPTION 'SEATS_FULL: No more seats available for this event.';
  END IF;

  -- 9. Deduct Balance
  UPDATE public.profiles
  SET balance = balance - v_event.payment_amount
  WHERE id = v_student_id;

  -- 10. Insert or Update Registration
  IF v_existing_registration IS NOT NULL AND v_existing_registration.status = 'cancelled' THEN
    -- Update the cancelled registration to 'paid'
    UPDATE public.event_registrations
    SET
      status = 'paid',
      paid_at = now(),
      registration_time = now(), -- Reset registration time? Optional.
      expires_at = NULL, -- Clear expiration for paid status
      updated_at = now()
    WHERE id = v_existing_registration.id
    RETURNING * INTO v_new_registration;
  ELSE
    -- Insert new registration
    INSERT INTO public.event_registrations (event_id, student_id, status, paid_at, payment_intent_id)
    VALUES (p_event_id, v_student_id, 'paid', now(), NULL) -- Set status directly to 'paid'
    RETURNING * INTO v_new_registration;
  END IF;

  -- 11. TODO: Optionally, credit the club's balance (requires club balance logic)
  -- UPDATE public.profiles SET balance = balance + v_event.payment_amount WHERE id = v_event.club_id;

  -- 12. Return the new/updated registration record
  RETURN v_new_registration;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in register_and_pay_event for event %, student %: %', p_event_id, v_student_id, SQLERRM;
    -- Re-raise the original exception to ensure transaction rollback and inform the client
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.register_and_pay_event(uuid) IS 'Registers the calling user for a paid event, deducts the fee from their balance, and returns the registration record. Performs checks for funds, deadlines, seats, and existing registration.';

COMMIT;
