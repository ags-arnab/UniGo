-- Migration to add a student registration ID column to the profiles table

-- Add the new column, make it potentially unique if needed
ALTER TABLE public.profiles
ADD COLUMN student_reg_id TEXT UNIQUE;

-- Add a comment to the new column
COMMENT ON COLUMN public.profiles.student_reg_id IS 'Stores the unique student registration/roll ID.';

-- Optional: Create an index for faster lookups if you query by this often
CREATE INDEX IF NOT EXISTS idx_profiles_student_reg_id ON public.profiles(student_reg_id);

-- Note: You will need to update your registration process or have an admin process
-- to populate this new student_reg_id field for existing and new student users.
-- The handle_new_user trigger might need adjustment if student_reg_id is available at signup.
