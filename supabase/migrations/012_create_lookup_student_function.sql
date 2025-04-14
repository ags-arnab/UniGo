-- Migration to create/update a function to look up a student's UUID by their registration ID.
-- Removing explicit RLS bypass for simplicity. Relying on SECURITY DEFINER.

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.get_user_id_by_student_id(text);

-- Create or Replace the function
CREATE OR REPLACE FUNCTION public.get_user_id_by_student_id(
    p_student_id TEXT -- Input: The student's registration ID (TEXT)
)
RETURNS uuid -- Output: The student's profile ID (UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Function executes with the permissions of the user who defined it
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- SECURITY DEFINER should allow reading profiles table if owner has permission.
    SELECT id
    INTO v_user_id
    FROM public.profiles
    WHERE student_id = p_student_id -- Query using the TEXT column 'student_id' based on error/tables.json
      AND role = 'student'::public.user_role; -- Ensure the profile is actually a student

    -- Explicitly return NULL if no user was found
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN v_user_id; -- Returns the found UUID
END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_id_by_student_id(text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_user_id_by_student_id(text) TO service_role; -- If needed
