-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for authentication" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin self access on profiles" ON public.profiles;

-- Recreate policies with proper access controls
-- 1. Basic read access for authentication
CREATE POLICY "Allow public access for authentication"
ON public.profiles FOR SELECT
USING (true);

-- 2. Users can read and update their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Admins can read and manage all profiles
CREATE POLICY "Admins have full access"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'admin'::public.user_role
  )
);
