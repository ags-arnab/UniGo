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
    RAISE LOG 'Cancelled % overdue pickup orders.', overdue_order_count;
  END IF;

END;
$$;

-- Grant execute permission to the postgres role (or the role that pg_cron runs as)
-- Typically, pg_cron runs as the 'postgres' superuser, which already has permissions.
-- If using a different setup, grant might be needed:
-- GRANT EXECUTE ON FUNCTION public.cancel_overdue_pickup_orders() TO postgres;

-- Note: This function needs to be scheduled to run periodically, e.g., using pg_cron.
-- The scheduling will be handled in the next migration step.
