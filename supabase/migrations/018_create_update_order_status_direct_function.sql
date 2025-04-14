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
    END;
  END IF;

END;
$$;

-- Grant execute permission ONLY to the authenticated role (vendors will call this)
GRANT EXECUTE ON FUNCTION public.update_order_status_direct(uuid, public.order_status) TO authenticated;

-- Revoke from public just in case
REVOKE EXECUTE ON FUNCTION public.update_order_status_direct(uuid, public.order_status) FROM public;
