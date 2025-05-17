-- Combined Migration File

-- This file consolidates all previous migration scripts for easier management.
-- It is recommended to review this file before applying it to ensure consistency
-- and handle any potential conflicts or dependencies that might arise from combining.

-- Original migrations included:
-- 001_create_profiles.sql
-- 002_update_profiles_and_trigger.sql
-- 003_create_cafeteria_tables.sql
-- 004_cafeteria_rls_policies.sql
-- 005_create_vendor_settings_tables.sql
-- 006_create_vendor_applications.sql
-- 007_create_categories_table.sql
-- 008_menu_item_images_storage.sql
-- 009_create_pos_order_function.sql
-- 010_add_payment_method_to_orders.sql
-- 011_add_student_reg_id_to_profiles.sql
-- 012_create_lookup_student_function.sql
-- 013_create_get_vendor_orders_function.sql
-- 014_add_order_item_ready_status.sql
-- 015_modify_order_status_enum.sql
-- 016_remove_vendor_order_update_policy.sql
-- 017_create_update_order_status_function.sql
-- 018_create_update_order_status_direct_function.sql
-- 019_add_preparing_to_order_item_status.sql
-- 020_fix_vendor_order_select_rls.sql
-- 021_revert_vendor_order_select_rls.sql
-- 022_create_update_menu_item_availability_function.sql
-- 023_create_menu_item_availability_trigger.sql
-- 024_create_decrement_stock_function.sql
-- 025_add_ready_at_to_orders.sql
-- 026_modify_status_update_functions.sql
-- 027_create_cancel_overdue_orders_function.sql
-- 028_enable_pg_cron.sql
-- 028_schedule_cancel_overdue_orders.sql
-- 029_schedule_cancel_overdue_orders.sql
-- 030_add_transaction_logging_to_pos.sql
-- 031_create_increment_stock_function.sql
-- 032_create_student_order_function.sql
-- 033_add_club_role_and_events.sql
-- 034_fix_club_approval_role.sql
-- 035_enhance_events_add_registrations.sql
-- 036_add_event_payment_function.sql
-- 036_create_marketplace_module.sql
-- 037_add_club_personalization_fields.sql
-- 037_marketplace_operator_functions.sql
-- 038_add_club_profile_select_policy.sql
-- 038_create_marketplace_order_function.sql
-- 039_add_club_banner_storage_rls.sql
-- 039_create_marketplace_order_tables.sql
-- 039_fix_admin_profile_access.sql
-- 039_setup_marketplace_storage.sql
-- 040_fix_login_access.sql
-- 040_fix_profile_policies.sql
-- 040_update_club_balance_on_event_payment.sql
-- 041_fix_marketplace_order_items_column.sql
-- 041_restore_working_policies.sql
-- 042_fix_marketplace_product_id_column.sql
-- 043_cleanup_duplicate_columns.sql
-- 044_add_marketplace_order_items_foreign_key.sql
-- 045_update_marketplace_order_snapshot.sql
-- 046_create_get_marketplace_orders_function.sql
-- 047_fix_marketplace_order_images_type.sql
-- 048_fix_marketplace_order_balance_deduction.sql
-- 049_fix_existing_marketplace_orders.sql

-- Content from 001_create_profiles.sql
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

-- Content from 002_update_profiles_and_trigger.sql
-- Add phone_number and student_id columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN phone_number text,
ADD COLUMN student_id text UNIQUE; -- Added UNIQUE constraint, remove if student IDs might not be unique across all users

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.phone_number IS 'User''s phone number, potentially synced from auth or profile data.';
COMMENT ON COLUMN public.profiles.student_id IS 'University-specific student ID, provided during registration.';

-- Update the handle_new_user function to populate the new fields from metadata and handle different roles
-- This replaces the existing function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status for non-vendors
  signup_role text := NEW.raw_user_meta_data ->> 'role'; -- Get the role passed during signup
  signup_business_type text := NEW.raw_user_meta_data ->> 'business_type'; -- Get the business type

BEGIN
  -- Determine the role based on signup data
  IF signup_role = 'vendor' THEN
    user_role := 'vendor';
    profile_stat := 'pending_approval'; -- Vendors need approval
  ELSIF signup_role = 'campus_store' THEN
    user_role := 'marketplace_operator'; -- Assign marketplace_operator role for campus stores
    profile_stat := 'active'; -- Campus stores are active immediately (adjust if needed)

    -- Create a default storefront for the new marketplace operator
    INSERT INTO public.storefronts (operator_id, name, description, is_active)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name' || ' Store', -- Use full name for default storefront name
        'Welcome to ' || NEW.raw_user_meta_data ->> 'full_name' || '''s new campus store!', -- Default description
        true
    )
    ON CONFLICT ON CONSTRAINT uq_storefronts_operator_id DO NOTHING; -- Avoid error if a storefront already exists for this operator
    RAISE NOTICE 'Created default storefront for new campus store user %', NEW.id;

  END IF;

  INSERT INTO public.profiles (id, email, full_name, student_id, phone_number, role, status, business_type)
  VALUES (
    NEW.id,
    NEW.email,
    -- Extract metadata passed in options.data during signup
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'phone', -- Assumes 'phone' is passed in options.data
    user_role,  -- Use the determined role
    profile_stat, -- Use the determined status
    signup_business_type -- Insert the business type
  );
  RETURN NEW;
END;
$$;

-- Note: The trigger 'on_auth_user_created' should still be associated with this updated function.
-- If you dropped the trigger before running CREATE OR REPLACE FUNCTION, recreate it:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Content from 003_create_cafeteria_tables.sql
-- Migration to create cafeteria related tables

-- 1. Counters Table
CREATE TABLE public.counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to vendor profile, set null if vendor deleted? Or CASCADE? Decide based on requirements.
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.counters IS 'Represents vendor counters or stalls within the cafeteria.';
COMMENT ON COLUMN public.counters.vendor_id IS 'References the vendor (profile) operating this counter.';

-- Enable RLS for counters
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- 2. Menu Items Table
CREATE TABLE public.menu-items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id uuid NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE, -- If counter is deleted, delete its items
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  category text,
  allergens text[], -- Array of text for allergens
  ingredients text[], -- Array of text for ingredients
  images text[], -- Array of text for image URLs
  available boolean NOT NULL DEFAULT true,
  stock integer CHECK (stock >= 0), -- Optional stock level
  is_diet_food boolean NOT NULL DEFAULT false,
  calories integer CHECK (calories >= 0), -- Relevant if is_diet_food is true
  protein numeric CHECK (protein >= 0),
  carbs numeric CHECK (carbs >= 0),
  fat numeric CHECK (fat >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.menu-items IS 'Stores details about individual food or beverage items offered.';
COMMENT ON COLUMN public.menu-items.counter_id IS 'References the counter offering this item.';
COMMENT ON COLUMN public.menu-items.allergens IS 'List of potential allergens.';
COMMENT ON COLUMN public.menu-items.ingredients IS 'List of ingredients.';
COMMENT ON COLUMN public.menu-items.images IS 'URLs for item images.';
COMMENT ON COLUMN public.menu-items.stock IS 'Current stock level, if tracked.';
COMMENT ON COLUMN public.menu-items.is_diet_food IS 'Flag indicating if item has detailed nutritional info.';
COMMENT ON COLUMN public.menu-items.calories IS 'Calorie count, primarily for diet food.';

-- Enable RLS for menu-items
ALTER TABLE public.menu-items ENABLE ROW LEVEL SECURITY;

-- 3. Orders Table
-- Define order status enum type
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to student profile, SET NULL if student deleted?
  -- Alternative for POS: user_id could be nullable or use a specific POS user ID
  total_price numeric NOT NULL CHECK (total_price >= 0),
  subtotal numeric CHECK (subtotal >= 0),
  tax numeric CHECK (tax >= 0),
  status public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
  pickup_time timestamp with time zone, -- Requested pickup time
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.orders IS 'Represents a customer order placed in the cafeteria.';
COMMENT ON COLUMN public.orders.user_id IS 'References the student (profile) who placed the order. Nullable for POS?';
COMMENT ON COLUMN public.orders.status IS 'Current status of the overall order.';
COMMENT ON COLUMN public.orders.pickup_time IS 'The requested time for order pickup.';

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Order Items Table
-- Define order item status enum type
CREATE TYPE public.order_item_status AS ENUM (
  'pending',
  'delivered' -- Can add more like 'cancelled_item' if needed
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, -- If order is deleted, delete its items
  menu_item_id uuid NOT NULL REFERENCES public.menu-items(id) ON DELETE RESTRICT, -- Prevent deleting menu item if part of an order? Or SET NULL?
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_order numeric NOT NULL CHECK (price_at_order >= 0), -- Price of the item when the order was placed
  counter_id uuid NOT NULL REFERENCES public.counters(id) ON DELETE RESTRICT, -- Denormalized for easier filtering by vendor/counter. RESTRICT deletion if items exist?
  special_instructions text,
  status public.order_item_status NOT NULL DEFAULT 'pending'::public.order_item_status,
  created_at timestamp with time zone NOT NULL DEFAULT now()
  -- No updated_at needed? Status change handled by vendor actions.
);

COMMENT ON TABLE public.order_items IS 'Represents individual items within an order.';
COMMENT ON COLUMN public.order_items.order_id IS 'References the parent order.';
COMMENT ON COLUMN public.order_items.menu_item_id IS 'References the menu item ordered.';
COMMENT ON COLUMN public.order_items.price_at_order IS 'The price of one unit of the item at the time of order.';
COMMENT ON COLUMN public.order_items.counter_id IS 'Denormalized reference to the counter fulfilling this item.';
COMMENT ON COLUMN public.order_items.special_instructions IS 'Customer notes for this specific item.';
COMMENT ON COLUMN public.order_items.status IS 'Status of the individual item within the order (e.g., for partial delivery).';

-- Enable RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Add indexes for frequently queried columns
CREATE INDEX idx_menu-items_counter_id ON public.menu-items(counter_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX idx_order_items_counter_id ON public.order_items(counter_id);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with 'updated_at'
CREATE TRIGGER set_timestamp_counters
BEFORE UPDATE ON public.counters
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_menu-items
BEFORE UPDATE ON public.menu-items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Note: RLS policies will be added in the next step.

-- Content from 004_cafeteria_rls_policies.sql
-- Migration to add Row Level Security (RLS) policies for cafeteria tables

-- Helper function to get user role from profiles table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'admin'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is vendor
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'vendor'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_role() = 'student'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check vendor access to a specific order
-- Checks if the order contains at least one item from a counter owned by the current vendor
CREATE OR REPLACE FUNCTION public.check_vendor_order_access(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER -- Important: Runs as the calling user to check auth.uid() correctly
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE oi.order_id = p_order_id
      AND c.vendor_id = auth.uid()
  );
$$;


-- 1. Policies for 'counters' table
-- Allow admins full access (example, adjust as needed)
DROP POLICY IF EXISTS "Allow admin full access on counters" ON public.counters;
CREATE POLICY "Allow admin full access on counters" ON public.counters
  FOR ALL USING (public.is_admin());

-- Allow vendors to view their own counters
DROP POLICY IF EXISTS "Allow vendors to view their own counters" ON public.counters;
CREATE POLICY "Allow vendors to view their own counters" ON public.counters
  FOR SELECT USING (public.is_vendor() AND vendor_id = auth.uid());

-- Allow vendors to create counters for themselves
DROP POLICY IF EXISTS "Allow vendors to create their own counters" ON public.counters;
CREATE POLICY "Allow vendors to create their own counters" ON public.counters
  FOR INSERT WITH CHECK (public.is_vendor() AND vendor_id = auth.uid());

-- Allow vendors to update their own counters
DROP POLICY IF EXISTS "Allow vendors to update their own counters" ON public.counters;
CREATE POLICY "Allow vendors to update their own counters" ON public.counters
  FOR UPDATE USING (public.is_vendor() AND vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid()); -- Ensure they can't change the vendor_id

-- Allow vendors to delete their own counters (consider implications, maybe soft delete?)
DROP POLICY IF EXISTS "Allow vendors to delete their own counters" ON public.counters;
CREATE POLICY "Allow vendors to delete their own counters" ON public.counters
  FOR DELETE USING (public.is_vendor() AND vendor_id = auth.uid());

-- Allow authenticated users to view counters (needed for fetching counter name in order history)
DROP POLICY IF EXISTS "Allow authenticated users to view counters" ON public.counters;
CREATE POLICY "Allow authenticated users to view counters" ON public.counters
  FOR SELECT USING (auth.role() = 'authenticated');


-- 2. Policies for 'menu-items' table
-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on menu-items" ON public.menu-items;
CREATE POLICY "Allow admin full access on menu-items" ON public.menu-items
  FOR ALL USING (public.is_admin());

-- Allow authenticated users (students, vendors) to view available menu items,
-- OR items that were updated very recently (to allow RLS notifications for 'available=false' changes)
DROP POLICY IF EXISTS "Allow authenticated users to view available menu items" ON public.menu-items;
CREATE POLICY "Allow authenticated users to view available menu items" ON public.menu-items
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      available = true OR
      updated_at > (now() - interval '5 seconds') -- Allow seeing recently updated (even if now unavailable) items briefly
    )
  );

-- Allow vendors to view ALL their menu items (including unavailable)
DROP POLICY IF EXISTS "Allow vendors to view all their menu items" ON public.menu-items;
CREATE POLICY "Allow vendors to view all their menu items" ON public.menu-items
  FOR SELECT USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));

-- Allow vendors to create menu items for their own counters
DROP POLICY IF EXISTS "Allow vendors to create items for their counters" ON public.menu-items;
CREATE POLICY "Allow vendors to create items for their counters" ON public.menu-items
  FOR INSERT WITH CHECK (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));

-- Allow vendors to update menu items belonging to their counters
DROP POLICY IF EXISTS "Allow vendors to update items on their counters" ON public.menu-items;
CREATE POLICY "Allow vendors to update items on their counters" ON public.menu-items
  FOR UPDATE USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()))
  WITH CHECK (counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid())); -- Ensure they can't change counter to one they don't own

-- Allow vendors to delete menu items belonging to their counters
DROP POLICY IF EXISTS "Allow vendors to delete items from their counters" ON public.menu-items;
CREATE POLICY "Allow vendors to delete items from their counters" ON public.menu-items
  FOR DELETE USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));


-- 3. Policies for 'orders' table
-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on orders" ON public.orders;
CREATE POLICY "Allow admin full access on orders" ON public.orders
  FOR ALL USING (public.is_admin());

-- Allow students to view their own orders
DROP POLICY IF EXISTS "Allow students to view their own orders" ON public.orders;
CREATE POLICY "Allow students to view their own orders" ON public.orders
  FOR SELECT USING (public.is_student() AND user_id = auth.uid());

-- Allow students to create orders for themselves
-- Note: This assumes order creation logic inserts into orders first, then order_items.
DROP POLICY IF EXISTS "Allow students to create their own orders" ON public.orders;
CREATE POLICY "Allow students to create their own orders" ON public.orders
  FOR INSERT WITH CHECK (public.is_student() AND user_id = auth.uid());

-- Allow vendors to create orders associated with themselves (e.g., for POS)
DROP POLICY IF EXISTS "Allow vendors to create orders for themselves (POS)" ON public.orders;
CREATE POLICY "Allow vendors to create orders for themselves (POS)" ON public.orders
  FOR INSERT WITH CHECK (public.is_vendor() AND user_id = auth.uid());

-- Allow vendors to view orders containing items from their counters (using helper function)
DROP POLICY IF EXISTS "Allow vendors to view orders with their items" ON public.orders;
CREATE POLICY "Allow vendors to view orders with their items" ON public.orders
  FOR SELECT USING (
    public.is_vendor() -- Use the existing helper function for role check
    AND public.check_vendor_order_access(public.orders.id) -- Use the helper function for access check
  );

-- Allow vendors to update the status of orders containing items from their counters (using helper function)
DROP POLICY IF EXISTS "Allow vendors to update status of orders with their items" ON public.orders;
CREATE POLICY "Allow vendors to update status of orders with their items" ON public.orders
  FOR UPDATE USING (
    public.is_vendor() -- Use the existing helper function for role check
    AND public.check_vendor_order_access(public.orders.id) -- Use the helper function for access check
  );
  -- No WITH CHECK needed if only updating status.


-- 4. Policies for 'order_items' table
-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on order_items" ON public.order_items;
CREATE POLICY "Allow admin full access on order_items" ON public.order_items
  FOR ALL USING (public.is_admin());

-- Allow students to view items belonging to their own orders
DROP POLICY IF EXISTS "Allow students to view their own order items" ON public.order_items;
CREATE POLICY "Allow students to view their own order items" ON public.order_items
  FOR SELECT USING (public.is_student() AND order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- Allow students to create order items for their own orders
-- Note: This assumes order creation logic inserts into orders first, then order_items.
DROP POLICY IF EXISTS "Allow students to create their own order items" ON public.order_items;
CREATE POLICY "Allow students to create their own order items" ON public.order_items
  FOR INSERT WITH CHECK (public.is_student() AND order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- Allow vendors to view order items associated with their counters
DROP POLICY IF EXISTS "Allow vendors to view their order items" ON public.order_items;
CREATE POLICY "Allow vendors to view their order items" ON public.order_items
  FOR SELECT USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));

-- Allow vendors to update the status of order items associated with their counters
DROP POLICY IF EXISTS "Allow vendors to update status of their order items" ON public.order_items;
CREATE POLICY "Allow vendors to update status of their order items" ON public.order_items
  FOR UPDATE USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()))
  WITH CHECK (counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid())); -- Prevent changing counter_id


-- Grant usage on helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vendor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_vendor_order_access(uuid) TO authenticated; -- Grant execute on the check function

-- Grant necessary permissions on tables to the 'authenticated' role
-- Adjust SELECT, INSERT, UPDATE, DELETE as needed per role based on policies above
GRANT SELECT ON public.counters TO authenticated;
GRANT INSERT (name, location, is_active, vendor_id) ON public.counters TO authenticated; -- Vendors insert via policy
GRANT UPDATE (name, location, is_active) ON public.counters TO authenticated; -- Vendors update via policy
GRANT DELETE ON public.counters TO authenticated; -- Vendors delete via policy

GRANT SELECT ON public.menu-items TO authenticated;
GRANT INSERT (counter_id, name, description, price, category, allergens, ingredients, image_path, available, stock, is_diet_food, calories, protein, carbs, fat) ON public.menu-items TO authenticated; -- Vendors insert via policy
GRANT UPDATE (counter_id, name, description, price, category, allergens, ingredients, image_path, available, stock, is_diet_food, calories, protein, carbs, fat) ON public.menu-items TO authenticated; -- Vendors update via policy
GRANT DELETE ON public.menu-items TO authenticated; -- Vendors delete via policy

GRANT SELECT ON public.orders TO authenticated;
GRANT INSERT (user_id, total_price, subtotal, tax, status, pickup_time, payment_method) ON public.orders TO authenticated; -- Students/Vendors insert via policy
GRANT UPDATE (status) ON public.orders TO authenticated; -- Vendors update status via policy

GRANT SELECT ON public.order_items TO authenticated;
GRANT INSERT (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status) ON public.order_items TO authenticated; -- Students/Vendors insert via policy
GRANT UPDATE (status) ON public.order_items TO authenticated; -- Vendors update status via policy

-- Note: Admin access is handled by the specific admin policies defined above.
-- If you have an 'anon' role needing access (e.g., viewing menu items without login), add policies and grants for 'anon'.
-- Example: GRANT SELECT ON public.menu-items TO anon;
-- CREATE POLICY "Allow anon read access to available menu items" ON public.menu-items FOR SELECT TO anon USING (available = true);

-- Content from 005_create_vendor_settings_tables.sql
-- Migration to create vendor settings and tax tables

-- 1. Vendor Settings Table
CREATE TABLE public.vendor_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE, -- Ensure one settings row per vendor
  shop_name text,
  working_hours jsonb, -- Store as JSON, e.g., [{"day": "Monday", "open": "09:00", "close": "17:00"}, ...] or simpler text[]
  is_open boolean NOT NULL DEFAULT true,
  order_limit integer CHECK (order_limit IS NULL OR order_limit >= 0), -- Max concurrent orders, null means no limit
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_settings IS 'Stores vendor-specific operational settings.';
COMMENT ON COLUMN public.vendor_settings.vendor_id IS 'References the vendor profile these settings belong to.';
COMMENT ON COLUMN public.vendor_settings.working_hours IS 'Operating hours for the vendor shop/counter.';
COMMENT ON COLUMN public.vendor_settings.is_open IS 'Indicates if the shop is currently open for orders.';
COMMENT ON COLUMN public.vendor_settings.order_limit IS 'Maximum number of concurrent orders allowed.';

-- Apply the existing timestamp trigger
CREATE TRIGGER set_timestamp_vendor_settings
BEFORE UPDATE ON public.vendor_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.vendor_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_settings
DROP POLICY IF EXISTS "Allow vendors to view their own settings" ON public.vendor_settings;
CREATE POLICY "Allow vendors to view their own settings" ON public.vendor_settings
  FOR SELECT USING (public.is_vendor() AND vendor_id = auth.uid());

DROP POLICY IF EXISTS "Allow vendors to update their own settings" ON public.vendor_settings;
CREATE POLICY "Allow vendors to update their own settings" ON public.vendor_settings
  FOR UPDATE USING (public.is_vendor() AND vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid()); -- Prevent changing vendor_id

-- Note: INSERT might be handled by a trigger/function upon vendor approval or first login,
-- or allow vendors to insert if their settings row doesn't exist yet.
-- For now, assuming row exists or is created elsewhere. If vendors need to create:
-- DROP POLICY IF EXISTS "Allow vendors to create their own settings" ON public.vendor_settings;
-- CREATE POLICY "Allow vendors to create their own settings" ON public.vendor_settings
--   FOR INSERT WITH CHECK (public.is_vendor() AND vendor_id = auth.uid());

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on vendor_settings" ON public.vendor_settings;
CREATE POLICY "Allow admin full access on vendor_settings" ON public.vendor_settings
  FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT SELECT, UPDATE ON public.vendor_settings TO authenticated;
-- GRANT INSERT ON public.vendor_settings TO authenticated; -- If vendors can create


-- 2. Tax Rates Table
CREATE TABLE public.tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 1), -- Store as decimal, e.g., 0.15 for 15%
  description text, -- Optional description
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tax_rates IS 'Stores tax rates configured by vendors.';
COMMENT ON COLUMN public.tax_rates.vendor_id IS 'References the vendor profile these tax rates belong to.';
COMMENT ON COLUMN public.tax_rates.name IS 'Name of the tax (e.g., VAT, Service Charge).';
COMMENT ON COLUMN public.tax_rates.rate IS 'Tax rate as a decimal (0.0 to 1.0).';
COMMENT ON COLUMN public.tax_rates.is_active IS 'Whether this tax rate is currently applied.';

-- Apply the existing timestamp trigger
CREATE TRIGGER set_timestamp_tax_rates
BEFORE UPDATE ON public.tax_rates
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_rates
DROP POLICY IF EXISTS "Allow vendors to manage their own tax rates" ON public.tax_rates;
CREATE POLICY "Allow vendors to manage their own tax rates" ON public.tax_rates
  FOR ALL USING (public.is_vendor() AND vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on tax_rates" ON public.tax_rates;
CREATE POLICY "Allow admin full access on tax_rates" ON public.tax_rates
  FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;


-- 3. Indexes
CREATE INDEX idx_vendor_settings_vendor_id ON public.vendor_settings(vendor_id);
CREATE INDEX idx_tax_rates_vendor_id ON public.tax_rates(vendor_id);

-- Content from 006_create_vendor_applications.sql
-- Define application status enum type (if not already defined elsewhere)
DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendor_applications Table
CREATE TABLE public.vendor_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'pending'::public.application_status,
  business_name text NOT NULL,
  business_type text NOT NULL,
  other_business_type text, -- For when business_type is 'other'
  contact_person text NOT NULL,
  email text NOT NULL, -- Application contact email, might differ from profile email
  phone text NOT NULL,
  description text,
  established_year integer,
  vendor_type text, -- e.g., 'food', 'merchandise'
  university_affiliation text,
  has_food_license boolean,
  has_business_registration boolean,
  reviewer_notes text, -- Notes from admin during review
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone, -- Timestamp when reviewed
  created_at timestamp with time zone NOT NULL DEFAULT now(), -- Redundant with submitted_at? Keep for consistency or remove.
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Comments
COMMENT ON TABLE public.vendor_applications IS 'Stores applications submitted by users wishing to become vendors.';
COMMENT ON COLUMN public.vendor_applications.user_id IS 'References the profile of the user submitting the application.';
COMMENT ON COLUMN public.vendor_applications.status IS 'Current status of the application.';
COMMENT ON COLUMN public.vendor_applications.email IS 'Contact email provided in the application.';
COMMENT ON COLUMN public.vendor_applications.reviewer_notes IS 'Feedback or notes from the admin who reviewed the application.';
COMMENT ON COLUMN public.vendor_applications.reviewed_at IS 'Timestamp when the application was last reviewed.';

-- Apply the timestamp trigger for updated_at
CREATE TRIGGER set_timestamp_vendor_applications
BEFORE UPDATE ON public.vendor_applications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp(); -- Assumes trigger_set_timestamp exists from migration 003

-- Enable RLS
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_applications
-- Allow users to insert their own application
DROP POLICY IF EXISTS "Allow users to submit their own application" ON public.vendor_applications;
CREATE POLICY "Allow users to submit their own application" ON public.vendor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own application status
DROP POLICY IF EXISTS "Allow users to view their own application" ON public.vendor_applications;
CREATE POLICY "Allow users to view their own application" ON public.vendor_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on vendor_applications" ON public.vendor_applications;
CREATE POLICY "Allow admin full access on vendor_applications" ON public.vendor_applications
  FOR ALL USING (public.is_admin()); -- Assumes is_admin() helper exists from migration 004

-- Grant permissions
GRANT SELECT, INSERT ON public.vendor_applications TO authenticated;
-- Admins get full access via their specific policy

-- Indexes
CREATE INDEX idx_vendor_applications_user_id ON public.vendor_applications(user_id);
CREATE INDEX idx_vendor_applications_status ON public.vendor_applications(status);

-- Content from 007_create_categories_table.sql
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

-- Content from 008_menu_item_images_storage.sql
-- Migration to modify menu-items for Supabase Storage and add Storage RLS

-- 1. Modify menu-items table
-- Drop the old images column
ALTER TABLE public.menu-items
DROP COLUMN IF EXISTS images;

-- Add the new image_path column
ALTER TABLE public.menu-items
ADD COLUMN image_path text;

COMMENT ON COLUMN public.menu-items.image_path IS 'Path/key to the primary image in Supabase Storage bucket.';

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

-- Content from 009_create_pos_order_function.sql
-- Migration to update the database function for handling POS order creation atomically,
-- now supporting both cash and online payments and including balance deduction.
-- Final attempt to fix user_id assignment for online orders.

-- Drop existing versions of the function first to avoid conflicts
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[], text, uuid);
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[]);
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid); -- Drop the latest signature too

-- Recreate the input type if it doesn't exist (safer than dropping)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_order_item_input') THEN
        CREATE TYPE public.pos_order_item_input AS (
            menu_item_id uuid,
            quantity integer,
            special_instructions text
        );
        GRANT USAGE ON TYPE public.pos_order_item_input TO authenticated;
        -- GRANT USAGE ON TYPE public.pos_order_item_input TO service_role;
    END IF;
    -- Ensure payment_method_type exists (safe to run even if it exists)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
        CREATE TYPE public.payment_method_type AS ENUM ('online', 'cash');
        GRANT USAGE ON TYPE public.payment_method_type TO authenticated;
        -- GRANT USAGE ON TYPE public.payment_method_type TO service_role;
    END IF;
END $$;


-- Create or Replace the function with the updated logic and signature
CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_vendor_user_id uuid,          -- The user ID of the vendor creating the order
    p_counter_id uuid,              -- The counter ID where the order is placed
    p_items pos_order_item_input[], -- Array of items being ordered
    p_payment_method public.payment_method_type, -- 'cash' or 'online'
    p_student_user_id uuid DEFAULT NULL -- Required if p_payment_method is 'online'
)
RETURNS uuid -- Returns the ID of the newly created order
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_total_price numeric := 0;
    v_input_item public.pos_order_item_input;
    v_menu_item record;
    v_price_at_order numeric;
    v_item_id_to_insert uuid;
    v_quantity_to_insert integer;
    v_spec_instructions_to_insert text;
    v_student_balance numeric;
    v_user_id_for_insert uuid; -- Renamed variable for clarity
BEGIN
    -- Input validation
    IF p_vendor_user_id IS NULL THEN RAISE EXCEPTION 'Vendor user ID cannot be null'; END IF;
    IF p_counter_id IS NULL THEN RAISE EXCEPTION 'Counter ID cannot be null'; END IF;
    IF p_payment_method IS NULL THEN RAISE EXCEPTION 'Payment method cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_payment_method = 'online' AND p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID is required for online payments.'; END IF;

    -- 1. Pre-check loop: Validate items and calculate total price
    FOREACH v_input_item IN ARRAY p_items LOOP
        IF v_input_item.quantity <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive for menu item %', v_input_item.menu_item_id; END IF;
        SELECT id, price, stock, available, counter_id INTO v_menu_item FROM public.menu-items WHERE id = v_input_item.menu_item_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_input_item.menu_item_id; END IF;
        IF v_menu_item.counter_id != p_counter_id THEN RAISE EXCEPTION 'Menu item % does not belong to counter %', v_input_item.menu_item_id, p_counter_id; END IF;
        IF NOT v_menu_item.available THEN RAISE EXCEPTION 'Menu item % is not available', v_input_item.menu_item_id; END IF;
        IF v_menu_item.stock IS NOT NULL AND v_menu_item.stock < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for menu item % (available: %, requested: %)', v_input_item.menu_item_id, v_menu_item.stock, v_input_item.quantity;
        END IF;
        v_total_price := v_total_price + (v_menu_item.price * v_input_item.quantity);
    END LOOP;

    -- 2. Check student balance AND DEDUCT if payment is online
    IF p_payment_method = 'online' THEN
        SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
        IF v_student_balance IS NULL OR v_student_balance < v_total_price THEN
            RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_total_price;
        END IF;
        UPDATE public.profiles SET balance = balance - v_total_price WHERE id = p_student_user_id;
        -- Explicitly set the user ID for insert AFTER balance check
        v_user_id_for_insert := p_student_user_id;
    ELSE
        -- Explicitly set the user ID for insert for cash orders
        v_user_id_for_insert := p_vendor_user_id;
    END IF;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method)
    VALUES (
        v_user_id_for_insert, -- Use the explicitly assigned variable
        v_total_price,
        'completed'::public.order_status,
        now(),
        v_total_price,
        0,
        p_payment_method
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and update stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        SELECT price INTO v_price_at_order FROM public.menu-items WHERE id = v_input_item.menu_item_id;
        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, p_counter_id, v_spec_instructions_to_insert, 'delivered'::public.order_item_status);
        UPDATE public.menu-items SET stock = stock - v_quantity_to_insert WHERE id = v_item_id_to_insert AND stock IS NOT NULL;
    END LOOP;

    -- 5. Update Vendor Balance (Original Step Numbering)
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_total_price
    WHERE id = p_vendor_user_id;

    -- 6. Return the new order ID (Original Step Numbering)
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_pos_order: %', SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;

-- Grant execute permission using the new signature
GRANT EXECUTE ON FUNCTION public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid) TO service_role;

-- Content from 010_add_payment_method_to_orders.sql
-- Migration to add payment method tracking to orders

-- 1. Define payment method enum type
CREATE TYPE public.payment_method_type AS ENUM (
  'online', -- Payment made through the student portal (e.g., balance deduction)
  'cash'    -- Payment made in cash at the POS
);

-- 2. Add the payment_method column to the orders table
ALTER TABLE public.orders
ADD COLUMN payment_method public.payment_method_type;

-- 3. Add a comment to the new column
COMMENT ON COLUMN public.orders.payment_method IS 'Indicates how the order was paid for (online balance or cash at POS).';

-- 4. Optional: Set a default for existing orders if necessary
-- If you have existing orders and want to assign a default, uncomment and adjust:
-- UPDATE public.orders SET payment_method = 'online' WHERE payment_method IS NULL;
-- ALTER TABLE public.orders ALTER COLUMN payment_method SET NOT NULL; -- Make it mandatory after backfilling

-- Note: You might need to update RLS policies if they depend on this new column,
-- although it's unlikely for basic read/write policies.

-- Note: Remember to update the order creation logic (both frontend controller and POS function)
-- to set this column appropriately when new orders are created.

-- Content from 011_add_student_reg_id_to_profiles.sql
-- Migration to add a student registration ID column to the profiles table

-- Add the new column, make it potentially unique if needed
ALTER TABLE public.profiles
ADD COLUMN student_reg_id TEXT UNIQUE;

-- Add a comment to the new column
COMMENT ON COLUMN public.profiles.student_reg_id IS 'Stores the unique student registration/roll ID.';

-- Optional: Create an index for faster lookups if you query by this often
CREATE INDEX IF NOT EXISTS idx_profiles_student_reg_id ON public.profiles(student_reg_id);

-- Note: You will need to update your registration process or have an admin process
-- to populate this new student_reg_id field for existing and new student users.
-- The handle_new_user trigger might need adjustment if student_reg_id is available at signup.

-- Content from 012_create_lookup_student_function.sql
-- Migration to create/update a function to look up a student's UUID by their registration ID.
-- Removing explicit RLS bypass for simplicity. Relying on SECURITY DEFINER.

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.get_user_id_by_student_id(text);

-- Create or Replace the function
CREATE OR REPLACE FUNCTION public.get_user_id_by_student_id(
    p_student_id TEXT -- Input: The student's registration ID (TEXT)
)
RETURNS uuid -- Output: The student's profile ID (UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Function executes with the permissions of the user who defined it
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- SECURITY DEFINER should allow reading profiles table if owner has permission.
    SELECT id
    INTO v_user_id
    FROM public.profiles
    WHERE student_id = p_student_id -- Query using the TEXT column 'student_id' based on error/tables.json
      AND role = 'student'::public.user_role; -- Ensure the profile is actually a student

    -- Explicitly return NULL if no user was found
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN v_user_id; -- Returns the found UUID
END;
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_id_by_student_id(text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_user_id_by_student_id(text) TO service_role; -- If needed

-- Content from 013_create_get_vendor_orders_function.sql
-- Drop the existing function first if it exists, to allow changing the return type.
DROP FUNCTION IF EXISTS public.get_vendor_orders_with_student_details();

-- Function to fetch orders for a vendor, including student details for online orders.
-- Runs with the privileges of the function owner (SECURITY DEFINER)
-- to allow joining with the profiles table, which the vendor might not have direct access to via RLS.

CREATE OR REPLACE FUNCTION public.get_vendor_orders_with_student_details()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    total_price numeric,
    subtotal numeric,
    tax numeric,
    status public.order_status,
    pickup_time timestamptz,
    created_at timestamptz,
    payment_method text, -- Corrected type to match orders table
    student_full_name text,
    student_reg_id text -- Changed name to avoid conflict with profiles.student_id if selected directly
    -- Add other order fields as needed
)
AS $$
BEGIN
  -- Check if the caller is a vendor
  IF NOT public.is_vendor() THEN
    RAISE EXCEPTION 'Permission denied: Caller is not a vendor.';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.total_price,
    o.subtotal,
    o.tax,
    o.status,
    o.pickup_time,
    o.created_at,
    o.payment_method,
    -- Select profile details only if it's an 'online' order, otherwise null
    CASE
      WHEN o.payment_method = 'online' THEN p.full_name
      ELSE NULL
    END AS student_full_name,
    CASE
      WHEN o.payment_method = 'online' THEN p.student_id -- This is the registration ID column
      ELSE NULL
    END AS student_reg_id
  FROM
    public.orders o
  -- Left join profiles for online orders
  LEFT JOIN public.profiles p ON o.user_id = p.id AND o.payment_method = 'online'
  -- Ensure the vendor has at least one item from their counters in this order
  WHERE EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE oi.order_id = o.id
      AND c.vendor_id = auth.uid()
  )
  ORDER BY
    o.created_at DESC;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permission to authenticated users (vendors will pass the internal check)
GRANT EXECUTE ON FUNCTION public.get_vendor_orders_with_student_details() TO authenticated;

COMMENT ON FUNCTION public.get_vendor_orders_with_student_details() IS 'Fetches orders relevant to the calling vendor (based on items from their counters) and includes student name/reg_id for online orders. Runs as SECURITY DEFINER to access profiles.';

-- Content from 014_add_order_item_ready_status.sql
-- supabase/migrations/014_add_order_item_ready_status.sql

-- Add 'ready' value to the order_item_status enum
-- This allows individual items to be marked as ready for pickup/delivery by the vendor.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status') THEN
        -- Add the new value idempotently (ignore if it already exists)
        ALTER TYPE public.order_item_status ADD VALUE IF NOT EXISTS 'ready';
    ELSE
        -- If the type doesn't exist, we might need to create it (though it should exist based on tables.json)
        -- CREATE TYPE public.order_item_status AS ENUM ('pending', 'ready', 'delivered');
        RAISE WARNING 'Type public.order_item_status does not exist, skipping alteration. Manual creation might be needed.';
    END IF;
END $$;

-- Content from 015_modify_order_status_enum.sql
-- supabase/migrations/015_modify_order_status_enum.sql

-- Add new values to the order_status enum
-- Note: Adding values to an enum in PostgreSQL requires creating a new type
-- and replacing the old one, or using ALTER TYPE ... ADD VALUE (if supported and safe)
-- Using ADD VALUE is generally preferred if available and no complex transactions depend on the enum during migration.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        -- Add the new values idempotently (ignore if they already exist)
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partially_ready';
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partially_delivered';
    ELSE
        RAISE NOTICE 'Type public.order_status does not exist, skipping alteration.';
    END IF;
END $$;

-- Content from 016_remove_vendor_order_update_policy.sql
-- supabase/migrations/016_remove_vendor_order_update_policy.sql

-- Drop the policy that allows vendors to update the main order status
-- based on owning an item within that order.
-- Vendors should update order_items.status instead.

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Allow vendors to update status of orders with their items" ON public.orders;

-- Content from 017_create_update_order_status_function.sql
-- supabase/migrations/017_create_update_order_status_function.sql

-- Function to update the main order status based on the statuses of its items.
-- This should be called after an order_item status is updated.

CREATE OR REPLACE FUNCTION public.update_order_status_based_on_items(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Allows the function to update orders.status despite RLS
AS $$
DECLARE
  item_statuses order_item_status[]; -- Use the correct enum type if defined, otherwise text[]
  total_items integer;
  pending_count integer;
  preparing_count integer; -- Added count for preparing
  ready_count integer;
  delivered_count integer;
  new_order_status order_status; -- Use the correct enum type
  current_order_status order_status; -- To check current status for pending->confirmed logic
BEGIN
  -- 1. Get all item statuses for the given order
  SELECT array_agg(status), count(*)
  INTO item_statuses, total_items
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- Handle case where order has no items (shouldn't happen in normal flow)
  IF total_items IS NULL OR total_items = 0 THEN
    RAISE WARNING 'Order % has no items, cannot determine status.', p_order_id;
    -- Optionally set status to 'cancelled' or leave as is
    -- UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;
    RETURN;
  END IF;

  -- 2. Count items in each status category, including 'preparing'
  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'preparing'), -- Count preparing items
    count(*) FILTER (WHERE status = 'ready'),
    count(*) FILTER (WHERE status = 'delivered')
  INTO pending_count, preparing_count, ready_count, delivered_count
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- 3. Determine the new overall order status based on item counts (Revised Logic)
  IF delivered_count = total_items THEN
    new_order_status := 'completed';
    -- Stock is now decremented at order creation time.
  ELSIF delivered_count > 0 THEN
    new_order_status := 'partially_delivered'; -- If any are delivered, it's partially delivered (highest precedence after completed)
  ELSIF ready_count = total_items THEN
     new_order_status := 'ready'; -- If all remaining are ready
  ELSIF preparing_count > 0 THEN
     new_order_status := 'preparing'; -- If any are preparing (and none delivered), the order is preparing
  ELSIF ready_count > 0 THEN
    new_order_status := 'partially_ready'; -- If some are ready, others pending (none preparing or delivered)
  ELSIF pending_count = total_items THEN
     -- If all items are pending, check the current order status.
     -- If it was 'confirmed', keep it as 'confirmed'. Otherwise, set to 'pending'.
     -- This prevents reverting from 'confirmed' back to 'pending' just because items haven't started preparation.
     SELECT status INTO current_order_status FROM public.orders WHERE id = p_order_id;
     IF current_order_status = 'confirmed' THEN
        new_order_status := 'confirmed';
     ELSE
        new_order_status := 'pending';
     END IF;
  ELSE
     -- Fallback case: Should ideally not be reached with the logic above.
     -- If it is reached, it implies a mix not covered (e.g., only pending and preparing?). Default to preparing if any exist.
     IF preparing_count > 0 THEN
         new_order_status := 'preparing';
     ELSIF ready_count > 0 THEN
         new_order_status := 'partially_ready';
     ELSE
         new_order_status := 'pending';
     END IF;
     RAISE WARNING 'Order % hit fallback status logic. Counts: Pending=%, Preparing=%, Ready=%, Delivered=%, Total=%. Setting status to %',
         p_order_id, pending_count, preparing_count, ready_count, delivered_count, total_items, new_order_status;
  END IF;

  -- 4. Update the order status only if it has changed
  UPDATE public.orders
  SET status = new_order_status, updated_at = now()
  WHERE id = p_order_id AND status IS DISTINCT FROM new_order_status;

END;
$$;

-- Grant execute permission to authenticated users (vendors will call this via the controller)
-- Adjust role if needed (e.g., service_role if called server-side without user context)
GRANT EXECUTE ON FUNCTION public.update_order_status_based_on_items(uuid) TO authenticated;

-- Optional: Consider revoking from public if not needed
-- REVOKE EXECUTE ON FUNCTION public.update_order_status_based_on_items(uuid) FROM public;

-- Content from 018_create_update_order_status_direct_function.sql
-- supabase/migrations/018_create_update_order_status_direct_function.sql

-- Function to directly update the status of an order by a vendor associated with it.
-- SECURITY DEFINER is crucial here to bypass vendor RLS on the orders table.

CREATE OR REPLACE FUNCTION public.update_order_status_direct(
    p_order_id uuid,
    p_new_status public.order_status -- Use the existing enum type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function owner (likely superuser) to update the status
AS $$
DECLARE
  is_caller_vendor_associated boolean;
BEGIN
  -- Security Check: Verify the caller is actually a vendor associated with this order.
  -- This prevents a vendor from updating orders they don't handle.
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE oi.order_id = p_order_id
      AND c.vendor_id = auth.uid() -- Check if any item's counter belongs to the calling vendor
  ) INTO is_caller_vendor_associated;

  IF NOT is_caller_vendor_associated THEN
    -- Additionally check if the order was a POS cash order placed by the vendor themselves
    IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = p_order_id
        AND o.payment_method = 'cash'
        AND o.user_id = auth.uid() -- Vendor placed the order
    ) THEN
        RAISE EXCEPTION 'Permission denied: Caller (%) is not an associated vendor for order %', auth.uid(), p_order_id;
    END IF;
  END IF;

  -- Proceed with the update if the security check passes
  UPDATE public.orders
  SET status = p_new_status, updated_at = now()
  WHERE id = p_order_id;

  -- Optional: Check if the update was successful (order existed)
  IF NOT FOUND THEN
    RAISE WARNING 'Order % not found for direct status update to %.', p_order_id, p_new_status;
    RETURN; -- Exit if order wasn't found
  END IF;

  -- Stock is now decremented at order creation time.

  -- Increment stock if the new status is 'cancelled'
  IF p_new_status = 'cancelled' THEN
    DECLARE
      item_record record;
    BEGIN
      -- Loop through ALL order items and increment stock
      FOR item_record IN
        SELECT oi.menu_item_id, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
        -- No need to check item status, increment for all items in the cancelled order
      LOOP
        -- Call the stock increment function for each item
        PERFORM public.increment_menu_item_stock(item_record.menu_item_id, item_record.quantity);
      END LOOP;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error during stock increment but don't fail the status update itself
        RAISE WARNING 'Error incrementing stock for cancelled order %: %', p_order_id, SQLERRM;
        -- Re-raise the exception if you want the calling transaction to fail
        -- RAISE;
    END;
  END IF;

END;
$$;

-- Grant execute permission ONLY to the authenticated role (vendors will call this)
GRANT EXECUTE ON FUNCTION public.update_order_status_direct(uuid, public.order_status) TO authenticated;

-- Revoke from public just in case
REVOKE EXECUTE ON FUNCTION public.update_order_status_direct(uuid, public.order_status) FROM public;

-- Content from 019_add_preparing_to_order_item_status.sql
-- supabase/migrations/019_add_preparing_to_order_item_status.sql

-- Add 'preparing' value to the order_item_status enum
-- This allows individual items to be marked as being actively prepared by the vendor.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status') THEN
        -- Add the new value idempotently (ignore if it already exists)
        ALTER TYPE public.order_item_status ADD VALUE IF NOT EXISTS 'preparing' AFTER 'pending'; -- Add it after 'pending' for logical order
    ELSE
        RAISE WARNING 'Type public.order_item_status does not exist, skipping alteration. Manual creation might be needed.';
    END IF;
END $$;

-- Content from 020_fix_vendor_order_select_rls.sql
-- Drop the existing policy that uses the function call
DROP POLICY IF EXISTS "Allow vendors to view orders with their items" ON public.orders;

-- Recreate the policy with inlined logic for Realtime compatibility
CREATE POLICY "Allow vendors to view orders with their items"
ON public.orders
FOR SELECT
TO public -- Or specific authenticated roles if needed
USING (
  -- Check 1: Ensure the user has the 'vendor' role (using the existing helper function is fine here)
  public.is_vendor()
  AND
  -- Check 2: Inline the logic from check_vendor_order_access function
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE
      oi.order_id = orders.id -- Correlate with the orders table row being checked
      AND c.vendor_id = auth.uid() -- Check if the counter belongs to the current vendor
  )
);

-- Optional: Grant usage on the is_vendor function if not already done
-- GRANT EXECUTE ON FUNCTION public.is_vendor() TO authenticated; -- Or relevant roles

COMMENT ON POLICY "Allow vendors to view orders with their items" ON public.orders
  IS 'Allows vendors to select orders if they own at least one counter associated with an item in that order. Optimized for Supabase Realtime.';

-- Content from 021_revert_vendor_order_select_rls.sql
-- Drop the potentially problematic policy (created in migration 020 or manually)
DROP POLICY IF EXISTS "Allow vendors to view orders with their items" ON public.orders;

-- Recreate the policy using the original function call
-- This might break Realtime but should restore visibility
CREATE POLICY "Allow vendors to view orders with their items"
ON public.orders
FOR SELECT
TO public -- Or specific authenticated roles if needed
USING (
  -- Check 1: Ensure the user has the 'vendor' role
  public.is_vendor()
  AND
  -- Check 2: Use the original function call
  public.check_vendor_order_access(id)
);

COMMENT ON POLICY "Allow vendors to view orders with their items" ON public.orders
  IS 'Allows vendors to select orders if they own at least one counter associated with an item in that order. Reverted to use function call.';

-- Content from 022_create_update_menu_item_availability_function.sql
-- Function to update menu_item availability based on stock level
CREATE OR REPLACE FUNCTION public.update_menu_item_availability_on_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is being updated and is not null
  IF NEW.stock IS NOT NULL THEN
    -- If stock is zero or less, set available to false
    IF NEW.stock <= 0 THEN
      NEW.available := false;
    -- Optional: If stock is positive, set available to true
    -- Consider if manual override of 'available = false' is needed.
    -- For now, we'll re-enable if stock increases above 0.
    ELSIF NEW.stock > 0 THEN
       NEW.available := true;
    END IF;
  END IF;

  -- Return the modified row
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment on the function
COMMENT ON FUNCTION public.update_menu_item_availability_on_stock_change()
IS 'Trigger function to automatically set menu-items.available to false when stock reaches 0 or less, and true if stock becomes positive.';

-- Content from 023_create_menu_item_availability_trigger.sql
-- Trigger to update menu_item availability when stock changes
CREATE TRIGGER update_menu_item_availability_trigger
BEFORE UPDATE OF stock ON public.menu-items
FOR EACH ROW
WHEN (OLD.stock IS DISTINCT FROM NEW.stock) -- Only run if stock value actually changes
EXECUTE FUNCTION public.update_menu_item_availability_on_stock_change();

-- Comment on the trigger
COMMENT ON TRIGGER update_menu_item_availability_trigger ON public.menu-items
IS 'Updates the available status based on the stock level before a stock update occurs.';

-- Content from 024_create_decrement_stock_function.sql
-- Function to safely decrement stock for a menu item
CREATE OR REPLACE FUNCTION public.decrement_menu_item_stock(
    p_menu_item_id uuid,
    p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for positive quantity
    IF p_quantity <= 0 THEN
        RAISE WARNING 'Decrement quantity must be positive for menu item %.', p_menu_item_id;
        RETURN; -- Do nothing if quantity is not positive
    END IF;

    -- Update stock only if stock tracking is enabled (stock is not null)
    UPDATE public.menu-items
    SET stock = stock - p_quantity
    WHERE id = p_menu_item_id
      AND stock IS NOT NULL; -- Only decrement if stock is tracked

    -- Optional: Add a check after update to see if stock went negative,
    -- although pre-checks in application logic should ideally prevent this.
    -- Example:
    -- IF FOUND AND (SELECT stock FROM public.menu-items WHERE id = p_menu_item_id) < 0 THEN
    --     RAISE WARNING 'Stock for menu item % went negative after decrement.', p_menu_item_id;
    --     -- Consider corrective action or more robust error handling if needed
    -- END IF;

EXCEPTION
    WHEN OTHERS THEN
        -- Log any unexpected errors during the stock update
        RAISE WARNING 'Error in decrement_menu_item_stock for item %: %', p_menu_item_id, SQLERRM;
        -- Re-raise the exception if you want the calling transaction to fail
        -- RAISE;
END;
$$;

-- Optional: Grant execute permission if needed (adjust role as necessary)
-- GRANT EXECUTE ON FUNCTION public.decrement_menu_item_stock(uuid, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.decrement_menu_item_stock(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.decrement_menu_item_stock(uuid, integer) IS 'Safely decrements the stock count for a given menu item ID, only if stock tracking is enabled (stock is not NULL). Used for order cancellations.';

-- Content from 025_add_ready_at_to_orders.sql
-- Add ready_at column to track when an order becomes ready for pickup
ALTER TABLE public.orders
ADD COLUMN ready_at timestamp with time zone;

COMMENT ON COLUMN public.orders.ready_at IS 'Timestamp indicating when the order status was set to ''ready''.';

-- Content from 026_modify_status_update_functions.sql
-- supabase/migrations/026_modify_status_update_functions.sql

-- Modify function update_order_status_based_on_items (originally from 017)
-- to set ready_at when the order status becomes 'ready'.

CREATE OR REPLACE FUNCTION public.update_order_status_based_on_items(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_statuses order_item_status[];
  total_items integer;
  pending_count integer;
  preparing_count integer;
  ready_count integer;
  delivered_count integer;
  new_order_status order_status;
  current_order_status order_status;
BEGIN
  -- 1. Get all item statuses for the given order
  SELECT array_agg(status), count(*)
  INTO item_statuses, total_items
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- Handle case where order has no items
  IF total_items IS NULL OR total_items = 0 THEN
    RAISE WARNING 'Order % has no items, cannot determine status.', p_order_id;
    RETURN;
  END IF;

  -- 2. Count items in each status category
  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'preparing'),
    count(*) FILTER (WHERE status = 'ready'),
    count(*) FILTER (WHERE status = 'delivered')
  INTO pending_count, preparing_count, ready_count, delivered_count
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- 3. Determine the new overall order status
  IF delivered_count = total_items THEN
    new_order_status := 'completed';
  ELSIF delivered_count > 0 THEN
    new_order_status := 'partially_delivered';
  ELSIF ready_count = total_items THEN
     new_order_status := 'ready'; -- All items are ready
  ELSIF preparing_count > 0 THEN
     new_order_status := 'preparing';
  ELSIF ready_count > 0 THEN
    new_order_status := 'partially_ready';
  ELSIF pending_count = total_items THEN
     SELECT status INTO current_order_status FROM public.orders WHERE id = p_order_id;
     IF current_order_status = 'confirmed' THEN
        new_order_status := 'confirmed';
     ELSE
        new_order_status := 'pending';
     END IF;
  ELSE
     IF preparing_count > 0 THEN
         new_order_status := 'preparing';
     ELSIF ready_count > 0 THEN
         new_order_status := 'partially_ready';
     ELSE
         new_order_status := 'pending';
     END IF;
     RAISE WARNING 'Order % hit fallback status logic. Counts: Pending=%, Preparing=%, Ready=%, Delivered=%, Total=%. Setting status to %',
         p_order_id, pending_count, preparing_count, ready_count, delivered_count, total_items, new_order_status;
  END IF;

  -- 4. Update the order status and set ready_at if applicable
  UPDATE public.orders
  SET
    status = new_order_status,
    updated_at = now(),
    -- Set ready_at only when the status transitions *to* 'ready'
    ready_at = CASE
                 WHEN new_order_status = 'ready' AND status IS DISTINCT FROM 'ready' THEN now()
                 ELSE ready_at -- Keep existing value otherwise
               END
  WHERE id = p_order_id AND status IS DISTINCT FROM new_order_status;

END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.update_order_status_based_on_items(uuid) TO authenticated;


-- Modify function update_order_status_direct (originally from 018)
-- to set ready_at when the order status is directly set to 'ready'.

CREATE OR REPLACE FUNCTION public.update_order_status_direct(
    p_order_id uuid,
    p_new_status public.order_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_caller_vendor_associated boolean;
BEGIN
  -- Security Check: Verify the caller is an associated vendor or placed the POS order
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE oi.order_id = p_order_id
      AND c.vendor_id = auth.uid()
  ) INTO is_caller_vendor_associated;

  IF NOT is_caller_vendor_associated THEN
    IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = p_order_id
        AND o.payment_method = 'cash'
        AND o.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied: Caller (%) is not an associated vendor for order %', auth.uid(), p_order_id;
    END IF;
  END IF;

  -- Proceed with the update if the security check passes
  UPDATE public.orders
  SET
    status = p_new_status,
    updated_at = now(),
    -- Set ready_at only when the status transitions *to* 'ready'
    ready_at = CASE
                 WHEN p_new_status = 'ready' AND status IS DISTINCT FROM 'ready' THEN now()
                 ELSE ready_at -- Keep existing value otherwise
               END
  WHERE id = p_order_id;

  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE WARNING 'Order % not found for direct status update to %.', p_order_id, p_new_status;
    RETURN;
  END IF;

  -- Decrement stock if the new status is 'completed'
  IF p_new_status = 'completed' THEN
    DECLARE
      item_record record;
    BEGIN
      FOR item_record IN
        SELECT menu_item_id, quantity
        FROM public.order_items
        WHERE order_id = p_order_id
      LOOP
        PERFORM public.decrement_menu_item_stock(item_record.menu_item_id, item_record.quantity);
      END LOOP;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error decrementing stock for order % during completion: %', p_order_id, SQLERRM;
    END;
  END IF;

END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.update_order_status_direct(uuid, public.order_status) TO authenticated;

-- Content from 027_create_cancel_overdue_orders_function.sql
-- supabase/migrations/027_create_cancel_overdue_orders_function.sql

-- Function to automatically cancel orders that have been in 'ready' status
-- for more than 30 minutes and haven't been picked up (i.e., status is still 'ready').

CREATE OR REPLACE FUNCTION public.cancel_overdue_pickup_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Necessary to update orders regardless of who runs the job
AS $$
DECLARE
  overdue_order_count integer;
BEGIN
  -- Update orders that are 'ready' and whose 'ready_at' timestamp is older than 30 minutes ago
  WITH updated_orders AS (
    UPDATE public.orders
    SET status = 'cancelled',
        updated_at = now() -- Update the timestamp
    WHERE status = 'ready'
      AND ready_at IS NOT NULL -- Ensure ready_at has been set
      AND ready_at < (now() - interval '30 minutes')
    RETURNING id -- Return the IDs of updated orders
  )
  -- Increment stock for the items in the cancelled orders
  SELECT count(updated_orders.id) INTO overdue_order_count FROM updated_orders;

  IF overdue_order_count > 0 THEN
    DECLARE
      item_record record;
    BEGIN
      FOR item_record IN
        SELECT oi.menu_item_id, oi.quantity
        FROM public.order_items oi
        JOIN updated_orders uo ON oi.order_id = uo.id
        -- No need to check item status here, as the order status was 'ready', implying items weren't 'delivered'
      LOOP
        PERFORM public.increment_menu_item_stock(item_record.menu_item_id, item_record.quantity);
      END LOOP;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error incrementing stock during overdue order cancellation: %', SQLERRM;
    END;

    -- Log how many orders were cancelled
    RAISE LOG 'Cancelled % overdue pickup orders.';
  END IF;

END;
$$;

-- Grant execute permission to the postgres role (or the role that pg_cron runs as)
-- Typically, pg_cron runs as the 'postgres' superuser, which already has permissions.
-- If using a different setup, grant might be needed:
-- GRANT EXECUTE ON FUNCTION public.cancel_overdue_pickup_orders() TO postgres;

-- Note: This function needs to be scheduled to run periodically, e.g., using pg_cron.
-- The scheduling will be handled in the next migration step.

-- Content from 028_enable_pg_cron.sql
-- supabase/migrations/028_enable_pg_cron.sql

-- Enable the pg_cron extension if it's not already enabled.
-- This ensures the 'cron' schema exists before scheduling jobs.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage on the schema to the postgres role (or the role running migrations/cron jobs)
-- Supabase typically handles this, but explicitly granting can prevent permission issues.
GRANT USAGE ON SCHEMA cron TO postgres;

-- Grant necessary permissions for the postgres user to manage cron jobs
-- Adjust the role if your Supabase setup uses a different superuser/admin role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cron TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cron TO postgres;

-- Content from 028_schedule_cancel_overdue_orders.sql
-- supabase/migrations/028_schedule_cancel_overdue_orders.sql

-- This migration schedules the cancel_overdue_pickup_orders function to run periodically.
-- Assumes the pg_cron extension is enabled in the Supabase project.
-- If not enabled, it needs to be enabled via the Supabase Dashboard (Database -> Extensions).

-- Schedule the job to run every 5 minutes
-- The job name 'cancel-overdue-orders' should be unique.
-- The cron syntax '*/5 * * * *' means "at every 5th minute".
SELECT cron.schedule(
    'cancel-overdue-orders', -- Unique name for the cron job
    '*/5 * * * *',           -- Cron schedule: run every 5 minutes
    $$ SELECT public.cancel_overdue_pickup_orders(); $$ -- The command to execute
);

-- Optional: To view scheduled jobs, you can run: SELECT * FROM cron.job;
-- Optional: To unschedule this job if needed later, run: SELECT cron.unschedule('cancel-overdue-orders');

-- Content from 029_schedule_cancel_overdue_orders.sql
-- supabase/migrations/029_schedule_cancel_overdue_orders.sql

-- This migration schedules the cancel_overdue_pickup_orders function to run periodically.
-- It assumes the pg_cron extension has been enabled by the previous migration (028_enable_pg_cron.sql).

-- Schedule the job to run every 5 minutes
-- The job name 'cancel-overdue-orders' should be unique.
-- The cron syntax '*/5 * * * *' means "at every 5th minute".
SELECT cron.schedule(
    'cancel-overdue-orders', -- Unique name for the cron job
    '*/5 * * * *',           -- Cron schedule: run every 5 minutes
    $$ SELECT public.cancel_overdue_pickup_orders(); $$ -- The command to execute
);

-- Optional: To view scheduled jobs, you can run: SELECT * FROM cron.job;
-- Optional: To unschedule this job if needed later, run: SELECT cron.unschedule('cancel-overdue-orders');

-- Content from 030_add_transaction_logging_to_pos.sql
-- Drop the existing function to replace it
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, public.pos_order_item_input[], public.payment_method_type, uuid);

-- Recreate the function with transaction logging added
CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_vendor_user_id uuid,
    p_counter_id uuid,
    p_items public.pos_order_item_input[],
    p_payment_method public.payment_method_type,
    p_student_user_id uuid DEFAULT NULL -- Optional student ID for online payments
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id uuid;
    v_total_price numeric := 0;
    v_input_item public.pos_order_item_input;
    v_menu_item record;
    v_price_at_order numeric;
    v_item_id_to_insert uuid;
    v_quantity_to_insert integer;
    v_spec_instructions_to_insert text;
    v_student_balance numeric;
    v_user_id_for_order_insert uuid; -- User ID to associate with the order record itself
    v_transaction_description text;
BEGIN
    -- Input validation
    IF p_vendor_user_id IS NULL THEN RAISE EXCEPTION 'Vendor user ID cannot be null'; END IF;
    IF p_counter_id IS NULL THEN RAISE EXCEPTION 'Counter ID cannot be null'; END IF;
    IF p_payment_method IS NULL THEN RAISE EXCEPTION 'Payment method cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_payment_method = 'online' AND p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID is required for online payments.'; END IF;

    -- 1. Pre-check loop: Validate items and calculate total price
    FOREACH v_input_item IN ARRAY p_items LOOP
        IF v_input_item.quantity <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive for menu item %', v_input_item.menu_item_id; END IF;
        SELECT id, price, stock, available, counter_id INTO v_menu_item FROM public.menu-items WHERE id = v_input_item.menu_item_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_input_item.menu_item_id; END IF;
        IF v_menu_item.counter_id != p_counter_id THEN RAISE EXCEPTION 'Menu item % does not belong to counter %', v_input_item.menu_item_id, p_counter_id; END IF;
        IF NOT v_menu_item.available THEN RAISE EXCEPTION 'Menu item % is not available', v_input_item.menu_item_id; END IF;
        IF v_menu_item.stock IS NOT NULL AND v_menu_item.stock < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for menu item % (available: %, requested: %)', v_input_item.menu_item_id, v_menu_item.stock, v_input_item.quantity;
        END IF;
        v_total_price := v_total_price + (v_menu_item.price * v_input_item.quantity);
    END LOOP;

    -- 2. Handle payment type specifics (balance check/deduction and setting user ID for order)
    IF p_payment_method = 'online' THEN
        -- Check student balance AND DEDUCT
        SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
        IF v_student_balance IS NULL OR v_student_balance < v_total_price THEN
            RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_total_price;
        END IF;
        UPDATE public.profiles SET balance = balance - v_total_price WHERE id = p_student_user_id;
        v_user_id_for_order_insert := p_student_user_id; -- Associate order with student

        -- *** ADDED: Log student transaction ***
        v_transaction_description := 'Cafeteria Order Purchase (Online)';
        INSERT INTO public.transactions (user_id, amount, type, description, order_id, related_user_id)
        VALUES (p_student_user_id, v_total_price, 'purchase', v_transaction_description, NULL, p_vendor_user_id); -- order_id set later

    ELSE -- Cash payment
        v_user_id_for_order_insert := p_vendor_user_id; -- Associate order with vendor for cash POS
        v_transaction_description := 'POS Cash Sale'; -- Description for vendor transaction
    END IF;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method, student_id) -- Added student_id column
    VALUES (
        v_user_id_for_order_insert,
        v_total_price,
        'completed'::public.order_status, -- POS orders are immediately completed
        now(),
        v_total_price, -- Assuming no tax/subtotal calculation for now
        0,
        p_payment_method,
        CASE WHEN p_payment_method = 'online' THEN p_student_user_id ELSE NULL END -- Store student_id if online
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and update stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        SELECT price INTO v_price_at_order FROM public.menu-items WHERE id = v_input_item.menu_item_id;
        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, p_counter_id, v_spec_instructions_to_insert, 'delivered'::public.order_item_status); -- POS items are immediately delivered
        -- Decrement stock using the dedicated function (safer)
        PERFORM public.decrement_menu_item_stock(v_item_id_to_insert, v_quantity_to_insert);
    END LOOP;

    -- 5. Update Vendor Balance
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_total_price
    WHERE id = p_vendor_user_id;

    -- *** ADDED: Log vendor transaction ***
    INSERT INTO public.transactions (user_id, amount, type, description, order_id, related_user_id)
    VALUES (
        p_vendor_user_id,
        v_total_price,
        'sale', -- Assuming 'sale' type exists
        v_transaction_description, -- Use description set earlier based on payment type
        v_order_id,
        CASE WHEN p_payment_method = 'online' THEN p_student_user_id ELSE NULL END -- Related user is student if online
    );

    -- *** ADDED: Update student transaction with order_id if it was online ***
    IF p_payment_method = 'online' THEN
        UPDATE public.transactions
        SET order_id = v_order_id
        WHERE user_id = p_student_user_id
          AND type = 'purchase'
          AND order_id IS NULL -- Avoid updating unrelated transactions
          AND created_at >= now() - interval '5 seconds'; -- Safety check: only update recent ones
    END IF;


    -- 6. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_pos_order: %', SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;

-- Content from 031_create_increment_stock_function.sql
-- supabase/migrations/031_create_increment_stock_function.sql

-- Function to safely increment stock for a menu item, typically used for cancellations.
CREATE OR REPLACE FUNCTION public.increment_menu_item_stock(
    p_menu_item_id uuid,
    p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for positive quantity
    IF p_quantity <= 0 THEN
        RAISE WARNING 'Increment quantity must be positive for menu item %.', p_menu_item_id;
        RETURN; -- Do nothing if quantity is not positive
    END IF;

    -- Update stock only if stock tracking is enabled (stock is not null)
    UPDATE public.menu-items
    SET stock = stock + p_quantity
    WHERE id = p_menu_item_id
      AND stock IS NOT NULL; -- Only increment if stock is tracked

EXCEPTION
    WHEN OTHERS THEN
        -- Log any unexpected errors during the stock update
        RAISE WARNING 'Error in increment_menu_item_stock for item %: %', p_menu_item_id, SQLERRM;
        -- Re-raise the exception if you want the calling transaction to fail
        -- RAISE;
END;
$$;

-- Optional: Grant execute permission if needed (adjust role as necessary)
-- GRANT EXECUTE ON FUNCTION public.increment_menu_item_stock(uuid, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.increment_menu_item_stock(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.increment_menu_item_stock(uuid, integer) IS 'Safely increments the stock count for a given menu item ID, only if stock tracking is enabled (stock is not NULL). Used for order cancellations.';

-- Content from 032_create_student_order_function.sql
-- supabase/migrations/032_create_student_order_function.sql

-- Input type for order items (might exist from POS function)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_order_item_input') THEN
        CREATE TYPE public.pos_order_item_input AS (
            menu_item_id uuid,
            quantity integer,
            special_instructions text
        );
        GRANT USAGE ON TYPE public.pos_order_item_input TO authenticated;
    END IF;
END $$;

-- Function to create a student order atomically
CREATE OR REPLACE FUNCTION public.create_student_order(
    p_student_user_id uuid,         -- The user ID of the student creating the order
    p_items pos_order_item_input[], -- Array of items being ordered
    p_pickup_time timestamptz,      -- Requested pickup time
    p_subtotal numeric,             -- Calculated subtotal (passed from client)
    p_tax numeric,                  -- Calculated tax (passed from client)
    p_total_price numeric           -- Calculated total price (passed from client)
)
RETURNS uuid -- Returns the ID of the newly created order
LANGUAGE plpgsql
SECURITY DEFINER -- To handle balance and stock updates atomically
AS $$
DECLARE
    v_order_id uuid;
    v_input_item public.pos_order_item_input;
    v_menu_item record; -- Used to fetch item details like price, stock, counter_id
    v_price_at_order numeric;
    v_item_id_to_insert uuid;
    v_quantity_to_insert integer;
    v_spec_instructions_to_insert text;
    v_student_balance numeric;
    v_counter_id_for_item uuid; -- To store counter_id for insertion
BEGIN
    -- Input validation
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_pickup_time IS NULL THEN RAISE EXCEPTION 'Pickup time cannot be null'; END IF;
    IF p_total_price <= 0 THEN RAISE EXCEPTION 'Total price must be positive'; END IF;

    -- 1. Pre-check loop: Validate items (availability, stock)
    FOREACH v_input_item IN ARRAY p_items LOOP
        IF v_input_item.quantity <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive for menu item %', v_input_item.menu_item_id; END IF;

        SELECT id, stock, available, counter_id
        INTO v_menu_item
        FROM public.menu-items
        WHERE id = v_input_item.menu_item_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_input_item.menu_item_id; END IF;
        IF NOT v_menu_item.available THEN RAISE EXCEPTION 'Menu item % is not available', v_input_item.menu_item_id; END IF;
        IF v_menu_item.stock IS NOT NULL AND v_menu_item.stock < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for menu item % (available: %, requested: %)', v_input_item.menu_item_id, v_menu_item.stock, v_input_item.quantity;
        END IF;
    END LOOP;

    -- 2. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < p_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), p_total_price;
    END IF;
    UPDATE public.profiles SET balance = balance - p_total_price WHERE id = p_student_user_id;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method)
    VALUES (
        p_student_user_id,
        p_total_price,
        'pending'::public.order_status, -- Student orders start as pending
        p_pickup_time,
        p_subtotal,
        p_tax,
        'online'::public.payment_method_type -- Student orders are online
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price and counter_id again inside transaction for consistency
        SELECT price, counter_id
        INTO v_price_at_order, v_counter_id_for_item
        FROM public.menu-items
        WHERE id = v_input_item.menu_item_id;

        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;

        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, v_counter_id_for_item, v_spec_instructions_to_insert, 'pending'::public.order_item_status); -- Items start pending

        -- Decrement stock directly using UPDATE
        UPDATE public.menu-items
        SET stock = stock - v_quantity_to_insert
        WHERE id = v_item_id_to_insert AND stock IS NOT NULL;
    END LOOP;

    -- 5. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_student_order for user %: %', p_student_user_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_student_order(uuid, pos_order_item_input[], timestamptz, numeric, numeric, numeric) TO authenticated;

COMMENT ON FUNCTION public.create_student_order(uuid, pos_order_item_input[], timestamptz, numeric, numeric, numeric) IS 'Creates a student order atomically, validates items, deducts balance, inserts order/items, and decrements stock.';

-- Content from 033_add_club_role_and_events.sql
-- Migration Step 1: Add 'club' to user_role ENUM
-- Check if the type exists and the value doesn't, then add it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'club';
    END IF;
END $$;

-- Migration Step 2: Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    location text,
    image_path text, -- For event banner/image
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_club_profile
        FOREIGN KEY(club_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE -- If the club profile is deleted, remove their events
);

-- Migration Step 3: Add updated_at trigger to events table
-- Ensure the trigger function exists before creating the trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
        CREATE TRIGGER set_events_timestamp
        BEFORE UPDATE ON public.events
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();
    ELSE
        RAISE WARNING 'Function trigger_set_timestamp() not found. Skipping trigger creation for events table.';
    END IF;
END $$;

-- Migration Step 4: Create is_club() helper function
CREATE OR REPLACE FUNCTION public.is_club()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Important for use in RLS policies
SET search_path = public -- Ensure it uses the public schema
AS $$
BEGIN
  -- Check if the user exists in profiles and has the 'club' role
  RETURN EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'club'::public.user_role
  );
END;
$$;

-- Migration Step 5: Enable RLS and add policies for events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access
DROP POLICY IF EXISTS "Allow admin full access on events" ON public.events;
CREATE POLICY "Allow admin full access on events"
ON public.events FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 2: Clubs can manage (CRUD) their own events
DROP POLICY IF EXISTS "Allow clubs to manage their own events" ON public.events;
CREATE POLICY "Allow clubs to manage their own events"
ON public.events FOR ALL
USING (is_club() AND club_id = auth.uid())
WITH CHECK (is_club() AND club_id = auth.uid());

-- Policy 3: Authenticated users can view events
DROP POLICY IF EXISTS "Allow authenticated users to view events" ON public.events;
CREATE POLICY "Allow authenticated users to view events"
ON public.events FOR SELECT
USING (auth.role() = 'authenticated');

-- Migration Step 6: Modify approve_vendor_application function
CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER -- Keep as DEFINER if it needs elevated privileges
 SET search_path = public
AS $function$
DECLARE
  is_caller_admin boolean;
  v_business_type text;
  v_target_role public.user_role; -- Variable for the role to assign
BEGIN
  -- 1. Verify the caller is an admin
  SELECT public.is_admin() INTO is_caller_admin;
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an admin.';
  END IF;

  -- Get the business type from the application
  SELECT business_type INTO v_business_type
  FROM public.vendor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Vendor application with ID % not found.', p_application_id;
      RETURN; -- Exit if application not found
  END IF;

  -- Determine the target role based on business type
  -- Ensure 'club' value exists before assigning it
  IF v_business_type = 'Student Club' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
      v_target_role := 'club'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor if not 'Student Club' or if 'club' enum doesn't exist yet
  END IF;

  -- 2. Update vendor_applications table
  UPDATE public.vendor_applications
  SET
    status = 'approved',
    reviewer_notes = p_reviewer_notes,
    reviewed_at = now()
  WHERE id = p_application_id;

  -- 3. Update profiles table with the determined role
  UPDATE public.profiles
  SET
    role = v_target_role, -- Use the determined role
    status = 'active'
  WHERE id = p_user_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Profile with user ID % not found during approval.', p_user_id;
  END IF;

END;
$function$;

-- Migration Step 7: Modify handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER -- Keep as DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role public.user_role := 'student'; -- Default role
  profile_stat public.profile_status := 'active'; -- Default status
  is_applying_for_vendor boolean := false;
  is_applying_for_club boolean := false;
BEGIN
  -- Check metadata for application type safely
  is_applying_for_vendor := (NEW.raw_user_meta_data ->> 'is_vendor_application')::boolean;
  is_applying_for_club := (NEW.raw_user_meta_data ->> 'is_club_application')::boolean;

  -- Determine role and status based on application flags
  -- Ensure 'club' value exists before assigning it
  IF is_applying_for_club AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
    user_role := 'club';
    profile_stat := 'pending_approval';
  ELSIF is_applying_for_vendor THEN -- Check vendor *after* club
    user_role := 'vendor';
    profile_stat := 'pending_approval';
  END IF;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, student_id, phone_number, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'phone',
    user_role,
    profile_stat
  );
  RETURN NEW;
END;
$function$;

-- Content from 034_fix_club_approval_role.sql
-- Migration Step: Fix approve_vendor_application to handle business_type comparison robustly

CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  is_caller_admin boolean;
  v_business_type text;
  v_target_role public.user_role; -- Variable for the role to assign
BEGIN
  -- 1. Verify the caller is an admin
  SELECT public.is_admin() INTO is_caller_admin;
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an admin.';
  END IF;

  -- Get the business type from the application
  SELECT business_type INTO v_business_type
  FROM public.vendor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Vendor application with ID % not found.', p_application_id;
      RETURN; -- Exit if application not found
  END IF;

  -- Determine the target role based on business type value (e.g., 'club')
  -- Compare against the actual value saved from the form ('club'), not the label ('Student Club')
  IF lower(trim(v_business_type)) = 'club' AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'club') THEN
      v_target_role := 'club'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor if business_type is not 'club'
  END IF;

  -- 2. Update vendor_applications table
  UPDATE public.vendor_applications
  SET
    status = 'approved',
    reviewer_notes = p_reviewer_notes,
    reviewed_at = now()
  WHERE id = p_application_id;

  -- 3. Update profiles table with the determined role
  UPDATE public.profiles
  SET
    role = v_target_role, -- Use the determined role
    status = 'active'
  WHERE id = p_user_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Profile with user ID % not found during approval.', p_user_id;
  END IF;

END;
$function$;

COMMENT ON FUNCTION public.approve_vendor_application(uuid, uuid, text) IS 'Approves a vendor/club application, sets the correct role (vendor or club) based on business_type (case-insensitive), and activates the user profile.';

-- Content from 035_enhance_events_add_registrations.sql
-- Migration: Enhance Events Table, Add Registrations, and Auto-Cancellation

BEGIN; -- Wrap in transaction

-- Step 1: Modify the existing 'events' table

-- Rename columns first to avoid conflicts if adding columns with old names
ALTER TABLE public.events RENAME COLUMN name TO title;
ALTER TABLE public.events RENAME COLUMN image_path TO banner_image_path;
ALTER TABLE public.events RENAME COLUMN start_time TO event_datetime;
ALTER TABLE public.events RENAME COLUMN location TO venue;

-- Add new columns to the 'events' table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS total_seats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10, 2) NULL DEFAULT 0.00, -- Allow NULL, default 0
  ADD COLUMN IF NOT EXISTS sponsors text[] NULL,
  ADD COLUMN IF NOT EXISTS is_seminar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guests text[] NULL,
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.events.title IS 'The main title of the event.';
COMMENT ON COLUMN public.events.banner_image_path IS 'Path to the event banner image in storage.';
COMMENT ON COLUMN public.events.event_datetime IS 'The starting date and time of the event.';
COMMENT ON COLUMN public.events.end_time IS 'The ending date and time of the event (optional).';
COMMENT ON COLUMN public.events.venue IS 'The location/venue where the event takes place.';
COMMENT ON COLUMN public.events.total_seats IS 'Total number of available seats for the event.';
COMMENT ON COLUMN public.events.is_paid IS 'Flag indicating if the event requires payment for registration.';
COMMENT ON COLUMN public.events.payment_amount IS 'The amount required for paid events (if is_paid is true).';
COMMENT ON COLUMN public.events.sponsors IS 'Array of sponsor names or identifiers.';
COMMENT ON COLUMN public.events.is_seminar IS 'Flag indicating if the event is specifically a seminar.';
COMMENT ON COLUMN public.events.guests IS 'Array of guest speakers or notable attendees.';
COMMENT ON COLUMN public.events.registration_deadline IS 'The date and time after which registration is no longer possible (optional).';


-- Step 2: Create the event_registration_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_registration_status') THEN
        CREATE TYPE public.event_registration_status AS ENUM (
          'reserved',
          'paid',
          'cancelled',
          'attended'
        );
        COMMENT ON TYPE public.event_registration_status IS 'Status of a student registration for an event.';
    END IF;
END $$;


-- Step 3: Create the 'event_registrations' table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_time timestamptz NOT NULL DEFAULT now(),
    status public.event_registration_status NOT NULL DEFAULT 'reserved',
    payment_intent_id text NULL, -- For tracking payment gateway transactions
    paid_at timestamptz NULL,    -- Timestamp when payment was confirmed
    expires_at timestamptz NULL, -- Timestamp when a 'reserved' status expires if unpaid (for paid events)
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_student_id ON public.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_expires_at ON public.event_registrations(expires_at);

-- Add comments
COMMENT ON TABLE public.event_registrations IS 'Tracks student registrations for events.';
COMMENT ON COLUMN public.event_registrations.status IS 'The current status of the registration.';
COMMENT ON COLUMN public.event_registrations.payment_intent_id IS 'Identifier from the payment gateway, if applicable.';
COMMENT ON COLUMN public.event_registrations.paid_at IS 'Timestamp when the registration was successfully paid for.';
COMMENT ON COLUMN public.event_registrations.expires_at IS 'Timestamp when a reservation expires if not paid (only for paid events).';

-- Add updated_at trigger to event_registrations
-- Ensure the trigger function exists before creating the trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
        CREATE TRIGGER set_event_registrations_timestamp
        BEFORE UPDATE ON public.event_registrations
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_timestamp();
    ELSE
        RAISE WARNING 'Function trigger_set_timestamp() not found. Skipping trigger creation for event_registrations table.';
    END IF;
END $$;

-- Step 4: Enable RLS and add policies for event_registrations table
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access
DROP POLICY IF EXISTS "Allow admin full access on event_registrations" ON public.event_registrations;
CREATE POLICY "Allow admin full access on event_registrations"
ON public.event_registrations FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 2: Students can manage (create, view, potentially cancel 'reserved') their own registrations
DROP POLICY IF EXISTS "Allow students to manage own event registrations" ON public.event_registrations;
CREATE POLICY "Allow students to manage own event registrations"
ON public.event_registrations FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
-- Note: More granular checks (e.g., preventing update to 'paid' by student) should happen in application logic or DB functions.

-- Policy 3: Clubs can view registrations for their own events
DROP POLICY IF EXISTS "Allow clubs to view registrations for their events" ON public.event_registrations;
CREATE POLICY "Allow clubs to view registrations for their events"
ON public.event_registrations FOR SELECT
USING (
  is_club() AND
  event_id IN (SELECT id FROM public.events WHERE club_id = auth.uid())
);
-- Note: Clubs might need UPDATE permission later (e.g., to mark 'attended'), requiring a separate policy or function.


-- Step 5: Create the auto-cancellation function
CREATE OR REPLACE FUNCTION public.cancel_expired_event_reservations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cancelled_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.event_registrations
    SET status = 'cancelled'
    WHERE
      status = 'reserved'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING id -- Return IDs of cancelled registrations
  )
  SELECT count(*) INTO cancelled_count FROM expired;

  IF cancelled_count > 0 THEN
    RAISE LOG 'Cancelled % expired event reservations.', cancelled_count;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in cancel_expired_event_reservations: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.cancel_expired_event_reservations() IS 'Sets the status to "cancelled" for event registrations that were "reserved" for paid events and whose expiration timestamp has passed.';


-- Step 6: Schedule the auto-cancellation function using pg_cron
-- Ensure pg_cron is enabled (usually done once per project, see migration 028)
-- Schedule to run every 5 minutes
SELECT cron.schedule(
  'cancel-expired-event-reservations', -- Job name (unique)
  '*/5 * * * *', -- Cron syntax for every 5 minutes
  $$ SELECT public.cancel_expired_event_reservations(); $$
);

-- Optional: Unschedule previous versions if job name changed
-- SELECT cron.unschedule('old-job-name');

COMMIT; -- End transaction

-- Content from 036_add_event_payment_function.sql
-- Migration to add function for registering and paying for events via balance

BEGIN;

-- Drop function if it exists to ensure clean creation/update
DROP FUNCTION IF EXISTS public.register_and_pay_event(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.register_and_pay_event(p_event_id uuid)
RETURNS public.event_registrations -- Return the created/updated registration record
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Runs with the privileges of the function owner (usually postgres)
SET search_path = public -- Ensure correct schema context
AS $$
DECLARE
  v_student_id uuid := auth.uid(); -- Get the ID of the currently authenticated user
  v_event record;
  v_student_profile record;
  v_existing_registration public.event_registrations;
  v_registration_count integer;
  v_new_registration public.event_registrations;
BEGIN
  -- 1. Input Validation
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: User must be logged in to register.';
  END IF;
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Event ID cannot be null.';
  END IF;

  -- 2. Fetch Event Details (Lock the row for consistency if needed, though less critical here)
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Event % not found.', p_event_id;
  END IF;

  -- 3. Fetch Student Profile and Balance (Lock the row for update)
  SELECT * INTO v_student_profile FROM public.profiles WHERE id = v_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Student profile % not found.', v_student_id;
  END IF;

  -- 4. Check if Event is Paid
  IF NOT v_event.is_paid OR v_event.payment_amount IS NULL OR v_event.payment_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_OPERATION: Event % is not a paid event or amount is invalid.', p_event_id;
  END IF;

  -- 5. Check Student Balance
  IF v_student_profile.balance < v_event.payment_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Insufficient balance. Required: %, Available: %', v_event.payment_amount, v_student_profile.balance;
  END IF;

  -- 6. Check Registration Deadline
  IF v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline < now() THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration deadline has passed.';
  END IF;

  -- 7. Check Existing Registration (Lock the potential row)
  SELECT * INTO v_existing_registration
  FROM public.event_registrations
  WHERE event_id = p_event_id AND student_id = v_student_id
  FOR UPDATE; -- Lock if exists

  IF v_existing_registration IS NOT NULL AND v_existing_registration.status <> 'cancelled' THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED: Already registered for this event with status %.', v_existing_registration.status;
  END IF;

  -- 8. Check Seat Availability (Count active registrations)
  SELECT count(*) INTO v_registration_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status IN ('reserved', 'paid');

  IF v_event.total_seats > 0 AND v_registration_count >= v_event.total_seats THEN
    RAISE EXCEPTION 'SEATS_FULL: No more seats available for this event.';
  END IF;

  -- 9. Deduct Balance from Student
  UPDATE public.profiles
  SET balance = balance - v_event.payment_amount
  WHERE id = v_student_id;

  -- 10. Insert or Update Registration
  IF v_existing_registration IS NOT NULL AND v_existing_registration.status = 'cancelled' THEN
    -- Update the cancelled registration to 'paid'
    UPDATE public.event_registrations
    SET
      status = 'paid',
      paid_at = now(),
      registration_time = now(), -- Reset registration time? Optional.
      expires_at = NULL, -- Clear expiration for paid status
      updated_at = now()
    WHERE id = v_existing_registration.id
    RETURNING * INTO v_new_registration;
  ELSE
    -- Insert new registration
    INSERT INTO public.event_registrations (event_id, student_id, status, paid_at, payment_intent_id)
    VALUES (p_event_id, v_student_id, 'paid', now(), NULL) -- Set status directly to 'paid'
    RETURNING * INTO v_new_registration;
  END IF;

  -- 11. TODO: Optionally, credit the club's balance (requires club balance logic)
  -- UPDATE public.profiles SET balance = balance + v_event.payment_amount WHERE id = v_event.club_id;

  -- 12. Return the new/updated registration record
  RETURN v_new_registration;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in register_and_pay_event for event %, student %: %', p_event_id, v_student_id, SQLERRM;
    -- Re-raise the original exception to ensure transaction rollback and inform the client
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.register_and_pay_event(uuid) IS 'Registers the calling user for a paid event, deducts the fee from their balance, and returns the registration record. Performs checks for funds, deadlines, seats, and existing registration.';

COMMIT;

-- Content from 036_create_marketplace_module.sql
-- Migration: Create Marketplace Module

BEGIN;

-- 1. Add 'marketplace_operator' to user_role ENUM
-- Check if the type exists and the value doesn't, then add it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'marketplace_operator';
    ELSE
        RAISE WARNING 'Type public.user_role does not exist, skipping alteration.';
    END IF;
END $$;

-- Commit the user_role enum change before proceeding
COMMIT;
BEGIN;

-- 2. Define transaction_type ENUM if it doesn't exist and add marketplace transaction types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM (
            'cafeteria_purchase_debit',
            'cafeteria_sale_credit',
            'event_payment_debit',
            'event_payment_credit',
            'wallet_top_up',
            'refund',
            'marketplace_purchase_debit',
            'marketplace_sale_credit'
        );
        RAISE NOTICE 'Created public.transaction_type enum.';
    ELSE
        ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'marketplace_purchase_debit';
        ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'marketplace_sale_credit';
        RAISE NOTICE 'Added values to public.transaction_type enum.';
    END IF;
END $$;

-- Commit the transaction_type enum change before proceeding
COMMIT;
BEGIN;

-- 3. Create storefronts Table
CREATE TABLE IF NOT EXISTS public.storefronts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT uq_storefronts_operator_id UNIQUE (operator_id),
    name text NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add the unique constraint if it doesn't exist (safeguard)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_storefronts_operator_id' AND conrelid = 'public.storefronts'::regclass) THEN
        ALTER TABLE public.storefronts ADD CONSTRAINT uq_storefronts_operator_id UNIQUE (operator_id);
        RAISE NOTICE 'Added unique constraint uq_storefronts_operator_id to storefronts table.';
    ELSE
        RAISE NOTICE 'Unique constraint uq_storefronts_operator_id already exists on storefronts table.';
    END IF;
END $$;

COMMENT ON TABLE public.storefronts IS 'Stores information about individual student-run marketplaces (campus stores).';
COMMENT ON COLUMN public.storefronts.operator_id IS 'The profile ID of the student operating this storefront (role: marketplace_operator).';

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_storefronts ON public.storefronts;
CREATE TRIGGER set_timestamp_storefronts
BEFORE UPDATE ON public.storefronts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for storefronts
ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storefronts
DROP POLICY IF EXISTS "Allow marketplace operators to manage their own storefronts" ON public.storefronts;
CREATE POLICY "Allow marketplace operators to manage their own storefronts"
    ON public.storefronts FOR ALL
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND operator_id = auth.uid() )
    WITH CHECK ( operator_id = auth.uid() );

DROP POLICY IF EXISTS "Allow authenticated users to view active storefronts" ON public.storefronts;
CREATE POLICY "Allow authenticated users to view active storefronts"
    ON public.storefronts FOR SELECT
    USING ( auth.role() = 'authenticated' AND is_active = true );

DROP POLICY IF EXISTS "Allow admin full access on storefronts" ON public.storefronts;
CREATE POLICY "Allow admin full access on storefronts"
    ON public.storefronts FOR ALL
    USING (is_admin());


-- 4. Create marketplace_products Table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    category text,
    images text[],
    stock_quantity integer CHECK (stock_quantity >= 0),
    attributes jsonb,
    is_available boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_products IS 'Products offered by student storefronts.';
COMMENT ON COLUMN public.marketplace_products.storefront_id IS 'The storefront offering this product.';
COMMENT ON COLUMN public.marketplace_products.attributes IS 'Product attributes like size, color, etc. (e.g., {\"size\": [\"S\", \"M\"], \"color\": [\"Red\", \"Blue\"]})';

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_marketplace_products ON public.marketplace_products;
CREATE TRIGGER set_timestamp_marketplace_products
BEFORE UPDATE ON public.marketplace_products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_products
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_products
DROP POLICY IF EXISTS "Allow marketplace operators to manage their products" ON public.marketplace_products;
CREATE POLICY "Allow marketplace operators to manage their products"
    ON public.marketplace_products FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    )
    WITH CHECK (
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    );

DROP POLICY IF EXISTS "Allow authenticated users to view available marketplace products" ON public.marketplace_products;
CREATE POLICY "Allow authenticated users to view available marketplace products"
    ON public.marketplace_products FOR SELECT
    USING ( auth.role() = 'authenticated' AND is_available = true );

DROP POLICY IF EXISTS "Allow admin full access on marketplace_products" ON public.marketplace_products;
CREATE POLICY "Allow admin full access on marketplace_products"
    ON public.marketplace_products FOR ALL
    USING (is_admin());


-- 5. Create marketplace_order_status ENUM
DROP TYPE IF EXISTS public.marketplace_order_status CASCADE;
CREATE TYPE public.marketplace_order_status AS ENUM (
    'pending_payment',
    'processing',
    'ready_for_pickup', -- If applicable
    'shipped',          -- If applicable
    'delivered',
    'cancelled_by_student',
    'cancelled_by_operator',
    'refunded'
);
-- Commit the marketplace_order_status enum change before proceeding
COMMIT;
BEGIN;

-- 6. Create marketplace_orders Table
DROP TABLE IF EXISTS public.marketplace_orders CASCADE;
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Student who placed order
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE RESTRICT, -- Storefront order belongs to
    total_price numeric NOT NULL CHECK (total_price >= 0),
    shipping_address jsonb, -- For shippable goods, NULL for digital/pickup
    status public.marketplace_order_status NOT NULL DEFAULT 'pending_payment',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_orders IS 'Orders placed by students for marketplace products.';
COMMENT ON COLUMN public.marketplace_orders.student_user_id IS 'The student who made the purchase.';
COMMENT ON COLUMN public.marketplace_orders.storefront_id IS 'The storefront from which the items were ordered.';
COMMENT ON COLUMN public.marketplace_orders.shipping_address IS 'Shipping address if applicable (e.g., {\"addressLine1\": \"...", \"city\": \"..."}).';


-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_marketplace_orders ON public.marketplace_orders;
CREATE TRIGGER set_timestamp_marketplace_orders
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_orders
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_orders
DROP POLICY IF EXISTS "Students can manage their own marketplace orders" ON public.marketplace_orders;
CREATE POLICY "Students can manage their own marketplace orders"
    ON public.marketplace_orders FOR ALL
    USING ( student_user_id = auth.uid() )
    WITH CHECK ( student_user_id = auth.uid() );

DROP POLICY IF EXISTS "Marketplace operators can manage orders for their storefronts" ON public.marketplace_orders;
CREATE POLICY "Marketplace operators can manage orders for their storefronts"
    ON public.marketplace_orders FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    )
    WITH CHECK (
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    );

DROP POLICY IF EXISTS "Allow admin full access on marketplace_orders" ON public.marketplace_orders;
CREATE POLICY "Allow admin full access on marketplace_orders"
    ON public.marketplace_orders FOR ALL
    USING (is_admin());


-- 7. Create marketplace_order_items Table
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
    marketplace_product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE RESTRICT, -- Prevent product deletion if in an order
    quantity integer NOT NULL CHECK (quantity > 0),
    price_at_purchase numeric NOT NULL CHECK (price_at_purchase >= 0),
    selected_attributes jsonb, -- e.g., {"size": "M", "color": "Red"}
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now() -- Though items usually don't update after order
);

COMMENT ON TABLE public.marketplace_order_items IS 'Individual items within a student marketplace order.';
COMMENT ON COLUMN public.marketplace_order_items.selected_attributes IS 'Specific attributes of the product chosen by the student.';

-- Apply updated_at trigger (though less likely to be updated)
DROP TRIGGER IF EXISTS set_timestamp_marketplace_order_items ON public.marketplace_order_items;
CREATE TRIGGER set_timestamp_marketplace_order_items
BEFORE UPDATE ON public.marketplace_order_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_order_items
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_order_items
-- Inherits access through order_id and product_id relationships with RLS on parent tables.
-- Students can see items of their orders. Operators can see items for their storefront's orders.
DROP POLICY IF EXISTS "Students can view their marketplace order items" ON public.marketplace_order_items;
CREATE POLICY "Students can view their marketplace order items"
    ON public.marketplace_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_orders mo
            WHERE mo.id = marketplace_order_id AND mo.student_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Marketplace operators can view their order items" ON public.marketplace_order_items;
CREATE POLICY "Marketplace operators can view their order items"
    ON public.marketplace_order_items FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        EXISTS (
            SELECT 1 FROM public.marketplace_orders mo
            JOIN public.storefronts s ON mo.storefront_id = s.id
            WHERE mo.id = marketplace_order_id AND s.operator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admin full access on marketplace_order_items" ON public.marketplace_order_items;
CREATE POLICY "Allow admin full access on marketplace_order_items"
    ON public.marketplace_order_items FOR ALL
    USING (is_admin());

-- Grant USAGE on new types to authenticated users
GRANT USAGE ON TYPE public.marketplace_order_status TO authenticated;

-- Grant necessary permissions on new tables to the 'authenticated' and other roles as per policies
-- For storefronts
GRANT SELECT ON public.storefronts TO authenticated;
GRANT INSERT (operator_id, name, description, logo_url, banner_url, is_active),
      UPDATE (name, description, logo_url, banner_url, is_active),
      DELETE
ON public.storefronts TO authenticated; -- Policies will restrict actual operations

-- For marketplace_products
GRANT SELECT ON public.marketplace_products TO authenticated;
GRANT INSERT (storefront_id, name, description, price, category, images, stock_quantity, attributes, is_available),
      UPDATE (name, description, price, category, images, stock_quantity, attributes, is_available),
      DELETE
ON public.marketplace_products TO authenticated; -- Policies will restrict

-- For marketplace_orders
GRANT SELECT ON public.marketplace_orders TO authenticated;
GRANT INSERT (student_user_id, storefront_id, total_price, shipping_address, status),
      UPDATE (status, shipping_address), -- Students/Operators might update status/shipping
      DELETE -- Students/Operators might cancel
ON public.marketplace_orders TO authenticated; -- Policies will restrict

-- For marketplace_order_items
GRANT SELECT ON public.marketplace_order_items TO authenticated;
-- Generally, order items are not directly inserted/updated/deleted by users after order creation via controller.
-- INSERT is handled by function.

-- Make sure helper functions are callable by authenticated users if used in RLS and not SECURITY DEFINER
-- is_admin(), is_student(), is_vendor(), is_club() were already granted in 004_cafeteria_rls_policies.sql
-- If new helper functions are created for 'marketplace_operator', grant them similarly.

COMMIT;

-- Content from 037_add_club_personalization_fields.sql
-- Add banner_url and description columns to profiles table for club personalization

ALTER TABLE public.profiles
ADD COLUMN banner_url TEXT NULL,
ADD COLUMN description TEXT NULL;

-- Optional: Add comments to the new columns for clarity
COMMENT ON COLUMN public.profiles.banner_url IS 'URL for the club''s banner image.';
COMMENT ON COLUMN public.profiles.description IS 'Description of the club.';

-- Note: RLS policies might need adjustment separately if needed
-- to explicitly allow viewing/updating these columns based on roles.
-- The existing "Users can update own profile" policy might cover updates,
-- but SELECT policies might need review for public visibility if required.

-- Content from 037_marketplace_operator_functions.sql
-- Migration: Add marketplace operator functions and update approval logic

BEGIN;

-- 1. Create is_marketplace_operator() helper function
CREATE OR REPLACE FUNCTION public.is_marketplace_operator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'marketplace_operator'::public.user_role
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_marketplace_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketplace_operator() TO service_role; -- Or anon if needed for RLS on public views

-- 2. Modify approve_vendor_application function to handle 'Campus Store'
--    and assign 'marketplace_operator' role.
--    It also creates a storefront record for the new marketplace operator.
CREATE OR REPLACE FUNCTION public.approve_vendor_application(p_application_id uuid, p_user_id uuid, p_reviewer_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_caller_admin boolean;
  v_application record;
  v_target_role public.user_role;
BEGIN
  -- 1. Verify the caller is an admin
  SELECT public.is_admin() INTO is_caller_admin;
  IF NOT is_caller_admin THEN
    RAISE EXCEPTION 'Permission denied: Caller is not an admin.';
  END IF;

  -- Get the application details
  SELECT * INTO v_application
  FROM public.vendor_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Vendor application with ID % not found.', p_application_id;
      RETURN; -- Exit if application not found
  END IF;

  -- Determine the target role based on business type
  IF lower(trim(v_application.business_type)) = 'club' THEN
      v_target_role := 'club'::public.user_role;
  ELSIF lower(trim(v_application.business_type)) = 'campus_store' THEN -- MODIFIED HERE to check for 'campus_store'
      v_target_role := 'marketplace_operator'::public.user_role;
  ELSE
      v_target_role := 'vendor'::public.user_role; -- Default to vendor for other types
  END IF;

  -- 2. Update vendor_applications table
  UPDATE public.vendor_applications
  SET
    status = 'approved',
    reviewer_notes = p_reviewer_notes,
    reviewed_at = now()
  WHERE id = p_application_id;

  -- 3. Update profiles table with the determined role and active status
  UPDATE public.profiles
  SET
    role = v_target_role,
    status = 'active'::public.profile_status
  WHERE id = p_user_id;

  IF NOT FOUND THEN
      RAISE WARNING 'Profile with user ID % not found during approval.', p_user_id;
      -- Potentially rollback or handle error more gracefully
      RETURN;
  END IF;

  -- 4. If approved as a marketplace_operator, create a default storefront for them
  IF v_target_role = 'marketplace_operator'::public.user_role THEN
    INSERT INTO public.storefronts (operator_id, name, description, is_active)
    VALUES (
        p_user_id,
        v_application.business_name || ' Store', -- Default name
        'Welcome to ' || v_application.business_name || '''s new campus store!', -- MODIFIED HERE: Escaped single quote
        true
    )
    ON CONFLICT ON CONSTRAINT uq_storefronts_operator_id DO NOTHING; -- Avoid error if a storefront already exists for this operator
    RAISE NOTICE 'Created default storefront for marketplace operator %', p_user_id;
  END IF;

END;
$function$;

-- Ensure the function owner is appropriate, typically postgres or the admin role.
-- The SECURITY DEFINER clause means it runs with the permissions of the user who defined it.

COMMIT;

-- Content from 038_add_club_profile_select_policy.sql
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

-- Content from 038_create_marketplace_order_function.sql
-- Migration: Create marketplace order function

BEGIN;

-- Type for input items in create_marketplace_order
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_order_item_input' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.marketplace_order_item_input AS (
            product_id uuid,
            quantity integer,
            selected_attributes jsonb -- e.g. {"size": "Large", "color": "Red"}
        );
        RAISE NOTICE 'Created public.marketplace_order_item_input type.';
    ELSE
        RAISE NOTICE 'public.marketplace_order_item_input type already exists.';
    END IF;
END $$;

GRANT USAGE ON TYPE public.marketplace_order_item_input TO authenticated;

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric, -- Total price as calculated by the client, for server-side validation
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL -- Added new parameter
)
RETURNS uuid -- Returns the new marketplace_order_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record; -- For fetching product details
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric; -- Potentially include taxes/fees later if needed
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes) -- Added student_notes
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status, -- Or 'pending_payment' if further steps required before processing
        p_student_notes -- Use the new parameter
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price again inside transaction for consistency, though already fetched for calculation
        SELECT price INTO v_price_at_order
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        INSERT INTO public.marketplace_order_items (order_id, product_id, quantity, price_at_purchase, selected_attributes) -- Corrected column names
        VALUES (v_order_id, v_input_item.product_id, v_input_item.quantity, v_price_at_order, v_input_item.selected_attributes);

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) TO authenticated; -- Added new parameter type to GRANT

COMMIT;

-- Content from 039_add_club_banner_storage_rls.sql
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

-- Content from 039_create_marketplace_order_tables.sql
-- Migration: Create Marketplace Order Tables and Status ENUM

BEGIN;

-- 1. Robustly create/update marketplace_order_status ENUM type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_order_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.marketplace_order_status AS ENUM (
            'pending_payment',
            'pending_confirmation',
            'processing',
            'shipped',
            'ready_for_pickup',
            'completed',
            'cancelled_by_student',
            'cancelled_by_operator',
            'refunded'
        );
        RAISE NOTICE 'Created public.marketplace_order_status enum.';
    ELSE
        -- Add values if they don't exist. Order might matter for display in some tools, but not for functionality.
        -- The error is for 'pending_confirmation', so ensuring it exists is key.
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'pending_payment';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'processing';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'shipped';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'completed';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'cancelled_by_student';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'cancelled_by_operator';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'refunded';
        RAISE NOTICE 'Ensured all values exist in public.marketplace_order_status enum.';
    END IF;
END $$;

COMMIT; -- Commit the ENUM changes
BEGIN;  -- Start a new transaction for subsequent operations

-- 2. Create marketplace_orders Table
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- So order history remains if student profile deleted
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE RESTRICT, -- Operator should resolve orders before deleting storefront

    total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
    shipping_address jsonb, -- Can store structured address details or pickup instructions

    status public.marketplace_order_status NOT NULL DEFAULT 'pending_confirmation',

    -- Optional: Tracking numbers, notes, etc.
    operator_notes text,
    student_notes text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conditionally add student_notes and operator_notes columns if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_orders' AND column_name = 'student_notes') THEN
            ALTER TABLE public.marketplace_orders ADD COLUMN student_notes text NULL;
            RAISE NOTICE 'Column student_notes added to marketplace_orders.';
        ELSE
            RAISE NOTICE 'Column student_notes already exists in marketplace_orders.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_orders' AND column_name = 'operator_notes') THEN
            ALTER TABLE public.marketplace_orders ADD COLUMN operator_notes text NULL;
            RAISE NOTICE 'Column operator_notes added to marketplace_orders.';
        ELSE
            RAISE NOTICE 'Column operator_notes already exists in marketplace_orders.';
        END IF;
    END IF;
END $$;

COMMENT ON TABLE public.marketplace_orders IS 'Stores orders placed by students for marketplace products.';
COMMENT ON COLUMN public.marketplace_orders.student_user_id IS 'The student who placed the order.';
COMMENT ON COLUMN public.marketplace_orders.storefront_id IS 'The storefront from which the products were ordered.';
COMMENT ON COLUMN public.marketplace_orders.total_price IS 'The total amount paid for the order.';
COMMENT ON COLUMN public.marketplace_orders.shipping_address IS 'Shipping or pickup details provided by the student.';
COMMENT ON COLUMN public.marketplace_orders.status IS 'Current status of the order.';

-- Enable RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_orders
DROP POLICY IF EXISTS "Students can view their own marketplace orders." ON public.marketplace_orders;
CREATE POLICY "Students can view their own marketplace orders." ON public.marketplace_orders
  FOR SELECT USING (auth.uid() = student_user_id);

DROP POLICY IF EXISTS "Students can update their cancellable marketplace orders." ON public.marketplace_orders;
CREATE POLICY "Students can update their cancellable marketplace orders." ON public.marketplace_orders
  FOR UPDATE USING (auth.uid() = student_user_id AND status IN ('pending_confirmation', 'pending_payment'))
  WITH CHECK (auth.uid() = student_user_id AND status IN ('pending_confirmation', 'pending_payment')); -- Can only update certain fields like notes or cancel

DROP POLICY IF EXISTS "Marketplace operators can view and manage orders for their storefronts." ON public.marketplace_orders;
CREATE POLICY "Marketplace operators can view and manage orders for their storefronts." ON public.marketplace_orders
  FOR ALL USING (
    storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
  )
  WITH CHECK (
    storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
  );

-- Admins (if a separate admin role needs to manage all orders)
-- CREATE POLICY "Admins full access to marketplace orders" ON public.marketplace_orders FOR ALL USING (is_admin());


-- 3. Create marketplace_order_items Table
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
    -- product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL, -- Ensure added by ALTER if needed
    quantity integer NOT NULL CHECK (quantity > 0),
    price_at_purchase numeric(10, 2) NOT NULL CHECK (price_at_purchase >= 0),
    selected_attributes jsonb,
    product_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Conditionally add columns to marketplace_order_items if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_order_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'order_id') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;
            RAISE NOTICE 'Column order_id added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column order_id already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'product_id') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL;
            RAISE NOTICE 'Column product_id added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column product_id already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'selected_attributes') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN selected_attributes jsonb NULL;
            RAISE NOTICE 'Column selected_attributes added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column selected_attributes already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'price_at_purchase') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN price_at_purchase numeric(10, 2) NOT NULL CHECK (price_at_purchase >= 0);
            RAISE NOTICE 'Column price_at_purchase added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column price_at_purchase already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'product_snapshot') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN product_snapshot jsonb NULL;
            RAISE NOTICE 'Column product_snapshot added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column product_snapshot already exists in marketplace_order_items.';
        END IF;

    END IF;
END $$;

COMMENT ON TABLE public.marketplace_order_items IS 'Stores individual items included in a marketplace order.';
COMMENT ON COLUMN public.marketplace_order_items.product_id IS 'The product ordered. Nullable if product is deleted but we want to keep order history.';
COMMENT ON COLUMN public.marketplace_order_items.price_at_purchase IS 'Price per unit at the time the order was placed.';
COMMENT ON COLUMN public.marketplace_order_items.product_snapshot IS 'Denormalized product details (name, image etc.) at time of purchase.';

-- Enable RLS
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_order_items
-- Students can view items of their own orders.
DROP POLICY IF EXISTS "Students can view items of their own marketplace orders." ON public.marketplace_order_items;
CREATE POLICY "Students can view items of their own marketplace orders." ON public.marketplace_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.marketplace_orders WHERE student_user_id = auth.uid())
  );

-- Marketplace operators can view items for orders in their storefronts.
DROP POLICY IF EXISTS "Operators can view items for their storefront orders." ON public.marketplace_order_items;
CREATE POLICY "Operators can view items for their storefront orders." ON public.marketplace_order_items
  FOR SELECT USING (
    order_id IN (
        SELECT mo.id FROM public.marketplace_orders mo
        JOIN public.storefronts sf ON mo.storefront_id = sf.id
        WHERE sf.operator_id = auth.uid()
    )
  );

-- Admins (if needed)
-- CREATE POLICY "Admins full access to marketplace order items" ON public.marketplace_order_items FOR ALL USING (is_admin());

-- Trigger to update `updated_at` on `marketplace_orders` table
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_marketplace_orders_updated_at ON public.marketplace_orders;
CREATE TRIGGER trigger_set_marketplace_orders_updated_at
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

COMMIT;

-- Content from 039_fix_admin_profile_access.sql
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

-- Content from 039_setup_marketplace_storage.sql
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

-- Content from 040_fix_login_access.sql
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

-- Content from 040_fix_profile_policies.sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for authentication" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
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

-- Content from 040_update_club_balance_on_event_payment.sql
-- Migration to update the register_and_pay_event function
-- to credit the club's balance upon successful paid event registration.

CREATE OR REPLACE FUNCTION public.register_and_pay_event(p_event_id uuid)
 RETURNS public.event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER -- Important for accessing profiles and deducting balance
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid := auth.uid(); -- Get the ID of the currently authenticated user
  v_event record;
  v_student_profile record;
  v_existing_registration public.event_registrations;
  v_registration_count integer;
  v_new_registration public.event_registrations;
BEGIN
  -- 1. Input Validation
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: User must be logged in to register.';
  END IF;
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Event ID cannot be null.';
  END IF;

  -- 2. Fetch Event Details (Lock the row for consistency if needed, though less critical here)
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Event % not found.', p_event_id;
  END IF;

  -- 3. Fetch Student Profile and Balance (Lock the row for update)
  SELECT * INTO v_student_profile FROM public.profiles WHERE id = v_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Student profile % not found.', v_student_id;
  END IF;

  -- 4. Check if Event is Paid
  IF NOT v_event.is_paid OR v_event.payment_amount IS NULL OR v_event.payment_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_OPERATION: Event % is not a paid event or amount is invalid.', p_event_id;
  END IF;

  -- 5. Check Student Balance
  IF v_student_profile.balance < v_event.payment_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Insufficient balance. Required: %, Available: %', v_event.payment_amount, v_student_profile.balance;
  END IF;

  -- 6. Check Registration Deadline
  IF v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline < now() THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration deadline has passed.';
  END IF;

  -- 7. Check Existing Registration (Lock the potential row)
  SELECT * INTO v_existing_registration
  FROM public.event_registrations
  WHERE event_id = p_event_id AND student_id = v_student_id
  FOR UPDATE; -- Lock if exists

  IF v_existing_registration IS NOT NULL AND v_existing_registration.status <> 'cancelled' THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED: Already registered for this event with status %.', v_existing_registration.status;
  END IF;

  -- 8. Check Seat Availability (Count active registrations)
  SELECT count(*) INTO v_registration_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status IN ('reserved', 'paid');

  IF v_event.total_seats > 0 AND v_registration_count >= v_event.total_seats THEN
    RAISE EXCEPTION 'SEATS_FULL: No more seats available for this event.';
  END IF;

  -- 9. Deduct Balance from Student
  UPDATE public.profiles
  SET balance = balance - v_event.payment_amount
  WHERE id = v_student_id;

  -- 10. Insert or Update Registration
  IF v_existing_registration IS NOT NULL AND v_existing_registration.status = 'cancelled' THEN
    -- Update the cancelled registration to 'paid'
    UPDATE public.event_registrations
    SET
      status = 'paid',
      paid_at = now(),
      registration_time = now(), -- Reset registration time? Optional.
      expires_at = NULL, -- Clear expiration for paid status
      updated_at = now()
    WHERE id = v_existing_registration.id
    RETURNING * INTO v_new_registration;
  ELSE
    -- Insert new registration
    INSERT INTO public.event_registrations (event_id, student_id, status, paid_at, payment_intent_id)
    VALUES (p_event_id, v_student_id, 'paid', now(), NULL) -- Set status directly to 'paid'
    RETURNING * INTO v_new_registration;
  END IF;

  -- 11. Credit the club's balance (Uncommented)
  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_event.payment_amount
  WHERE id = v_event.club_id; -- Ensure club_id exists in v_event

  -- 12. Return the new/updated registration record
  RETURN v_new_registration;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in register_and_pay_event for event %, student %: %', p_event_id, v_student_id, SQLERRM;
    -- Re-raise the original exception to ensure transaction rollback and inform the client
    RAISE;
END;
$function$;

-- Content from 041_fix_marketplace_order_items_column.sql
-- Migration: Fix marketplace_order_items column name

BEGIN;

-- Rename column from 'order_id' to 'marketplace_order_id' to match front-end expectations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'marketplace_order_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items
    RENAME COLUMN order_id TO marketplace_order_id;
    RAISE NOTICE 'Column order_id renamed to marketplace_order_id in table marketplace_order_items.';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'marketplace_order_id'
  ) THEN
    RAISE NOTICE 'Column marketplace_order_id already exists in table marketplace_order_items.';
  ELSE
    RAISE NOTICE 'Column order_id not found in table marketplace_order_items.';
  END IF;
END $$;

-- Update the create_marketplace_order function to use the new column name
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id, images, description, category
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes)
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price again inside transaction for consistency, though already fetched for calculation
        SELECT price INTO v_price_at_order
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        -- Use the new column name marketplace_order_id instead of order_id
        INSERT INTO public.marketplace_order_items (marketplace_order_id, product_id, quantity, price_at_purchase, selected_attributes)
        VALUES (v_order_id, v_input_item.product_id, v_input_item.quantity, v_price_at_order, v_input_item.selected_attributes);

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

COMMIT;

-- Content from 041_restore_working_policies.sql
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

-- Content from 042_fix_marketplace_product_id_column.sql
-- Migration: Fix marketplace_product_id column issue

BEGIN;

-- Check if we need to rename product_id to marketplace_product_id or if it already exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'product_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'marketplace_product_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items
    RENAME COLUMN product_id TO marketplace_product_id;
    RAISE NOTICE 'Column product_id renamed to marketplace_product_id in table marketplace_order_items.';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'marketplace_product_id'
  ) THEN
    RAISE NOTICE 'Column marketplace_product_id already exists in table marketplace_order_items.';
  ELSE
    RAISE NOTICE 'Column product_id not found in table marketplace_order_items.';
  END IF;
END $$;

-- Update the create_marketplace_order function to use the new column names
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes)
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price again inside transaction for consistency, though already fetched for calculation
        SELECT price INTO v_price_at_order
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id,
            marketplace_product_id,
            quantity,
            price_at_purchase,
            selected_attributes
        )
        VALUES (
            v_order_id,
            v_input_item.product_id,
            v_input_item.quantity,
            v_price_at_order,
            v_input_item.selected_attributes
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

COMMIT;

-- Content from 043_cleanup_duplicate_columns.sql
-- Migration: Clean up duplicate columns in marketplace_order_items

BEGIN;

-- First, drop the RLS policies that depend on order_id
DROP POLICY IF EXISTS "Students can view items of their own marketplace orders." ON public.marketplace_order_items;
DROP POLICY IF EXISTS "Operators can view items for their storefront orders." ON public.marketplace_order_items;

-- Now, drop the redundant foreign key constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'marketplace_order_items_product_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP CONSTRAINT marketplace_order_items_product_id_fkey;
    RAISE NOTICE 'Dropped constraint marketplace_order_items_product_id_fkey';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'marketplace_order_items_order_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP CONSTRAINT marketplace_order_items_order_id_fkey;
    RAISE NOTICE 'Dropped constraint marketplace_order_items_order_id_fkey';
  END IF;
END $$;

-- Drop the duplicate columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN product_id;
    RAISE NOTICE 'Dropped column product_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN order_id;
    RAISE NOTICE 'Dropped column order_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'marketplace_order_items'
    AND column_name = 'price_at_order'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN price_at_order;
    RAISE NOTICE 'Dropped column price_at_order';
  END IF;
END $$;

-- Recreate the RLS policies using marketplace_order_id instead of order_id
CREATE POLICY "Students can view items of their own marketplace orders." ON public.marketplace_order_items
  FOR SELECT USING (
    marketplace_order_id IN (SELECT id FROM public.marketplace_orders WHERE student_user_id = auth.uid())
  );

CREATE POLICY "Operators can view items for their storefront orders." ON public.marketplace_order_items
  FOR SELECT USING (
    marketplace_order_id IN (
        SELECT mo.id FROM public.marketplace_orders mo
        JOIN public.storefronts sf ON mo.storefront_id = sf.id
        WHERE sf.operator_id = auth.uid()
    )
  );

-- Update the create_marketplace_order function to use the correct column names
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes)
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price again inside transaction for consistency, though already fetched for calculation
        SELECT price INTO v_price_at_order
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id,
            marketplace_product_id,
            quantity,
            price_at_purchase,
            selected_attributes
        )
        VALUES (
            v_order_id,
            v_input_item.product_id,
            v_input_item.quantity,
            v_price_at_order,
            v_input_item.selected_attributes
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

COMMIT;

-- Content from 044_add_marketplace_order_items_foreign_key.sql
-- Migration: Add missing foreign key constraint to marketplace_order_items

BEGIN;

-- Add the foreign key constraint from marketplace_order_items.marketplace_order_id to marketplace_orders.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'marketplace_order_items_marketplace_order_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_marketplace_order_id_fkey
    FOREIGN KEY (marketplace_order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint: marketplace_order_items_marketplace_order_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: marketplace_order_items_marketplace_order_id_fkey';
  END IF;
END $$;

COMMIT;

-- Content from 045_update_marketplace_order_snapshot.sql
-- Migration: Update create_marketplace_order function to save product details in snapshot

BEGIN;

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        -- Query extended product information to include in snapshot
        SELECT id, name, price, stock_quantity, is_available, storefront_id, images, description, category
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes)
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch product details again inside transaction for consistency
        SELECT
            p.id,
            p.name,
            p.price,
            p.images,
            p.description,
            p.category,
            s.name as storefront_name
        INTO v_product
        FROM public.marketplace_products p
        JOIN public.storefronts s ON p.storefront_id = s.id
        WHERE p.id = v_input_item.product_id;

        -- Create product snapshot with essential details
        v_product_details := jsonb_build_object(
            'id', v_product.id,
            'name', v_product.name,
            'price', v_product.price,
            'image_url', CASE WHEN v_product.images IS NOT NULL AND jsonb_array_length(v_product.images) > 0
                               THEN v_product.images->0
                               ELSE NULL
                          END,
            'storefront_name', v_product.storefront_name,
            'category', v_product.category,
            'description', v_product.description
        );

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id,
            marketplace_product_id,
            quantity,
            price_at_purchase,
            selected_attributes,
            product_snapshot
        )
        VALUES (
            v_order_id,
            v_input_item.product_id,
            v_input_item.quantity,
            v_product.price,
            v_input_item.selected_attributes,
            v_product_details
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

COMMIT;

-- Content from 046_create_get_marketplace_orders_function.sql
-- Migration: Create function to get marketplace orders with student details

BEGIN;

-- Create a function to get marketplace orders with complete student profile information
CREATE OR REPLACE FUNCTION public.get_marketplace_orders_with_student_details(
  p_storefront_id uuid
)
RETURNS TABLE (
  id uuid,
  student_user_id uuid,
  storefront_id uuid,
  total_price numeric,
  shipping_address jsonb,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  student_notes text,
  operator_notes text,
  student_profile jsonb,
  order_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mo.id,
    mo.student_user_id,
    mo.storefront_id,
    mo.total_price,
    mo.shipping_address,
    mo.status::text,
    mo.created_at,
    mo.updated_at,
    mo.student_notes,
    mo.operator_notes,
    -- Create a structured student profile as jsonb
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'student_id', p.student_id,
      'avatar_url', p.avatar_url,
      'phone_number', p.phone_number
    ) AS student_profile,
    -- Get order items as a jsonb array
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', moi.id,
          'marketplace_order_id', moi.marketplace_order_id,
          'marketplace_product_id', moi.marketplace_product_id,
          'quantity', moi.quantity,
          'price_at_purchase', moi.price_at_purchase,
          'selected_attributes', moi.selected_attributes,
          'product_snapshot', moi.product_snapshot,
          'product', (
            SELECT jsonb_build_object(
              'name', mp.name,
              'images', mp.images
            )
            FROM marketplace_products mp
            WHERE mp.id = moi.marketplace_product_id
          )
        )
      )
      FROM marketplace_order_items moi
      WHERE moi.marketplace_order_id = mo.id),
      '[]'::jsonb
    ) AS order_items
  FROM
    marketplace_orders mo
  JOIN
    profiles p ON mo.student_user_id = p.id
  WHERE
    mo.storefront_id = p_storefront_id
  ORDER BY
    mo.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_marketplace_orders_with_student_details(uuid) TO authenticated;

-- Add RLS policy to restrict function usage to marketplace operators
DO $$
BEGIN
  -- Drop the policy if it exists
  DROP POLICY IF EXISTS "Only marketplace operators can use get_marketplace_orders_with_student_details function"
  ON public.marketplace_orders;

  -- Create the policy
  CREATE POLICY "Only marketplace operators can use get_marketplace_orders_with_student_details function"
  ON public.marketplace_orders
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role
    AND
    storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
  );
END
$$;

COMMENT ON FUNCTION public.get_marketplace_orders_with_student_details(uuid) IS 'Returns marketplace orders with complete student profile details for a given storefront ID';

-- Update the create_marketplace_order function to properly handle images
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id, images, description, category
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF v_final_total_price <> p_total_order_price THEN
        RAISE EXCEPTION 'Calculated total price (%) does not match provided total price (%)',
                        v_final_total_price, p_total_order_price;
    END IF;

    -- 3. Create the order
    INSERT INTO public.marketplace_orders (
        student_user_id,
        storefront_id,
        total_price,
        shipping_address,
        status,
        student_notes
    )
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'pending_payment'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 4. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch product details again inside transaction for consistency
        SELECT
            p.id,
            p.name,
            p.price,
            p.images,
            p.description,
            p.category,
            s.name as storefront_name
        INTO v_product
        FROM public.marketplace_products p
        JOIN public.storefronts s ON p.storefront_id = s.id
        WHERE p.id = v_input_item.product_id;

        -- Create product snapshot with essential details
        v_product_details := jsonb_build_object(
            'id', v_product.id,
            'name', v_product.name,
            'price', v_product.price,
            'image_url', CASE
                WHEN v_product.images IS NOT NULL AND array_length(v_product.images, 1) > 0
                THEN v_product.images[1]
                ELSE NULL
            END,
            'storefront_name', v_product.storefront_name,
            'category', v_product.category,
            'description', v_product.description
        );

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id,
            marketplace_product_id,
            quantity,
            price_at_purchase,
            selected_attributes,
            product_snapshot
        )
        VALUES (
            v_order_id,
            v_input_item.product_id,
            v_input_item.quantity,
            v_product.price,
            v_input_item.selected_attributes,
            v_product_details
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 5. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

-- Re-grant execution permission
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) TO authenticated;

-- Content from 048_fix_marketplace_order_balance_deduction.sql
-- Migration: Add missing balance deduction logic to create_marketplace_order function

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
    v_product_details jsonb;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id, images, description, category
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;

        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF v_final_total_price <> p_total_order_price THEN
        RAISE EXCEPTION 'Calculated total price (%) does not match provided total price (%)',
                        v_final_total_price, p_total_order_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;

    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (
        student_user_id,
        storefront_id,
        total_price,
        shipping_address,
        status,
        student_notes
    )
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch product details again inside transaction for consistency
        SELECT
            p.id,
            p.name,
            p.price,
            p.images,
            p.description,
            p.category,
            s.name as storefront_name
        INTO v_product
        FROM public.marketplace_products p
        JOIN public.storefronts s ON p.storefront_id = s.id
        WHERE p.id = v_input_item.product_id;

        -- Create product snapshot with essential details
        v_product_details := jsonb_build_object(
            'id', v_product.id,
            'name', v_product.name,
            'price', v_product.price,
            'image_url', CASE
                WHEN v_product.images IS NOT NULL AND array_length(v_product.images, 1) > 0
                THEN v_product.images[1]
                ELSE NULL
            END,
            'storefront_name', v_product.storefront_name,
            'category', v_product.category,
            'description', v_product.description
        );

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id,
            marketplace_product_id,
            quantity,
            price_at_purchase,
            selected_attributes,
            product_snapshot
        )
        VALUES (
            v_order_id,
            v_input_item.product_id,
            v_input_item.quantity,
            v_product.price,
            v_input_item.selected_attributes,
            v_product_details
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

-- Re-grant execution permission
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) IS 'Creates a new marketplace order, validates stock/availability, records transaction, debits student balance, and credits merchant balance.';

-- Content from 049_fix_existing_marketplace_orders.sql
-- Migration: Fix existing marketplace orders with pending_payment status but already deducted balance

-- This script will apply a one-time fix to update any orders that are stuck in 'pending_payment' status
-- to 'processing' status, as they should have been processed correctly when they were created.

DO $$
DECLARE
    v_count integer;
BEGIN
    -- Update orders that are in pending_payment status and were created recently
    -- We're assuming orders from the last 30 days might be affected by this issue
    WITH updated_orders AS (
        UPDATE public.marketplace_orders
        SET status = 'processing'::public.marketplace_order_status
        WHERE status = 'pending_payment'::public.marketplace_order_status
        AND created_at > (now() - interval '30 days')
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM updated_orders;

    RAISE NOTICE 'Updated % marketplace orders from pending_payment to processing status', v_count;
END $$;

-- Commit the changes
COMMIT;