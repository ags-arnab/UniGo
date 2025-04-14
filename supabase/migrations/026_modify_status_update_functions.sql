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
