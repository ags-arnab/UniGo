-- Migration: Create Marketplace Module

BEGIN;

-- 1. Add 'marketplace_operator' to user_role ENUM
-- Check if the type exists and the value doesn't, then add it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'marketplace_operator';
    ELSE
        RAISE WARNING 'Type public.user_role does not exist, skipping alteration.';
    END IF;
END $$;

-- Commit the user_role enum change before proceeding
COMMIT;
BEGIN;

-- 2. Define transaction_type ENUM if it doesn't exist and add marketplace transaction types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM (
            'cafeteria_purchase_debit',
            'cafeteria_sale_credit',
            'event_payment_debit',
            'event_payment_credit',
            'wallet_top_up',
            'refund',
            'marketplace_purchase_debit',
            'marketplace_sale_credit'
        );
        RAISE NOTICE 'Created public.transaction_type enum.';
    ELSE
        ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'marketplace_purchase_debit';
        ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'marketplace_sale_credit';
        RAISE NOTICE 'Added values to public.transaction_type enum.';
    END IF;
END $$;

-- Commit the transaction_type enum change before proceeding
COMMIT;
BEGIN;

-- 3. Create storefronts Table
CREATE TABLE IF NOT EXISTS public.storefronts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT uq_storefronts_operator_id UNIQUE (operator_id),
    name text NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add the unique constraint if it doesn't exist (safeguard)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_storefronts_operator_id' AND conrelid = 'public.storefronts'::regclass) THEN
        ALTER TABLE public.storefronts ADD CONSTRAINT uq_storefronts_operator_id UNIQUE (operator_id);
        RAISE NOTICE 'Added unique constraint uq_storefronts_operator_id to storefronts table.';
    ELSE
        RAISE NOTICE 'Unique constraint uq_storefronts_operator_id already exists on storefronts table.';
    END IF;
END $$;

COMMENT ON TABLE public.storefronts IS 'Stores information about individual student-run marketplaces (campus stores).';
COMMENT ON COLUMN public.storefronts.operator_id IS 'The profile ID of the student operating this storefront (role: marketplace_operator).';

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_storefronts ON public.storefronts;
CREATE TRIGGER set_timestamp_storefronts
BEFORE UPDATE ON public.storefronts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for storefronts
ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storefronts
DROP POLICY IF EXISTS "Allow marketplace operators to manage their own storefronts" ON public.storefronts;
CREATE POLICY "Allow marketplace operators to manage their own storefronts"
    ON public.storefronts FOR ALL
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND operator_id = auth.uid() )
    WITH CHECK ( operator_id = auth.uid() );

DROP POLICY IF EXISTS "Allow authenticated users to view active storefronts" ON public.storefronts;
CREATE POLICY "Allow authenticated users to view active storefronts"
    ON public.storefronts FOR SELECT
    USING ( auth.role() = 'authenticated' AND is_active = true );

DROP POLICY IF EXISTS "Allow admin full access on storefronts" ON public.storefronts;
CREATE POLICY "Allow admin full access on storefronts"
    ON public.storefronts FOR ALL
    USING (is_admin());


-- 4. Create marketplace_products Table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    category text,
    images text[],
    stock_quantity integer CHECK (stock_quantity >= 0),
    attributes jsonb,
    is_available boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_products IS 'Products offered by student storefronts.';
COMMENT ON COLUMN public.marketplace_products.storefront_id IS 'The storefront offering this product.';
COMMENT ON COLUMN public.marketplace_products.attributes IS 'Product attributes like size, color, etc. (e.g., {\"size\": [\"S\", \"M\"], \"color\": [\"Red\", \"Blue\"]})';

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_marketplace_products ON public.marketplace_products;
CREATE TRIGGER set_timestamp_marketplace_products
BEFORE UPDATE ON public.marketplace_products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_products
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_products
DROP POLICY IF EXISTS "Allow marketplace operators to manage their products" ON public.marketplace_products;
CREATE POLICY "Allow marketplace operators to manage their products"
    ON public.marketplace_products FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    )
    WITH CHECK (
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    );

DROP POLICY IF EXISTS "Allow authenticated users to view available marketplace products" ON public.marketplace_products;
CREATE POLICY "Allow authenticated users to view available marketplace products"
    ON public.marketplace_products FOR SELECT
    USING ( auth.role() = 'authenticated' AND is_available = true );

DROP POLICY IF EXISTS "Allow admin full access on marketplace_products" ON public.marketplace_products;
CREATE POLICY "Allow admin full access on marketplace_products"
    ON public.marketplace_products FOR ALL
    USING (is_admin());


-- 5. Create marketplace_order_status ENUM
DROP TYPE IF EXISTS public.marketplace_order_status CASCADE;
CREATE TYPE public.marketplace_order_status AS ENUM (
    'pending_payment',
    'processing',
    'ready_for_pickup', -- If applicable
    'shipped',          -- If applicable
    'delivered',
    'cancelled_by_student',
    'cancelled_by_operator',
    'refunded'
);
-- Commit the marketplace_order_status enum change before proceeding
COMMIT;
BEGIN;

-- 6. Create marketplace_orders Table
DROP TABLE IF EXISTS public.marketplace_orders CASCADE;
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Student who placed order
    storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE RESTRICT, -- Storefront order belongs to
    total_price numeric NOT NULL CHECK (total_price >= 0),
    shipping_address jsonb, -- For shippable goods, NULL for digital/pickup
    status public.marketplace_order_status NOT NULL DEFAULT 'pending_payment',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_orders IS 'Orders placed by students for marketplace products.';
COMMENT ON COLUMN public.marketplace_orders.student_user_id IS 'The student who made the purchase.';
COMMENT ON COLUMN public.marketplace_orders.storefront_id IS 'The storefront from which the items were ordered.';
COMMENT ON COLUMN public.marketplace_orders.shipping_address IS 'Shipping address if applicable (e.g., {\"addressLine1\": \"...", \"city\": \"..."}).';


-- Apply updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_marketplace_orders ON public.marketplace_orders;
CREATE TRIGGER set_timestamp_marketplace_orders
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_orders
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_orders
DROP POLICY IF EXISTS "Students can manage their own marketplace orders" ON public.marketplace_orders;
CREATE POLICY "Students can manage their own marketplace orders"
    ON public.marketplace_orders FOR ALL
    USING ( student_user_id = auth.uid() )
    WITH CHECK ( student_user_id = auth.uid() );

DROP POLICY IF EXISTS "Marketplace operators can manage orders for their storefronts" ON public.marketplace_orders;
CREATE POLICY "Marketplace operators can manage orders for their storefronts"
    ON public.marketplace_orders FOR ALL
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    )
    WITH CHECK (
        storefront_id IN (SELECT id FROM public.storefronts WHERE operator_id = auth.uid())
    );
    
DROP POLICY IF EXISTS "Allow admin full access on marketplace_orders" ON public.marketplace_orders;
CREATE POLICY "Allow admin full access on marketplace_orders"
    ON public.marketplace_orders FOR ALL
    USING (is_admin());


-- 7. Create marketplace_order_items Table
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
    marketplace_product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE RESTRICT, -- Prevent product deletion if in an order
    quantity integer NOT NULL CHECK (quantity > 0),
    price_at_order numeric NOT NULL CHECK (price_at_order >= 0),
    selected_attributes jsonb, -- e.g., {"size": "M", "color": "Red"}
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now() -- Though items usually don't update after order
);

COMMENT ON TABLE public.marketplace_order_items IS 'Individual items within a student marketplace order.';
COMMENT ON COLUMN public.marketplace_order_items.selected_attributes IS 'Specific attributes of the product chosen by the student.';

-- Apply updated_at trigger (though less likely to be updated)
DROP TRIGGER IF EXISTS set_timestamp_marketplace_order_items ON public.marketplace_order_items;
CREATE TRIGGER set_timestamp_marketplace_order_items
BEFORE UPDATE ON public.marketplace_order_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS for marketplace_order_items
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_order_items
-- Inherits access through order_id and product_id relationships with RLS on parent tables.
-- Students can see items of their orders. Operators can see items for their storefront's orders.
DROP POLICY IF EXISTS "Students can view their marketplace order items" ON public.marketplace_order_items;
CREATE POLICY "Students can view their marketplace order items"
    ON public.marketplace_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_orders mo
            WHERE mo.id = marketplace_order_id AND mo.student_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Marketplace operators can view their order items" ON public.marketplace_order_items;
CREATE POLICY "Marketplace operators can view their order items"
    ON public.marketplace_order_items FOR SELECT
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'marketplace_operator'::public.user_role AND
        EXISTS (
            SELECT 1 FROM public.marketplace_orders mo
            JOIN public.storefronts s ON mo.storefront_id = s.id
            WHERE mo.id = marketplace_order_id AND s.operator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admin full access on marketplace_order_items" ON public.marketplace_order_items;
CREATE POLICY "Allow admin full access on marketplace_order_items"
    ON public.marketplace_order_items FOR ALL
    USING (is_admin());

-- Grant USAGE on new types to authenticated users
GRANT USAGE ON TYPE public.marketplace_order_status TO authenticated;

-- Grant necessary permissions on new tables to the 'authenticated' and other roles as per policies
-- For storefronts
GRANT SELECT ON public.storefronts TO authenticated;
GRANT INSERT (operator_id, name, description, logo_url, banner_url, is_active),
      UPDATE (name, description, logo_url, banner_url, is_active),
      DELETE 
ON public.storefronts TO authenticated; -- Policies will restrict actual operations

-- For marketplace_products
GRANT SELECT ON public.marketplace_products TO authenticated;
GRANT INSERT (storefront_id, name, description, price, category, images, stock_quantity, attributes, is_available),
      UPDATE (name, description, price, category, images, stock_quantity, attributes, is_available),
      DELETE
ON public.marketplace_products TO authenticated; -- Policies will restrict

-- For marketplace_orders
GRANT SELECT ON public.marketplace_orders TO authenticated;
GRANT INSERT (student_user_id, storefront_id, total_price, shipping_address, status),
      UPDATE (status, shipping_address), -- Students/Operators might update status/shipping
      DELETE -- Students/Operators might cancel
ON public.marketplace_orders TO authenticated; -- Policies will restrict

-- For marketplace_order_items
GRANT SELECT ON public.marketplace_order_items TO authenticated;
-- Generally, order items are not directly inserted/updated/deleted by users after order creation via controller.
-- INSERT is handled by function.

-- Make sure helper functions are callable by authenticated users if used in RLS and not SECURITY DEFINER
-- is_admin(), is_student(), is_vendor(), is_club() were already granted in 004_cafeteria_rls_policies.sql
-- If new helper functions are created for 'marketplace_operator', grant them similarly.

COMMIT;
