-- supabase/migrations/032_create_student_order_function.sql

-- Input type for order items (might exist from POS function)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_order_item_input') THEN
        CREATE TYPE public.pos_order_item_input AS (
            menu_item_id uuid,
            quantity integer,
            special_instructions text
        );
        GRANT USAGE ON TYPE public.pos_order_item_input TO authenticated;
    END IF;
END $$;

-- Function to create a student order atomically
CREATE OR REPLACE FUNCTION public.create_student_order(
    p_student_user_id uuid,         -- The user ID of the student creating the order
    p_items pos_order_item_input[], -- Array of items being ordered
    p_pickup_time timestamptz,      -- Requested pickup time
    p_subtotal numeric,             -- Calculated subtotal (passed from client)
    p_tax numeric,                  -- Calculated tax (passed from client)
    p_total_price numeric           -- Calculated total price (passed from client)
)
RETURNS uuid -- Returns the ID of the newly created order
LANGUAGE plpgsql
SECURITY DEFINER -- To handle balance and stock updates atomically
AS $$
DECLARE
    v_order_id uuid;
    v_input_item public.pos_order_item_input;
    v_menu_item record; -- Used to fetch item details like price, stock, counter_id
    v_price_at_order numeric;
    v_item_id_to_insert uuid;
    v_quantity_to_insert integer;
    v_spec_instructions_to_insert text;
    v_student_balance numeric;
    v_counter_id_for_item uuid; -- To store counter_id for insertion
BEGIN
    -- Input validation
    IF p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_pickup_time IS NULL THEN RAISE EXCEPTION 'Pickup time cannot be null'; END IF;
    IF p_total_price <= 0 THEN RAISE EXCEPTION 'Total price must be positive'; END IF;

    -- 1. Pre-check loop: Validate items (availability, stock)
    FOREACH v_input_item IN ARRAY p_items LOOP
        IF v_input_item.quantity <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive for menu item %', v_input_item.menu_item_id; END IF;

        SELECT id, stock, available, counter_id
        INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_input_item.menu_item_id;

        IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_input_item.menu_item_id; END IF;
        IF NOT v_menu_item.available THEN RAISE EXCEPTION 'Menu item % is not available', v_input_item.menu_item_id; END IF;
        IF v_menu_item.stock IS NOT NULL AND v_menu_item.stock < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for menu item % (available: %, requested: %)', v_input_item.menu_item_id, v_menu_item.stock, v_input_item.quantity;
        END IF;
    END LOOP;

    -- 2. Check student balance AND DEDUCT
    SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE; -- Lock the row
    IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
    IF v_student_balance IS NULL OR v_student_balance < p_total_price THEN
        RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), p_total_price;
    END IF;
    UPDATE public.profiles SET balance = balance - p_total_price WHERE id = p_student_user_id;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method)
    VALUES (
        p_student_user_id,
        p_total_price,
        'pending'::public.order_status, -- Student orders start as pending
        p_pickup_time,
        p_subtotal,
        p_tax,
        'online'::public.payment_method_type -- Student orders are online
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and DECREMENT stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        -- Fetch price and counter_id again inside transaction for consistency
        SELECT price, counter_id
        INTO v_price_at_order, v_counter_id_for_item
        FROM public.menu_items
        WHERE id = v_input_item.menu_item_id;

        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;

        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, v_counter_id_for_item, v_spec_instructions_to_insert, 'pending'::public.order_item_status); -- Items start pending

        -- Decrement stock directly using UPDATE
        UPDATE public.menu_items
        SET stock = stock - v_quantity_to_insert
        WHERE id = v_item_id_to_insert AND stock IS NOT NULL;
    END LOOP;

    -- 5. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_student_order for user %: %', p_student_user_id, SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_student_order(uuid, pos_order_item_input[], timestamptz, numeric, numeric, numeric) TO authenticated;

COMMENT ON FUNCTION public.create_student_order(uuid, pos_order_item_input[], timestamptz, numeric, numeric, numeric) IS 'Creates a student order atomically, validates items, deducts balance, inserts order/items, and decrements stock.';
