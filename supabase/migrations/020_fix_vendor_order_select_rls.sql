-- Drop the existing policy that uses the function call
DROP POLICY IF EXISTS "Allow vendors to view orders with their items" ON public.orders;

-- Recreate the policy with inlined logic for Realtime compatibility
CREATE POLICY "Allow vendors to view orders with their items"
ON public.orders
FOR SELECT
TO public -- Or specific authenticated roles if needed
USING (
  -- Check 1: Ensure the user has the 'vendor' role (using the existing helper function is fine here)
  public.is_vendor()
  AND
  -- Check 2: Inline the logic from check_vendor_order_access function
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE
      oi.order_id = orders.id -- Correlate with the orders table row being checked
      AND c.vendor_id = auth.uid() -- Check if the counter belongs to the current vendor
  )
);

-- Optional: Grant usage on the is_vendor function if not already done
-- GRANT EXECUTE ON FUNCTION public.is_vendor() TO authenticated; -- Or relevant roles

COMMENT ON POLICY "Allow vendors to view orders with their items" ON public.orders
  IS 'Allows vendors to select orders if they own at least one counter associated with an item in that order. Optimized for Supabase Realtime.';
