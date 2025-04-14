-- Drop the potentially problematic policy (created in migration 020 or manually)
DROP POLICY IF EXISTS "Allow vendors to view orders with their items" ON public.orders;

-- Recreate the policy using the original function call
-- This might break Realtime but should restore visibility
CREATE POLICY "Allow vendors to view orders with their items"
ON public.orders
FOR SELECT
TO public -- Or specific authenticated roles if needed
USING (
  -- Check 1: Ensure the user has the 'vendor' role
  public.is_vendor()
  AND
  -- Check 2: Use the original function call
  public.check_vendor_order_access(id)
);

COMMENT ON POLICY "Allow vendors to view orders with their items" ON public.orders
  IS 'Allows vendors to select orders if they own at least one counter associated with an item in that order. Reverted to use function call.';
