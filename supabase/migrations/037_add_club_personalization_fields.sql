-- Add banner_url and description columns to profiles table for club personalization

ALTER TABLE public.profiles
ADD COLUMN banner_url TEXT NULL,
ADD COLUMN description TEXT NULL;

-- Optional: Add comments to the new columns for clarity
COMMENT ON COLUMN public.profiles.banner_url IS 'URL for the club''s banner image.';
COMMENT ON COLUMN public.profiles.description IS 'Description of the club.';

-- Note: RLS policies might need adjustment separately if needed
-- to explicitly allow viewing/updating these columns based on roles.
-- The existing "Users can update own profile" policy might cover updates,
-- but SELECT policies might need review for public visibility if required.
