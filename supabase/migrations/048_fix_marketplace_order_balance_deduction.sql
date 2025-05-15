-- Migration: Add missing balance deduction logic to create_marketplace_order function

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
    v_product_details jsonb;
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

        SELECT id, name, price, stock_quantity, is_available, storefront_id, images, description, category
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
    IF v_final_total_price <> p_total_order_price THEN
        RAISE EXCEPTION 'Calculated total price (%) does not match provided total price (%)', 
                        v_final_total_price, p_total_order_price;
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
    INSERT INTO public.marketplace_orders (
        student_user_id,
        storefront_id,
        total_price,
        shipping_address,
        status,
        student_notes
    )
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
        -- Fetch product details again inside transaction for consistency
        SELECT 
            p.id, 
            p.name, 
            p.price, 
            p.images,
            p.description,
            p.category,
            s.name as storefront_name
        INTO v_product
        FROM public.marketplace_products p
        JOIN public.storefronts s ON p.storefront_id = s.id
        WHERE p.id = v_input_item.product_id;

        -- Create product snapshot with essential details
        v_product_details := jsonb_build_object(
            'id', v_product.id,
            'name', v_product.name,
            'price', v_product.price,
            'image_url', CASE 
                WHEN v_product.images IS NOT NULL AND array_length(v_product.images, 1) > 0 
                THEN v_product.images[1] 
                ELSE NULL 
            END,
            'storefront_name', v_product.storefront_name,
            'category', v_product.category,
            'description', v_product.description
        );

        -- Use the correct column names according to the cleaned-up table structure
        INSERT INTO public.marketplace_order_items (
            marketplace_order_id, 
            marketplace_product_id, 
            quantity, 
            price_at_purchase, 
            selected_attributes,
            product_snapshot
        )
        VALUES (
            v_order_id, 
            v_input_item.product_id, 
            v_input_item.quantity, 
            v_product.price, 
            v_input_item.selected_attributes,
            v_product_details
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

-- Re-grant execution permission
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.create_marketplace_order(uuid, uuid, marketplace_order_item_input[], numeric, jsonb, text) IS 'Creates a new marketplace order, validates stock/availability, records transaction, debits student balance, and credits merchant balance.';
