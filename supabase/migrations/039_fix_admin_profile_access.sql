-- Add proper admin self-access policy
CREATE POLICY "Allow admin self access on profiles"
ON public.profiles
FOR ALL -- Admins need full access to their own profile
USING (
    auth.uid() = id -- Their own profile
    AND role = 'admin'::public.user_role -- They must be an admin
);

-- Add a comment to explain the policy
COMMENT ON POLICY "Allow admin self access on profiles" ON public.profiles
IS 'Allows admin users to access and manage their own profile data.';
