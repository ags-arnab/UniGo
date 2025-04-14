-- Add phone_number and student_id columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN phone_number text,
ADD COLUMN student_id text UNIQUE; -- Added UNIQUE constraint, remove if student IDs might not be unique across all users

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.phone_number IS 'User''s phone number, potentially synced from auth or profile data.';
COMMENT ON COLUMN public.profiles.student_id IS 'University-specific student ID, provided during registration.';

-- Update the handle_new_user function to populate the new fields from metadata AND handle vendor signup
-- This replaces the existing function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status for non-vendors
BEGIN
  -- Check if metadata indicates a vendor application signup
  IF NEW.raw_user_meta_data ->> 'is_vendor_application' = 'true' THEN -- Corrected metadata field
    user_role := 'vendor';
    profile_stat := 'pending_approval'; -- Set status for vendors needing approval
  END IF;

  INSERT INTO public.profiles (id, email, full_name, student_id, phone_number, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract metadata passed in options.data during signup
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'phone', -- Assumes 'phone' is passed in options.data
    user_role,  -- Use the determined role
    profile_stat -- Use the determined status
  );
  RETURN NEW;
END;
$$;

-- Note: The trigger 'on_auth_user_created' should still be associated with this updated function.
-- If you dropped the trigger before running CREATE OR REPLACE FUNCTION, recreate it:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
