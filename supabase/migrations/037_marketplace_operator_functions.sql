-- Migration: Add marketplace operator functions and update approval logic

BEGIN;

-- 1. Create is_marketplace_operator() helper function
CREATE OR REPLACE FUNCTION public.is_marketplace_operator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'marketplace_operator'::public.user_role
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_marketplace_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_operator() TO service_role; -- Or anon if needed for RLS on public views

-- 2. Modify approve_vendor_application function to handle 'Campus Store'
--    and assign 'marketplace_operator' role.
--    It also creates a storefront record for the new marketplace operator.
CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_caller_admin boolean;
  v_application record;
  v_target_role public.user_role;
BEGIN
  -- 1. Verify the caller is an admin
  SELECT public.is_admin() INTO is_caller_admin;
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an admin.';
  END IF;

  -- Get the application details
  SELECT * INTO v_application
  FROM public.vendor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Vendor application with ID % not found.', p_application_id;
      RETURN; -- Exit if application not found
  END IF;

  -- Determine the target role based on business type
  IF lower(trim(v_application.business_type)) = 'club' THEN
      v_target_role := 'club'::public.user_role;
  ELSIF lower(trim(v_application.business_type)) = 'campus_store' THEN -- MODIFIED HERE to check for 'campus_store'
      v_target_role := 'marketplace_operator'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor for other types
  END IF;

  -- 2. Update vendor_applications table
  UPDATE public.vendor_applications
  SET
    status = 'approved',
    reviewer_notes = p_reviewer_notes,
    reviewed_at = now()
  WHERE id = p_application_id;

  -- 3. Update profiles table with the determined role and active status
  UPDATE public.profiles
  SET
    role = v_target_role,
    status = 'active'::public.profile_status
  WHERE id = p_user_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Profile with user ID % not found during approval.', p_user_id;
      -- Potentially rollback or handle error more gracefully
      RETURN;
  END IF;

  -- 4. If approved as a marketplace_operator, create a default storefront for them
  IF v_target_role = 'marketplace_operator'::public.user_role THEN
    INSERT INTO public.storefronts (operator_id, name, description, is_active)
    VALUES (
        p_user_id, 
        v_application.business_name || ' Store', -- Default name
        'Welcome to ' || v_application.business_name || '''s new campus store!', -- MODIFIED HERE: Escaped single quote
        true
    )
    ON CONFLICT ON CONSTRAINT uq_storefronts_operator_id DO NOTHING; -- Avoid error if a storefront already exists for this operator
    RAISE NOTICE 'Created default storefront for marketplace operator %', p_user_id;
  END IF;

END;
$function$;

-- Ensure the function owner is appropriate, typically postgres or the admin role.
-- The SECURITY DEFINER clause means it runs with the permissions of the user who defined it.

COMMIT; 