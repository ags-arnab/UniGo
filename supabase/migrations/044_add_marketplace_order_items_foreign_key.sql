-- Migration: Add missing foreign key constraint to marketplace_order_items

BEGIN;

-- Add the foreign key constraint from marketplace_order_items.marketplace_order_id to marketplace_orders.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_order_items_marketplace_order_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items
    ADD CONSTRAINT marketplace_order_items_marketplace_order_id_fkey
    FOREIGN KEY (marketplace_order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: marketplace_order_items_marketplace_order_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: marketplace_order_items_marketplace_order_id_fkey';
  END IF;
END $$;

COMMIT; 