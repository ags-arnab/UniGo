-- Create the user roles enum type
CREATE TYPE public.user_role AS ENUM ('student', 'vendor', 'admin');

-- Create the profile status enum type
CREATE TYPE public.profile_status AS ENUM ('pending_approval', 'active', 'inactive', 'rejected');

-- Create the profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE, -- Store email for potential easier lookup, synced from auth.users
  full_name text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'student'::public.user_role,
  status public.profile_status NOT NULL DEFAULT 'active'::public.profile_status, -- Added status column
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Add comments to the table and columns
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user, linked to auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'References the internal auth.users id.';
COMMENT ON COLUMN public.profiles.role IS 'Specifies the role of the user within the application.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Public policy for authentication
CREATE POLICY "Allow public access for authentication" ON public.profiles
  FOR SELECT
  USING (true);  -- This allows reading profiles during authentication

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Allow admins full access
CREATE POLICY "Admins have full access" ON public.profiles
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role = 'admin'::public.user_role
    )
  );

-- Function to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status
BEGIN
  -- Check if metadata indicates a vendor application signup
  IF NEW.raw_app_meta_data ->> 'is_vendor_application' = 'true' THEN
    user_role := 'vendor';
    profile_stat := 'pending_approval';
  END IF;

  INSERT INTO public.profiles (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    profile_stat
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to keep email in profiles table synced with auth.users
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger to call the function after auth.users email is updated
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- Optional: Function to handle user deletion if needed beyond CASCADE
-- CREATE OR REPLACE FUNCTION public.handle_user_delete()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER SET search_path = public
-- AS $$
-- BEGIN
--   DELETE FROM public.profiles WHERE id = OLD.id;
--   RETURN OLD;
-- END;
-- $$;

-- CREATE TRIGGER on_auth_user_deleted
--   AFTER DELETE ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Set up Storage bucket for avatars (optional)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');

-- CREATE POLICY "Anyone can upload an avatar." ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- CREATE POLICY "Users can update their own avatar." ON storage.objects
--   FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'avatars');

-- CREATE POLICY "Users can delete their own avatar." ON storage.objects
--   FOR DELETE USING (auth.uid() = owner);
