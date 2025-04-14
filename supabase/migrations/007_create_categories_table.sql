-- Migration to create categories table and add RLS policies

-- 1. Create Categories Table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Link to vendor profile, cascade delete categories if vendor is deleted
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS 'Stores menu item categories created by vendors.';
COMMENT ON COLUMN public.categories.vendor_id IS 'References the vendor (profile) who owns this category.';
COMMENT ON COLUMN public.categories.name IS 'Name of the category.';
COMMENT ON COLUMN public.categories.description IS 'Optional description for the category.';

-- Enable RLS for categories (Do this before creating policies)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Add unique index for vendor_id and category name (case-insensitive)
-- This replaces the ALTER TABLE ADD CONSTRAINT which doesn't support lower() directly
CREATE UNIQUE INDEX categories_vendor_id_lower_name_idx ON public.categories (vendor_id, lower(name));

-- Apply the updated_at trigger
CREATE TRIGGER set_timestamp_categories
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Add indexes
CREATE INDEX idx_categories_vendor_id ON public.categories(vendor_id);

-- 2. RLS Policies for 'categories' table

-- Allow admins full access (optional, based on requirements)
DROP POLICY IF EXISTS "Allow admin full access on categories" ON public.categories;
CREATE POLICY "Allow admin full access on categories" ON public.categories
  FOR ALL USING (public.is_admin()); -- Assumes is_admin() function exists

-- Allow vendors to view their own categories
DROP POLICY IF EXISTS "Allow vendors to view their own categories" ON public.categories;
CREATE POLICY "Allow vendors to view their own categories" ON public.categories
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role -- Direct role check
    AND vendor_id = auth.uid()
  );

-- Allow vendors to create categories for themselves
DROP POLICY IF EXISTS "Allow vendors to create their own categories" ON public.categories;
CREATE POLICY "Allow vendors to create their own categories" ON public.categories
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role -- Direct role check
    AND vendor_id = auth.uid()
  );

-- Allow vendors to update their own categories
DROP POLICY IF EXISTS "Allow vendors to update their own categories" ON public.categories;
CREATE POLICY "Allow vendors to update their own categories" ON public.categories
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role -- Direct role check
    AND vendor_id = auth.uid()
  )
  WITH CHECK (vendor_id = auth.uid()); -- Ensure they can't change the vendor_id

-- Allow vendors to delete their own categories
DROP POLICY IF EXISTS "Allow vendors to delete their own categories" ON public.categories;
CREATE POLICY "Allow vendors to delete their own categories" ON public.categories
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor'::public.user_role -- Direct role check
    AND vendor_id = auth.uid()
  );

-- Grant necessary permissions on the new table to the 'authenticated' role
GRANT SELECT, INSERT (vendor_id, name, description), UPDATE (name, description), DELETE ON public.categories TO authenticated;
