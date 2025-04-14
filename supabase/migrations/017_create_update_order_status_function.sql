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
        new_order_status := 'pending'; -- Default for new orders or if somehow reverted
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
