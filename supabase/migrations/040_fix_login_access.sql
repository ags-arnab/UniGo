-- Drop the overly restrictive policy first
DROP POLICY IF EXISTS "Allow admin self access on profiles" ON public.profiles;

-- Create a more permissive policy for profile access
CREATE POLICY "Enable read access for all authenticated users"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Enable update for users based on id"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read any profile
CREATE POLICY "Enable all authenticated users to view profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');
