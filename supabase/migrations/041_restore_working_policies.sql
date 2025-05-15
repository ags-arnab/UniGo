-- Drop all existing RLS policies for profiles
DROP POLICY IF EXISTS "Allow public access for authentication" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin self access on profiles" ON public.profiles;

-- Create a simple policy that allows all authenticated users to access profiles
CREATE POLICY "Enable all access for authenticated users" 
ON public.profiles
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create a policy for public read access during authentication
CREATE POLICY "Allow public read access" 
ON public.profiles
FOR SELECT
USING (true);
