-- Drop the existing function first if it exists, to allow changing the return type.
DROP FUNCTION IF EXISTS public.get_vendor_orders_with_student_details();

-- Function to fetch orders for a vendor, including student details for online orders.
-- Runs with the privileges of the function owner (SECURITY DEFINER)
-- to allow joining with the profiles table, which the vendor might not have direct access to via RLS.

CREATE OR REPLACE FUNCTION public.get_vendor_orders_with_student_details()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    total_price numeric,
    subtotal numeric,
    tax numeric,
    status public.order_status,
    pickup_time timestamptz,
    created_at timestamptz,
    payment_method text, -- Corrected type to match orders table
    student_full_name text,
    student_reg_id text -- Changed name to avoid conflict with profiles.student_id if selected directly
    -- Add other order fields as needed
)
AS $$
BEGIN
  -- Check if the caller is a vendor
  IF NOT public.is_vendor() THEN
    RAISE EXCEPTION 'Permission denied: Caller is not a vendor.';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.total_price,
    o.subtotal,
    o.tax,
    o.status,
    o.pickup_time,
    o.created_at,
    o.payment_method,
    -- Select profile details only if it's an 'online' order, otherwise null
    CASE
      WHEN o.payment_method = 'online' THEN p.full_name
      ELSE NULL
    END AS student_full_name,
    CASE
      WHEN o.payment_method = 'online' THEN p.student_id -- This is the registration ID column
      ELSE NULL
    END AS student_reg_id
  FROM
    public.orders o
  -- Left join profiles for online orders
  LEFT JOIN public.profiles p ON o.user_id = p.id AND o.payment_method = 'online'
  -- Ensure the vendor has at least one item from their counters in this order
  WHERE EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.counters c ON oi.counter_id = c.id
    WHERE oi.order_id = o.id
      AND c.vendor_id = auth.uid()
  )
  ORDER BY
    o.created_at DESC;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permission to authenticated users (vendors will pass the internal check)
GRANT EXECUTE ON FUNCTION public.get_vendor_orders_with_student_details() TO authenticated;

COMMENT ON FUNCTION public.get_vendor_orders_with_student_details() IS 'Fetches orders relevant to the calling vendor (based on items from their counters) and includes student name/reg_id for online orders. Runs as SECURITY DEFINER to access profiles.';
