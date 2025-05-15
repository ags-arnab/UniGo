-- Migration: Create Marketplace Order Tables and Status ENUM

BEGIN;

-- 1. Robustly create/update marketplace_order_status ENUM type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_order_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.marketplace_order_status AS ENUM (
            'pending_payment', 
            'pending_confirmation', 
            'processing',
            'shipped',          
            'ready_for_pickup', 
            'completed',
            'cancelled_by_student',
            'cancelled_by_operator',
            'refunded'
        );
        RAISE NOTICE 'Created public.marketplace_order_status enum.';
    ELSE
        -- Add values if they don't exist. Order might matter for display in some tools, but not for functionality.
        -- The error is for 'pending_confirmation', so ensuring it exists is key.
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'pending_payment';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'processing';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'shipped';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'completed';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'cancelled_by_student';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'cancelled_by_operator';
        ALTER TYPE public.marketplace_order_status ADD VALUE IF NOT EXISTS 'refunded';
        RAISE NOTICE 'Ensured all values exist in public.marketplace_order_status enum.';
    END IF;
END $$;

COMMIT; -- Commit the ENUM changes
BEGIN;  -- Start a new transaction for subsequent operations

-- 2. Create marketplace_orders Table
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- So order history remains if student profile deleted
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE RESTRICT, -- Operator should resolve orders before deleting storefront
    
    total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
    shipping_address jsonb, -- Can store structured address details or pickup instructions
    
    status public.marketplace_order_status NOT NULL DEFAULT 'pending_confirmation',
    
    -- Optional: Tracking numbers, notes, etc.
    operator_notes text, 
    student_notes text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conditionally add student_notes and operator_notes columns if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_orders' AND column_name = 'student_notes') THEN
            ALTER TABLE public.marketplace_orders ADD COLUMN student_notes text NULL;
            RAISE NOTICE 'Column student_notes added to marketplace_orders.';
        ELSE
            RAISE NOTICE 'Column student_notes already exists in marketplace_orders.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_orders' AND column_name = 'operator_notes') THEN
            ALTER TABLE public.marketplace_orders ADD COLUMN operator_notes text NULL;
            RAISE NOTICE 'Column operator_notes added to marketplace_orders.';
        ELSE
            RAISE NOTICE 'Column operator_notes already exists in marketplace_orders.';
        END IF;
    END IF;
END $$;

COMMENT ON TABLE public.marketplace_orders IS 'Stores orders placed by students for marketplace products.';
COMMENT ON COLUMN public.marketplace_orders.student_user_id IS 'The student who placed the order.';
COMMENT ON COLUMN public.marketplace_orders.storefront_id IS 'The storefront from which the products were ordered.';
COMMENT ON COLUMN public.marketplace_orders.total_price IS 'The total amount paid for the order.';
COMMENT ON COLUMN public.marketplace_orders.shipping_address IS 'Shipping or pickup details provided by the student.';
COMMENT ON COLUMN public.marketplace_orders.status IS 'Current status of the order.';

-- Enable RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_orders
DROP POLICY IF EXISTS "Students can view their own marketplace orders." ON public.marketplace_orders;
CREATE POLICY "Students can view their own marketplace orders." ON public.marketplace_orders
  FOR SELECT USING (auth.uid() = student_user_id);

DROP POLICY IF EXISTS "Students can update their cancellable marketplace orders." ON public.marketplace_orders;
CREATE POLICY "Students can update their cancellable marketplace orders." ON public.marketplace_orders
  FOR UPDATE USING (auth.uid() = student_user_id AND status IN ('pending_confirmation', 'pending_payment'))
  WITH CHECK (auth.uid() = student_user_id AND status IN ('pending_confirmation', 'pending_payment')); -- Can only update certain fields like notes or cancel

DROP POLICY IF EXISTS "Marketplace operators can view and manage orders for their storefronts." ON public.marketplace_orders;
CREATE POLICY "Marketplace operators can view and manage orders for their storefronts." ON public.marketplace_orders
  FOR ALL USING (
    storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
  )
  WITH CHECK (
    storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
  );

-- Admins (if a separate admin role needs to manage all orders)
-- CREATE POLICY "Admins full access to marketplace orders" ON public.marketplace_orders FOR ALL USING (is_admin()); 


-- 3. Create marketplace_order_items Table
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
    -- product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL, -- Ensure added by ALTER if needed
    quantity integer NOT NULL CHECK (quantity > 0),
    price_at_purchase numeric(10, 2) NOT NULL CHECK (price_at_purchase >= 0), 
    selected_attributes jsonb, 
    product_snapshot jsonb, 
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Conditionally add columns to marketplace_order_items if they don't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_order_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'order_id') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE;
            RAISE NOTICE 'Column order_id added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column order_id already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'product_id') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL;
            RAISE NOTICE 'Column product_id added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column product_id already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'selected_attributes') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN selected_attributes jsonb NULL;
            RAISE NOTICE 'Column selected_attributes added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column selected_attributes already exists in marketplace_order_items.';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'price_at_purchase') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN price_at_purchase numeric(10, 2) NOT NULL CHECK (price_at_purchase >= 0);
            RAISE NOTICE 'Column price_at_purchase added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column price_at_purchase already exists in marketplace_order_items.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_order_items' AND column_name = 'product_snapshot') THEN
            ALTER TABLE public.marketplace_order_items ADD COLUMN product_snapshot jsonb NULL;
            RAISE NOTICE 'Column product_snapshot added to marketplace_order_items.';
        ELSE
            RAISE NOTICE 'Column product_snapshot already exists in marketplace_order_items.';
        END IF;

    END IF;
END $$;

COMMENT ON TABLE public.marketplace_order_items IS 'Stores individual items included in a marketplace order.';
COMMENT ON COLUMN public.marketplace_order_items.product_id IS 'The product ordered. Nullable if product is deleted but we want to keep order history.';
COMMENT ON COLUMN public.marketplace_order_items.price_at_purchase IS 'Price per unit at the time the order was placed.';
COMMENT ON COLUMN public.marketplace_order_items.product_snapshot IS 'Denormalized product details (name, image etc.) at time of purchase.';

-- Enable RLS
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_order_items
-- Students can view items of their own orders.
DROP POLICY IF EXISTS "Students can view items of their own marketplace orders." ON public.marketplace_order_items;
CREATE POLICY "Students can view items of their own marketplace orders." ON public.marketplace_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.marketplace_orders WHERE student_user_id = auth.uid())
  );

-- Marketplace operators can view items for orders in their storefronts.
DROP POLICY IF EXISTS "Operators can view items for their storefront orders." ON public.marketplace_order_items;
CREATE POLICY "Operators can view items for their storefront orders." ON public.marketplace_order_items
  FOR SELECT USING (
    order_id IN (
        SELECT mo.id FROM public.marketplace_orders mo
        JOIN public.storefronts sf ON mo.storefront_id = sf.id
        WHERE sf.operator_id = auth.uid()
    )
  );

-- Admins (if needed)
-- CREATE POLICY "Admins full access to marketplace order items" ON public.marketplace_order_items FOR ALL USING (is_admin()); 

-- Trigger to update `updated_at` on `marketplace_orders` table
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_marketplace_orders_updated_at ON public.marketplace_orders;
CREATE TRIGGER trigger_set_marketplace_orders_updated_at
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

COMMIT; 