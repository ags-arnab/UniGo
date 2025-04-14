-- Migration to modify menu_items for Supabase Storage and add Storage RLS

-- 1. Modify menu_items table
-- Drop the old images column
ALTER TABLE public.menu_items
DROP COLUMN IF EXISTS images;

-- Add the new image_path column
ALTER TABLE public.menu_items
ADD COLUMN image_path text;

COMMENT ON COLUMN public.menu_items.image_path IS 'Path/key to the primary image in Supabase Storage bucket.';

-- 2. Storage RLS Policies for 'menu-item-images' bucket
--    Assumes a bucket named 'menu-item-images' has been created.
--    These policies allow vendors to manage images within a folder structure like: vendor_id/image_name.png

-- Policy: Allow vendors to view images within their own folder
DROP POLICY IF EXISTS "Allow vendors to view own images" ON storage.objects;
CREATE POLICY "Allow vendors to view own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'menu-item-images' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role AND -- Check user is a vendor
    owner = auth.uid() -- Check ownership (Supabase sets owner on upload)
    -- OR check based on path prefix: storage.foldername(name)[1] = auth.uid()::text -- Alternative if owner isn't reliable/set
  );

-- Policy: Allow vendors to insert images into their own folder
DROP POLICY IF EXISTS "Allow vendors to insert own images" ON storage.objects;
CREATE POLICY "Allow vendors to insert own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-item-images' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role AND
    owner = auth.uid() -- Ensure they are the owner upon insert
    -- AND storage.foldername(name)[1] = auth.uid()::text -- Enforce folder structure on insert
  );

-- Policy: Allow vendors to update their own images
DROP POLICY IF EXISTS "Allow vendors to update own images" ON storage.objects;
CREATE POLICY "Allow vendors to update own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'menu-item-images' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role AND
    owner = auth.uid()
    -- AND storage.foldername(name)[1] = auth.uid()::text -- Check path on update too
  );

-- Policy: Allow vendors to delete their own images
DROP POLICY IF EXISTS "Allow vendors to delete own images" ON storage.objects;
CREATE POLICY "Allow vendors to delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'menu-item-images' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role AND
    owner = auth.uid()
    -- AND storage.foldername(name)[1] = auth.uid()::text -- Check path on delete
  );

-- Note: You might want a separate policy to allow public read access if images should be viewable without login,
-- potentially restricted to specific paths or based on menu item availability.
-- Example Public Read (Apply cautiously):
-- DROP POLICY IF EXISTS "Allow public read access to menu images" ON storage.objects;
-- CREATE POLICY "Allow public read access to menu images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'menu-item-images');
