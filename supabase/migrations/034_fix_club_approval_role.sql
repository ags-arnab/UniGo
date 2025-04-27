-- Migration Step: Fix approve_vendor_application to handle business_type comparison robustly

CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

  -- Determine the target role based on business type value (e.g., 'club')
  -- Compare against the actual value saved from the form ('club'), not the label ('Student Club')
  IF lower(trim(v_business_type)) = 'club' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
      v_target_role := 'club'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor if business_type is not 'club'
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

COMMENT ON FUNCTION public.approve_vendor_application(uuid, uuid, text) IS 'Approves a vendor/club application, sets the correct role (vendor or club) based on business_type (case-insensitive), and activates the user profile.';
