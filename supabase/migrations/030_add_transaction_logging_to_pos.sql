-- Drop the existing function to replace it
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, public.pos_order_item_input[], public.payment_method_type, uuid);

-- Recreate the function with transaction logging added
CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_vendor_user_id uuid,
    p_counter_id uuid,
    p_items public.pos_order_item_input[],
    p_payment_method public.payment_method_type,
    p_student_user_id uuid DEFAULT NULL -- Optional student ID for online payments
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id uuid;
    v_total_price numeric := 0;
    v_input_item public.pos_order_item_input;
    v_menu_item record;
    v_price_at_order numeric;
    v_item_id_to_insert uuid;
    v_quantity_to_insert integer;
    v_spec_instructions_to_insert text;
    v_student_balance numeric;
    v_user_id_for_order_insert uuid; -- User ID to associate with the order record itself
    v_transaction_description text;
BEGIN
    -- Input validation
    IF p_vendor_user_id IS NULL THEN RAISE EXCEPTION 'Vendor user ID cannot be null'; END IF;
    IF p_counter_id IS NULL THEN RAISE EXCEPTION 'Counter ID cannot be null'; END IF;
    IF p_payment_method IS NULL THEN RAISE EXCEPTION 'Payment method cannot be null'; END IF;
    IF array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
    IF p_payment_method = 'online' AND p_student_user_id IS NULL THEN RAISE EXCEPTION 'Student user ID is required for online payments.'; END IF;

    -- 1. Pre-check loop: Validate items and calculate total price
    FOREACH v_input_item IN ARRAY p_items LOOP
        IF v_input_item.quantity <= 0 THEN RAISE EXCEPTION 'Item quantity must be positive for menu item %', v_input_item.menu_item_id; END IF;
        SELECT id, price, stock, available, counter_id INTO v_menu_item FROM public.menu_items WHERE id = v_input_item.menu_item_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_input_item.menu_item_id; END IF;
        IF v_menu_item.counter_id != p_counter_id THEN RAISE EXCEPTION 'Menu item % does not belong to counter %', v_input_item.menu_item_id, p_counter_id; END IF;
        IF NOT v_menu_item.available THEN RAISE EXCEPTION 'Menu item % is not available', v_input_item.menu_item_id; END IF;
        IF v_menu_item.stock IS NOT NULL AND v_menu_item.stock < v_input_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for menu item % (available: %, requested: %)', v_input_item.menu_item_id, v_menu_item.stock, v_input_item.quantity;
        END IF;
        v_total_price := v_total_price + (v_menu_item.price * v_input_item.quantity);
    END LOOP;

    -- 2. Handle payment type specifics (balance check/deduction and setting user ID for order)
    IF p_payment_method = 'online' THEN
        -- Check student balance AND DEDUCT
        SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
        IF v_student_balance IS NULL OR v_student_balance < v_total_price THEN
            RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_total_price;
        END IF;
        UPDATE public.profiles SET balance = balance - v_total_price WHERE id = p_student_user_id;
        v_user_id_for_order_insert := p_student_user_id; -- Associate order with student

        -- *** ADDED: Log student transaction ***
        v_transaction_description := 'Cafeteria Order Purchase (Online)';
        INSERT INTO public.transactions (user_id, amount, type, description, order_id, related_user_id)
        VALUES (p_student_user_id, v_total_price, 'purchase', v_transaction_description, NULL, p_vendor_user_id); -- order_id set later

    ELSE -- Cash payment
        v_user_id_for_order_insert := p_vendor_user_id; -- Associate order with vendor for cash POS
        v_transaction_description := 'POS Cash Sale'; -- Description for vendor transaction
    END IF;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method, student_id) -- Added student_id column
    VALUES (
        v_user_id_for_order_insert,
        v_total_price,
        'completed'::public.order_status, -- POS orders are immediately completed
        now(),
        v_total_price, -- Assuming no tax/subtotal calculation for now
        0,
        p_payment_method,
        CASE WHEN p_payment_method = 'online' THEN p_student_user_id ELSE NULL END -- Store student_id if online
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and update stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        SELECT price INTO v_price_at_order FROM public.menu_items WHERE id = v_input_item.menu_item_id;
        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, p_counter_id, v_spec_instructions_to_insert, 'delivered'::public.order_item_status); -- POS items are immediately delivered
        -- Decrement stock using the dedicated function (safer)
        PERFORM public.decrement_menu_item_stock(v_item_id_to_insert, v_quantity_to_insert);
    END LOOP;

    -- 5. Update Vendor Balance
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_total_price
    WHERE id = p_vendor_user_id;

    -- *** ADDED: Log vendor transaction ***
    INSERT INTO public.transactions (user_id, amount, type, description, order_id, related_user_id)
    VALUES (
        p_vendor_user_id,
        v_total_price,
        'sale', -- Assuming 'sale' type exists
        v_transaction_description, -- Use description set earlier based on payment type
        v_order_id,
        CASE WHEN p_payment_method = 'online' THEN p_student_user_id ELSE NULL END -- Related user is student if online
    );

    -- *** ADDED: Update student transaction with order_id if it was online ***
    IF p_payment_method = 'online' THEN
        UPDATE public.transactions
        SET order_id = v_order_id
        WHERE user_id = p_student_user_id
          AND type = 'purchase'
          AND order_id IS NULL -- Avoid updating unrelated transactions
          AND created_at >= now() - interval '5 seconds'; -- Safety check: only update recent ones
    END IF;


    -- 6. Return the new order ID
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_pos_order: %', SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;
