-- Migration to add payment method tracking to orders

-- 1. Define payment method enum type
CREATE TYPE public.payment_method_type AS ENUM (
  'online', -- Payment made through the student portal (e.g., balance deduction)
  'cash'    -- Payment made in cash at the POS
);

-- 2. Add the payment_method column to the orders table
ALTER TABLE public.orders
ADD COLUMN payment_method public.payment_method_type;

-- 3. Add a comment to the new column
COMMENT ON COLUMN public.orders.payment_method IS 'Indicates how the order was paid for (online balance or cash at POS).';

-- 4. Optional: Set a default for existing orders if necessary
-- If you have existing orders and want to assign a default, uncomment and adjust:
-- UPDATE public.orders SET payment_method = 'online' WHERE payment_method IS NULL;
-- ALTER TABLE public.orders ALTER COLUMN payment_method SET NOT NULL; -- Make it mandatory after backfilling

-- Note: You might need to update RLS policies if they depend on this new column,
-- although it's unlikely for basic read/write policies.

-- Note: Remember to update the order creation logic (both frontend controller and POS function)
-- to set this column appropriately when new orders are created.
