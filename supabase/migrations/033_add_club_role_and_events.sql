-- Migration Step 1: Add 'club' to user_role ENUM
-- Check if the type exists and the value doesn't, then add it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'club';
    END IF;
END $$;

-- Migration Step 2: Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    location text,
    image_path text, -- For event banner/image
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_club_profile
        FOREIGN KEY(club_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE -- If the club profile is deleted, remove their events
);

-- Migration Step 3: Add updated_at trigger to events table
-- Ensure the trigger function exists before creating the trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
        CREATE TRIGGER set_events_timestamp
        BEFORE UPDATE ON public.events
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();
    ELSE
        RAISE WARNING 'Function trigger_set_timestamp() not found. Skipping trigger creation for events table.';
    END IF;
END $$;

-- Migration Step 4: Create is_club() helper function
CREATE OR REPLACE FUNCTION public.is_club()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Important for use in RLS policies
SET search_path = public -- Ensure it uses the public schema
AS $$
BEGIN
  -- Check if the user exists in profiles and has the 'club' role
  RETURN EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'club'::public.user_role
  );
END;
$$;

-- Migration Step 5: Enable RLS and add policies for events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access
DROP POLICY IF EXISTS "Allow admin full access on events" ON public.events;
CREATE POLICY "Allow admin full access on events"
ON public.events FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 2: Clubs can manage (CRUD) their own events
DROP POLICY IF EXISTS "Allow clubs to manage their own events" ON public.events;
CREATE POLICY "Allow clubs to manage their own events"
ON public.events FOR ALL
USING (is_club() AND club_id = auth.uid())
WITH CHECK (is_club() AND club_id = auth.uid());

-- Policy 3: Authenticated users can view events
DROP POLICY IF EXISTS "Allow authenticated users to view events" ON public.events;
CREATE POLICY "Allow authenticated users to view events"
ON public.events FOR SELECT
USING (auth.role() = 'authenticated');

-- Migration Step 6: Modify approve_vendor_application function
CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER -- Keep as DEFINER if it needs elevated privileges
 SET search_path = public
AS $function$
DECLARE
  is_caller_admin boolean;
  v_business_type text;
  v_target_role public.user_role; -- Variable for the role to assign
BEGIN
  -- 1. Verify the caller is an admin
  SELECT public.is_admin() INTO is_caller_admin;
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an admin.';
  END IF;

  -- Get the business type from the application
  SELECT business_type INTO v_business_type
  FROM public.vendor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Vendor application with ID % not found.', p_application_id;
      RETURN; -- Exit if application not found
  END IF;

  -- Determine the target role based on business type
  -- Ensure 'club' value exists before assigning it
  IF v_business_type = 'Student Club' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
      v_target_role := 'club'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor if not 'Student Club' or if 'club' enum doesn't exist yet
  END IF;

  -- 2. Update vendor_applications table
  UPDATE public.vendor_applications
  SET
    status = 'approved',
    reviewer_notes = p_reviewer_notes,
    reviewed_at = now()
  WHERE id = p_application_id;

  -- 3. Update profiles table with the determined role
  UPDATE public.profiles
  SET
    role = v_target_role, -- Use the determined role
    status = 'active'
  WHERE id = p_user_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Profile with user ID % not found during approval.', p_user_id;
  END IF;

END;
$function$;

-- Migration Step 7: Modify handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER -- Keep as DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status
  is_applying_for_vendor boolean := false;
  is_applying_for_club boolean := false;
BEGIN
  -- Check metadata for application type safely
  is_applying_for_vendor := (NEW.raw_user_meta_data ->> 'is_vendor_application')::boolean;
  is_applying_for_club := (NEW.raw_user_meta_data ->> 'is_club_application')::boolean;

  -- Determine role and status based on application flags
  -- Ensure 'club' value exists before assigning it
  IF is_applying_for_club AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
    user_role := 'club';
    profile_stat := 'pending_approval';
  ELSIF is_applying_for_vendor THEN -- Check vendor *after* club
    user_role := 'vendor';
    profile_stat := 'pending_approval';
  END IF;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, student_id, phone_number, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'phone',
    user_role,
    profile_stat
  );
  RETURN NEW;
END;
$function$;
