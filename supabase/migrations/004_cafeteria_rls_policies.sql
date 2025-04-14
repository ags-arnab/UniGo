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


-- 2. Policies for 'menu_items' table
-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on menu_items" ON public.menu_items;
CREATE POLICY "Allow admin full access on menu_items" ON public.menu_items
  FOR ALL USING (public.is_admin());

-- Allow authenticated users (students, vendors) to view available menu items,
-- OR items that were updated very recently (to allow RLS notifications for 'available=false' changes)
DROP POLICY IF EXISTS "Allow authenticated users to view available menu items" ON public.menu_items;
CREATE POLICY "Allow authenticated users to view available menu items" ON public.menu_items
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (
      available = true OR
      updated_at > (now() - interval '5 seconds') -- Allow seeing recently updated (even if now unavailable) items briefly
    )
  );

-- Allow vendors to view ALL their menu items (including unavailable)
DROP POLICY IF EXISTS "Allow vendors to view all their menu items" ON public.menu_items;
CREATE POLICY "Allow vendors to view all their menu items" ON public.menu_items
  FOR SELECT USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));

-- Allow vendors to create menu items for their own counters
DROP POLICY IF EXISTS "Allow vendors to create items for their counters" ON public.menu_items;
CREATE POLICY "Allow vendors to create items for their counters" ON public.menu_items
  FOR INSERT WITH CHECK (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()));

-- Allow vendors to update menu items belonging to their counters
DROP POLICY IF EXISTS "Allow vendors to update items on their counters" ON public.menu_items;
CREATE POLICY "Allow vendors to update items on their counters" ON public.menu_items
  FOR UPDATE USING (public.is_vendor() AND counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid()))
  WITH CHECK (counter_id IN (SELECT id FROM public.counters WHERE vendor_id = auth.uid())); -- Ensure they can't change counter to one they don't own

-- Allow vendors to delete menu items belonging to their counters
DROP POLICY IF EXISTS "Allow vendors to delete items from their counters" ON public.menu_items;
CREATE POLICY "Allow vendors to delete items from their counters" ON public.menu_items
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

GRANT SELECT ON public.menu_items TO authenticated;
GRANT INSERT (counter_id, name, description, price, category, allergens, ingredients, image_path, available, stock, is_diet_food, calories, protein, carbs, fat) ON public.menu_items TO authenticated; -- Vendors insert via policy
GRANT UPDATE (counter_id, name, description, price, category, allergens, ingredients, image_path, available, stock, is_diet_food, calories, protein, carbs, fat) ON public.menu_items TO authenticated; -- Vendors update via policy
GRANT DELETE ON public.menu_items TO authenticated; -- Vendors delete via policy

GRANT SELECT ON public.orders TO authenticated;
GRANT INSERT (user_id, total_price, subtotal, tax, status, pickup_time, payment_method) ON public.orders TO authenticated; -- Students/Vendors insert via policy
GRANT UPDATE (status) ON public.orders TO authenticated; -- Vendors update status via policy

GRANT SELECT ON public.order_items TO authenticated;
GRANT INSERT (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status) ON public.order_items TO authenticated; -- Students/Vendors insert via policy
GRANT UPDATE (status) ON public.order_items TO authenticated; -- Vendors update status via policy

-- Note: Admin access is handled by the specific admin policies defined above.
-- If you have an 'anon' role needing access (e.g., viewing menu items without login), add policies and grants for 'anon'.
-- Example: GRANT SELECT ON public.menu_items TO anon;
-- CREATE POLICY "Allow anon read access to available menu items" ON public.menu_items FOR SELECT TO anon USING (available = true);
