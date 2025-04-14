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
    UPDATE public.menu_items
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
