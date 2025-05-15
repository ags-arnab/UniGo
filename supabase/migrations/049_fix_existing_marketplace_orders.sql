-- Migration: Fix existing marketplace orders with pending_payment status but already deducted balance

-- This script will apply a one-time fix to update any orders that are stuck in 'pending_payment' status
-- to 'processing' status, as they should have been processed correctly when they were created.

DO $$
DECLARE
    v_count integer;
BEGIN
    -- Update orders that are in pending_payment status and were created recently
    -- We're assuming orders from the last 30 days might be affected by this issue
    WITH updated_orders AS (
        UPDATE public.marketplace_orders
        SET status = 'processing'::public.marketplace_order_status
        WHERE status = 'pending_payment'::public.marketplace_order_status
        AND created_at > (now() - interval '30 days')
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM updated_orders;
    
    RAISE NOTICE 'Updated % marketplace orders from pending_payment to processing status', v_count;
END $$;

-- Commit the changes
COMMIT;
