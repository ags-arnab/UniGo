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
    UPDATE public.menu_items
    SET stock = stock - p_quantity
    WHERE id = p_menu_item_id
      AND stock IS NOT NULL; -- Only decrement if stock is tracked

    -- Optional: Add a check after update to see if stock went negative,
    -- although pre-checks in application logic should ideally prevent this.
    -- Example:
    -- IF FOUND AND (SELECT stock FROM public.menu_items WHERE id = p_menu_item_id) < 0 THEN
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

COMMENT ON FUNCTION public.decrement_menu_item_stock(uuid, integer) IS 'Safely decrements the stock count for a given menu item ID, only if stock tracking is enabled (stock is not NULL).';
