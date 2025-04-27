-- Migration to add Storage RLS Policies for the 'club-banners' bucket

-- Assumes a bucket named 'club-banners' has been created.
-- These policies allow users with the 'club' role to manage banners
-- within a folder structure like: club_id/banner_name.ext,
-- relying on the object owner matching the authenticated user.

-- Policy: Allow clubs to view their own banner images
DROP POLICY IF EXISTS "Allow clubs to view own banner images" ON storage.objects;
CREATE POLICY "Allow clubs to view own banner images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'club-banners' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Policy: Allow clubs to insert their own banner images
DROP POLICY IF EXISTS "Allow clubs to insert own banner images" ON storage.objects;
CREATE POLICY "Allow clubs to insert own banner images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'club-banners' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Ensure they are the owner upon insert
  );

-- Policy: Allow clubs to update their own banner images
DROP POLICY IF EXISTS "Allow clubs to update own banner images" ON storage.objects;
CREATE POLICY "Allow clubs to update own banner images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'club-banners' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Policy: Allow clubs to delete their own banner images
DROP POLICY IF EXISTS "Allow clubs to delete own banner images" ON storage.objects;
CREATE POLICY "Allow clubs to delete own banner images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'club-banners' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Optional: Policy to allow public read access to club banners if needed
-- DROP POLICY IF EXISTS "Allow public read access to club banners" ON storage.objects;
-- CREATE POLICY "Allow public read access to club banners" ON storage.objects
--   FOR SELECT USING (bucket_id = 'club-banners');


-- Migration to add Storage RLS Policies for the 'club-logos' bucket

-- Assumes a bucket named 'club-logos' has been created.
-- These policies allow users with the 'club' role to manage logos
-- within a folder structure like: club_id/logo_name.ext,
-- relying on the object owner matching the authenticated user.

-- Policy: Allow clubs to view their own logo images
DROP POLICY IF EXISTS "Allow clubs to view own logo images" ON storage.objects;
CREATE POLICY "Allow clubs to view own logo images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'club-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Policy: Allow clubs to insert their own logo images
DROP POLICY IF EXISTS "Allow clubs to insert own logo images" ON storage.objects;
CREATE POLICY "Allow clubs to insert own logo images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'club-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Ensure they are the owner upon insert
  );

-- Policy: Allow clubs to update their own logo images
DROP POLICY IF EXISTS "Allow clubs to update own logo images" ON storage.objects;
CREATE POLICY "Allow clubs to update own logo images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'club-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Policy: Allow clubs to delete their own logo images
DROP POLICY IF EXISTS "Allow clubs to delete own logo images" ON storage.objects;
CREATE POLICY "Allow clubs to delete own logo images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'club-logos' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'club'::public.user_role AND -- Check user is a club
    owner = auth.uid() -- Check ownership
  );

-- Optional: Policy to allow public read access to club logos if needed
-- DROP POLICY IF EXISTS "Allow public read access to club logos" ON storage.objects;
-- CREATE POLICY "Allow public read access to club logos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'club-logos');
