-- Enable Row Level Security if not already enabled (best practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to ensure idempotency
DROP POLICY IF EXISTS "Allow authenticated users to view club profiles" ON public.profiles;

-- Create the policy allowing any authenticated user to view profiles where role is 'club'
CREATE POLICY "Allow authenticated users to view club profiles"
ON public.profiles
FOR SELECT
TO authenticated -- Grant permission to any logged-in user
USING (role = 'club'::public.user_role);

-- Add a comment to the policy for clarity
COMMENT ON POLICY "Allow authenticated users to view club profiles" ON public.profiles IS 'Allows any authenticated user to select profiles that have the role set to club.';

-- Drop policy if it exists to ensure idempotency
DROP POLICY IF EXISTS "Allow admin users to view all profiles" ON public.profiles;

-- Create the policy allowing admin users to view all profiles
CREATE POLICY "Allow admin users to view all profiles"
ON public.profiles
FOR SELECT
TO authenticated -- Grant permission to any logged-in user
USING (role = 'admin'::public.user_role);

-- Add a comment to the policy for clarity
COMMENT ON POLICY "Allow admin users to view all profiles" ON public.profiles IS 'Allows admin users to select all profiles.';
