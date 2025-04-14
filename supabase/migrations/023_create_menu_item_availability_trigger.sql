-- Trigger to update menu_item availability when stock changes
CREATE TRIGGER update_menu_item_availability_trigger
BEFORE UPDATE OF stock ON public.menu_items
FOR EACH ROW
WHEN (OLD.stock IS DISTINCT FROM NEW.stock) -- Only run if stock value actually changes
EXECUTE FUNCTION public.update_menu_item_availability_on_stock_change();

-- Comment on the trigger
COMMENT ON TRIGGER update_menu_item_availability_trigger ON public.menu_items
IS 'Updates the available status based on the stock level before a stock update occurs.';
