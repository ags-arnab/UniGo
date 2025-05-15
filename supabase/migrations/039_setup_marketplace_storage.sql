-- Migration: Setup Supabase Storage for Marketplace Storefronts

BEGIN;

-- Note: Bucket creation is typically done via Supabase Studio UI or Management API.
-- If using CLI or script, the commands would be similar to:
-- supabase storage buckets create storefront-logos --public true --file-size-limit 1MB --allowed-mime-types image/jpeg,image/png,image/gif,image/webp
-- supabase storage buckets create storefront-banners --public true --file-size-limit 5MB --allowed-mime-types image/jpeg,image/png,image/gif,image/webp

-- RLS Policies for storage.objects (Storefront Logos)

-- 1. Public read access for logos
DROP POLICY IF EXISTS "Public read access for logos" ON storage.objects;
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'storefront-logos' );

-- 2. Marketplace operators can insert their own logos
-- Assumes path like: {operator_id}/logo.{file_extension}
DROP POLICY IF EXISTS "Marketplace operators can insert logos" ON storage.objects;
CREATE POLICY "Marketplace operators can insert logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'storefront-logos'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- 3. Marketplace operators can update their own logos
DROP POLICY IF EXISTS "Marketplace operators can update logos" ON storage.objects;
CREATE POLICY "Marketplace operators can update logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'storefront-logos'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- 4. Marketplace operators can delete their own logos
DROP POLICY IF EXISTS "Marketplace operators can delete logos" ON storage.objects;
CREATE POLICY "Marketplace operators can delete logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'storefront-logos'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- RLS Policies for storage.objects (Storefront Banners)

-- 1. Public read access for banners
DROP POLICY IF EXISTS "Public read access for banners" ON storage.objects;
CREATE POLICY "Public read access for banners"
ON storage.objects FOR SELECT
USING ( bucket_id = 'storefront-banners' );

-- 2. Marketplace operators can insert their own banners
-- Assumes path like: {operator_id}/banner.{file_extension}
DROP POLICY IF EXISTS "Marketplace operators can insert banners" ON storage.objects;
CREATE POLICY "Marketplace operators can insert banners"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'storefront-banners'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- 3. Marketplace operators can update their own banners
DROP POLICY IF EXISTS "Marketplace operators can update banners" ON storage.objects;
CREATE POLICY "Marketplace operators can update banners"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'storefront-banners'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- 4. Marketplace operators can delete their own banners
DROP POLICY IF EXISTS "Marketplace operators can delete banners" ON storage.objects;
CREATE POLICY "Marketplace operators can delete banners"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'storefront-banners'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/%'
);

-- RLS Policies for storage.objects (Product Images)

-- 1. Public read access for product images
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 2. Marketplace operators can insert their product images
-- Assumes path like: {operator_id}/products/{timestamped_filename.ext}
DROP POLICY IF EXISTS "Marketplace operators can insert product images" ON storage.objects;
CREATE POLICY "Marketplace operators can insert product images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/products/%'
);

-- 3. Marketplace operators can update their product images
DROP POLICY IF EXISTS "Marketplace operators can update product images" ON storage.objects;
CREATE POLICY "Marketplace operators can update product images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/products/%'
);

-- 4. Marketplace operators can delete their product images
DROP POLICY IF EXISTS "Marketplace operators can delete product images" ON storage.objects;
CREATE POLICY "Marketplace operators can delete product images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND name LIKE auth.uid()::text || '/products/%'
);

COMMIT; 