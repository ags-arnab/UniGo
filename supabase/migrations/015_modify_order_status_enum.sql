-- supabase/migrations/015_modify_order_status_enum.sql

-- Add new values to the order_status enum
-- Note: Adding values to an enum in PostgreSQL requires creating a new type
-- and replacing the old one, or using ALTER TYPE ... ADD VALUE (if supported and safe)
-- Using ADD VALUE is generally preferred if available and no complex transactions depend on the enum during migration.

-- Check if the type exists before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        -- Add the new values idempotently (ignore if they already exist)
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partially_ready';
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'partially_delivered';
    ELSE
        RAISE NOTICE 'Type public.order_status does not exist, skipping alteration.';
    END IF;
END $$;
