-- supabase/migrations/014_add_order_item_ready_status.sql

-- Add 'ready' value to the order_item_status enum
-- This allows individual items to be marked as ready for pickup/delivery by the vendor.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status') THEN
        -- Add the new value idempotently (ignore if it already exists)
        ALTER TYPE public.order_item_status ADD VALUE IF NOT EXISTS 'ready';
    ELSE
        -- If the type doesn't exist, we might need to create it (though it should exist based on tables.json)
        -- CREATE TYPE public.order_item_status AS ENUM ('pending', 'ready', 'delivered');
        RAISE WARNING 'Type public.order_item_status does not exist, skipping alteration. Manual creation might be needed.';
    END IF;
END $$;
