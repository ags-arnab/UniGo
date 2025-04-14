-- Add ready_at column to track when an order becomes ready for pickup
ALTER TABLE public.orders
ADD COLUMN ready_at timestamp with time zone;

COMMENT ON COLUMN public.orders.ready_at IS 'Timestamp indicating when the order status was set to ''ready''.';
