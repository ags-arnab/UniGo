-- supabase/migrations/016_remove_vendor_order_update_policy.sql

-- Drop the policy that allows vendors to update the main order status
-- based on owning an item within that order.
-- Vendors should update order_items.status instead.

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Allow vendors to update status of orders with their items" ON public.orders;
