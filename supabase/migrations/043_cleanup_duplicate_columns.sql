-- Migration: Clean up duplicate columns in marketplace_order_items

BEGIN;

-- First, drop the RLS policies that depend on order_id
DROP POLICY IF EXISTS "Students can view items of their own marketplace orders." ON public.marketplace_order_items;
DROP POLICY IF EXISTS "Operators can view items for their storefront orders." ON public.marketplace_order_items;

-- Now, drop the redundant foreign key constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_order_items_product_id_fkey' 
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP CONSTRAINT marketplace_order_items_product_id_fkey;
    RAISE NOTICE 'Dropped constraint marketplace_order_items_product_id_fkey';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'marketplace_order_items_order_id_fkey' 
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP CONSTRAINT marketplace_order_items_order_id_fkey;
    RAISE NOTICE 'Dropped constraint marketplace_order_items_order_id_fkey';
  END IF;
END $$;

-- Drop the duplicate columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketplace_order_items' 
    AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN product_id;
    RAISE NOTICE 'Dropped column product_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketplace_order_items' 
    AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN order_id;
    RAISE NOTICE 'Dropped column order_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketplace_order_items' 
    AND column_name = 'price_at_order'
  ) THEN
    ALTER TABLE public.marketplace_order_items DROP COLUMN price_at_order;
    RAISE NOTICE 'Dropped column price_at_order';
  END IF;
END $$;

-- Recreate the RLS policies using marketplace_order_id instead of order_id
CREATE POLICY "Students can view items of their own marketplace orders." ON public.marketplace_order_items
  FOR SELECT USING (
    marketplace_order_id IN (SELECT id FROM public.marketplace_orders WHERE student_user_id = auth.uid())
  );

CREATE POLICY "Operators can view items for their storefront orders." ON public.marketplace_order_items
  FOR SELECT USING (
    marketplace_order_id IN (
        SELECT mo.id FROM public.marketplace_orders mo
        JOIN public.storefronts sf ON mo.storefront_id = sf.id
        WHERE sf.operator_id = auth.uid()
    )
  );

-- Update the create_marketplace_order function to use the correct column names
CREATE OR REPLACE FUNCTION public.create_marketplace_order(
    p_student_user_id uuid,
    p_storefront_id uuid,
    p_items marketplace_order_item_input[],
    p_total_order_price numeric,
    p_shipping_address jsonb DEFAULT NULL,
    p_student_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id uuid;
    v_input_item public.marketplace_order_item_input;
    v_product record;
    v_calculated_subtotal numeric := 0;
    v_price_at_order numeric;
    v_student_balance numeric;
    v_operator_user_id uuid;
    v_final_total_price numeric;
BEGIN
    -- 1. Input Validations
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF p_storefront_id IS NULL THEN RAISE EXCEPTION 'Storefront ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_total_order_price <= 0 THEN RAISE EXCEPTION 'Total order price must be positive'; END IF;

    -- Verify storefront exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.storefronts WHERE id = p_storefront_id AND is_active = true) THEN
        RAISE EXCEPTION 'Storefront % is not active or does not exist.', p_storefront_id;
    END IF;

    -- Get storefront operator_id
    SELECT operator_id INTO v_operator_user_id FROM public.storefronts WHERE id = p_storefront_id;
    IF v_operator_user_id IS NULL THEN
        RAISE EXCEPTION 'Storefront % does not have a valid operator.', p_storefront_id;
    END IF;

    -- 2. Pre-check loop: Validate items (availability, stock, price) and calculate subtotal
    FOR v_input_item IN SELECT * FROM unnest(p_items) LOOP
        IF v_input_item.quantity <= 0 THEN 
            RAISE EXCEPTION 'Item quantity must be positive for product %', v_input_item.product_id;
        END IF;

        SELECT id, name, price, stock_quantity, is_available, storefront_id
        INTO v_product
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_input_item.product_id; END IF;
        
        -- Add checks for NULL or negative product price
        IF v_product.price IS NULL THEN
            RAISE EXCEPTION 'Product % (ID: %) has a NULL price, which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id;
        END IF;
        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Product % (ID: %) has a negative price (%), which is not allowed.', COALESCE(v_product.name, 'Unknown Name'), v_input_item.product_id, v_product.price;
        END IF;

        IF v_product.storefront_id <> p_storefront_id THEN 
            RAISE EXCEPTION 'Product % does not belong to storefront %', v_input_item.product_id, p_storefront_id;
        END IF;
        IF NOT v_product.is_available THEN RAISE EXCEPTION 'Product % is not available', v_input_item.product_id; END IF;
        IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)', 
                            v_input_item.product_id, v_product.stock_quantity, v_input_item.quantity;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_product.price * v_input_item.quantity);
    END LOOP;

    -- For now, total price is subtotal. Add tax/fees logic here if needed.
    v_final_total_price := v_calculated_subtotal;

    -- Server-side validation of total price (important!)
    IF abs(v_final_total_price - p_total_order_price) > 0.001 THEN -- Check with a small tolerance for floating point issues
        RAISE EXCEPTION 'Total price mismatch. Client: %, Server: %', p_total_order_price, v_final_total_price;
    END IF;

    -- 3. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < v_final_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_final_total_price;
    END IF;
    
    UPDATE public.profiles SET balance = balance - v_final_total_price WHERE id = p_student_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (p_student_user_id, -v_final_total_price, 'marketplace_purchase_debit', 'Marketplace purchase from storefront ' || p_storefront_id, v_operator_user_id);

    -- 4. Credit Marketplace Operator's Balance
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_final_total_price WHERE id = v_operator_user_id;
    INSERT INTO public.transactions (user_id, amount, type, description, related_user_id)
    VALUES (v_operator_user_id, v_final_total_price, 'marketplace_sale_credit', 'Sale from storefront ' || p_storefront_id || ' to student ' || p_student_user_id, p_student_user_id);

    -- 5. Insert the main marketplace_order record
    INSERT INTO public.marketplace_orders (student_user_id, storefront_id, total_price, shipping_address, status, student_notes)
    VALUES (
        p_student_user_id,
        p_storefront_id,
        v_final_total_price,
        p_shipping_address,
        'processing'::public.marketplace_order_status,
        p_student_notes
    )
    RETURNING id INTO v_order_id;

    -- 6. Loop again: Insert marketplace_order_items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price again inside transaction for consistency, though already fetched for calculation
        SELECT price INTO v_price_at_order
        FROM public.marketplace_products
        WHERE id = v_input_item.product_id;

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id, 
            marketplace_product_id, 
            quantity, 
            price_at_purchase, 
            selected_attributes
        )
        VALUES (
            v_order_id, 
            v_input_item.product_id, 
            v_input_item.quantity, 
            v_price_at_order, 
            v_input_item.selected_attributes
        );

        -- Decrement stock directly using UPDATE
        UPDATE public.marketplace_products
        SET stock_quantity = stock_quantity - v_input_item.quantity
        WHERE id = v_input_item.product_id AND stock_quantity IS NOT NULL;
    END LOOP;

    -- 7. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_marketplace_order for student % and storefront %: %', p_student_user_id, p_storefront_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$function$;

COMMIT; 