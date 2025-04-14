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
IS 'Trigger function to automatically set menu_items.available to false when stock reaches 0 or less, and true if stock becomes positive.';
