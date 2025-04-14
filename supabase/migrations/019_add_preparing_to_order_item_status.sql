-- supabase/migrations/019_add_preparing_to_order_item_status.sql

-- Add 'preparing' value to the order_item_status enum
-- This allows individual items to be marked as being actively prepared by the vendor.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status') THEN
        -- Add the new value idempotently (ignore if it already exists)
        ALTER TYPE public.order_item_status ADD VALUE IF NOT EXISTS 'preparing' AFTER 'pending'; -- Add it after 'pending' for logical order
    ELSE
        RAISE WARNING 'Type public.order_item_status does not exist, skipping alteration. Manual creation might be needed.';
    END IF;
END $$;
