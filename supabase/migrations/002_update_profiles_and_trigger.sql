-- Add phone_number and student_id columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN phone_number text,
ADD COLUMN student_id text UNIQUE; -- Added UNIQUE constraint, remove if student IDs might not be unique across all users

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.phone_number IS 'User''s phone number, potentially synced from auth or profile data.';
COMMENT ON COLUMN public.profiles.student_id IS 'University-specific student ID, provided during registration.';

-- Update the handle_new_user function to populate the new fields from metadata and handle different roles
-- This replaces the existing function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status for non-vendors
  signup_role text := NEW.raw_user_meta_data ->> 'role'; -- Get the role passed during signup
  signup_business_type text := NEW.raw_user_meta_data ->> 'business_type'; -- Get the business type

BEGIN
  -- Determine the role based on signup data
  IF signup_role = 'vendor' THEN
    user_role := 'vendor';
    profile_stat := 'pending_approval'; -- Vendors need approval
  ELSIF signup_role = 'campus_store' THEN
    user_role := 'marketplace_operator'; -- Assign marketplace_operator role for campus stores
    profile_stat := 'active'; -- Campus stores are active immediately (adjust if needed)

    -- Create a default storefront for the new marketplace operator
    INSERT INTO public.storefronts (operator_id, name, description, is_active)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name' || ' Store', -- Use full name for default storefront name
        'Welcome to ' || NEW.raw_user_meta_data ->> 'full_name' || '''s new campus store!', -- Default description
        true
    )
    ON CONFLICT ON CONSTRAINT uq_storefronts_operator_id DO NOTHING; -- Avoid error if a storefront already exists for this operator
    RAISE NOTICE 'Created default storefront for new campus store user %', NEW.id;

  END IF;

  INSERT INTO public.profiles (id, email, full_name, student_id, phone_number, role, status, business_type)
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract metadata passed in options.data during signup
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'phone', -- Assumes 'phone' is passed in options.data
    user_role,  -- Use the determined role
    profile_stat, -- Use the determined status
    signup_business_type -- Insert the business type
  );
  RETURN NEW;
END;
$$;

-- Note: The trigger 'on_auth_user_created' should still be associated with this updated function.
-- If you dropped the trigger before running CREATE OR REPLACE FUNCTION, recreate it:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
