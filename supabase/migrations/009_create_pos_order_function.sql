-- Migration to update the database function for handling POS order creation atomically,
-- now supporting both cash and online payments and including balance deduction.
-- Final attempt to fix user_id assignment for online orders.

-- Drop existing versions of the function first to avoid conflicts
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[], text, uuid);
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[]);
DROP FUNCTION IF EXISTS public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid); -- Drop the latest signature too

-- Recreate the input type if it doesn't exist (safer than dropping)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pos_order_item_input') THEN
        CREATE TYPE public.pos_order_item_input AS (
            menu_item_id uuid,
            quantity integer,
            special_instructions text
        );
        GRANT USAGE ON TYPE public.pos_order_item_input TO authenticated;
        -- GRANT USAGE ON TYPE public.pos_order_item_input TO service_role;
    END IF;
    -- Ensure payment_method_type exists (safe to run even if it exists)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
        CREATE TYPE public.payment_method_type AS ENUM ('online', 'cash');
        GRANT USAGE ON TYPE public.payment_method_type TO authenticated;
        -- GRANT USAGE ON TYPE public.payment_method_type TO service_role;
    END IF;
END $$;


-- Create or Replace the function with the updated logic and signature
CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_vendor_user_id uuid,          -- The user ID of the vendor creating the order
    p_counter_id uuid,              -- The counter ID where the order is placed
    p_items pos_order_item_input[], -- Array of items being ordered
    p_payment_method public.payment_method_type, -- 'cash' or 'online'
    p_student_user_id uuid DEFAULT NULL -- Required if p_payment_method is 'online'
)
RETURNS uuid -- Returns the ID of the newly created order
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_user_id_for_insert uuid; -- Renamed variable for clarity
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

    -- 2. Check student balance AND DEDUCT if payment is online
    IF p_payment_method = 'online' THEN
        SELECT balance INTO v_student_balance FROM public.profiles WHERE id = p_student_user_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Student profile not found for ID %', p_student_user_id; END IF;
        IF v_student_balance IS NULL OR v_student_balance < v_total_price THEN
            RAISE EXCEPTION 'Insufficient student balance (Available: %, Required: %)', COALESCE(v_student_balance, 0), v_total_price;
        END IF;
        UPDATE public.profiles SET balance = balance - v_total_price WHERE id = p_student_user_id;
        -- Explicitly set the user ID for insert AFTER balance check
        v_user_id_for_insert := p_student_user_id;
    ELSE
        -- Explicitly set the user ID for insert for cash orders
        v_user_id_for_insert := p_vendor_user_id;
    END IF;

    -- 3. Insert the main order record
    INSERT INTO public.orders (user_id, total_price, status, pickup_time, subtotal, tax, payment_method)
    VALUES (
        v_user_id_for_insert, -- Use the explicitly assigned variable
        v_total_price,
        'completed'::public.order_status,
        now(),
        v_total_price,
        0,
        p_payment_method
    )
    RETURNING id INTO v_order_id;

    -- 4. Main loop: Insert order items and update stock
    FOREACH v_input_item IN ARRAY p_items LOOP
        SELECT price INTO v_price_at_order FROM public.menu_items WHERE id = v_input_item.menu_item_id;
        v_item_id_to_insert := v_input_item.menu_item_id;
        v_quantity_to_insert := v_input_item.quantity;
        v_spec_instructions_to_insert := v_input_item.special_instructions;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price_at_order, counter_id, special_instructions, status)
        VALUES (v_order_id, v_item_id_to_insert, v_quantity_to_insert, v_price_at_order, p_counter_id, v_spec_instructions_to_insert, 'delivered'::public.order_item_status);
        UPDATE public.menu_items SET stock = stock - v_quantity_to_insert WHERE id = v_item_id_to_insert AND stock IS NOT NULL;
    END LOOP;

    -- 5. Update Vendor Balance (Original Step Numbering)
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_total_price
    WHERE id = p_vendor_user_id;

    -- 6. Return the new order ID (Original Step Numbering)
    RETURN v_order_id;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in create_pos_order: %', SQLERRM;
    RAISE; -- Re-raise to ensure transaction rollback
END;
$$;

-- Grant execute permission using the new signature
GRANT EXECUTE ON FUNCTION public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_pos_order(uuid, uuid, pos_order_item_input[], public.payment_method_type, uuid) TO service_role;
