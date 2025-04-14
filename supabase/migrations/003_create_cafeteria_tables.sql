-- Migration to create cafeteria related tables

-- 1. Counters Table
CREATE TABLE public.counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to vendor profile, set null if vendor deleted? Or CASCADE? Decide based on requirements.
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.counters IS 'Represents vendor counters or stalls within the cafeteria.';
COMMENT ON COLUMN public.counters.vendor_id IS 'References the vendor (profile) operating this counter.';

-- Enable RLS for counters
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- 2. Menu Items Table
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_id uuid NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE, -- If counter is deleted, delete its items
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  category text,
  allergens text[], -- Array of text for allergens
  ingredients text[], -- Array of text for ingredients
  images text[], -- Array of text for image URLs
  available boolean NOT NULL DEFAULT true,
  stock integer CHECK (stock >= 0), -- Optional stock level
  is_diet_food boolean NOT NULL DEFAULT false,
  calories integer CHECK (calories >= 0), -- Relevant if is_diet_food is true
  protein numeric CHECK (protein >= 0),
  carbs numeric CHECK (carbs >= 0),
  fat numeric CHECK (fat >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.menu_items IS 'Stores details about individual food or beverage items offered.';
COMMENT ON COLUMN public.menu_items.counter_id IS 'References the counter offering this item.';
COMMENT ON COLUMN public.menu_items.allergens IS 'List of potential allergens.';
COMMENT ON COLUMN public.menu_items.ingredients IS 'List of ingredients.';
COMMENT ON COLUMN public.menu_items.images IS 'URLs for item images.';
COMMENT ON COLUMN public.menu_items.stock IS 'Current stock level, if tracked.';
COMMENT ON COLUMN public.menu_items.is_diet_food IS 'Flag indicating if item has detailed nutritional info.';
COMMENT ON COLUMN public.menu_items.calories IS 'Calorie count, primarily for diet food.';

-- Enable RLS for menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 3. Orders Table
-- Define order status enum type
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link to student profile, SET NULL if student deleted?
  -- Alternative for POS: user_id could be nullable or use a specific POS user ID
  total_price numeric NOT NULL CHECK (total_price >= 0),
  subtotal numeric CHECK (subtotal >= 0),
  tax numeric CHECK (tax >= 0),
  status public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
  pickup_time timestamp with time zone, -- Requested pickup time
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.orders IS 'Represents a customer order placed in the cafeteria.';
COMMENT ON COLUMN public.orders.user_id IS 'References the student (profile) who placed the order. Nullable for POS?';
COMMENT ON COLUMN public.orders.status IS 'Current status of the overall order.';
COMMENT ON COLUMN public.orders.pickup_time IS 'The requested time for order pickup.';

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Order Items Table
-- Define order item status enum type
CREATE TYPE public.order_item_status AS ENUM (
  'pending',
  'delivered' -- Can add more like 'cancelled_item' if needed
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, -- If order is deleted, delete its items
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT, -- Prevent deleting menu item if part of an order? Or SET NULL?
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_order numeric NOT NULL CHECK (price_at_order >= 0), -- Price of the item when the order was placed
  counter_id uuid NOT NULL REFERENCES public.counters(id) ON DELETE RESTRICT, -- Denormalized for easier filtering by vendor/counter. RESTRICT deletion if items exist?
  special_instructions text,
  status public.order_item_status NOT NULL DEFAULT 'pending'::public.order_item_status,
  created_at timestamp with time zone NOT NULL DEFAULT now()
  -- No updated_at needed? Status change handled by vendor actions.
);

COMMENT ON TABLE public.order_items IS 'Represents individual items within an order.';
COMMENT ON COLUMN public.order_items.order_id IS 'References the parent order.';
COMMENT ON COLUMN public.order_items.menu_item_id IS 'References the menu item ordered.';
COMMENT ON COLUMN public.order_items.price_at_order IS 'The price of one unit of the item at the time of order.';
COMMENT ON COLUMN public.order_items.counter_id IS 'Denormalized reference to the counter fulfilling this item.';
COMMENT ON COLUMN public.order_items.special_instructions IS 'Customer notes for this specific item.';
COMMENT ON COLUMN public.order_items.status IS 'Status of the individual item within the order (e.g., for partial delivery).';

-- Enable RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Add indexes for frequently queried columns
CREATE INDEX idx_menu_items_counter_id ON public.menu_items(counter_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX idx_order_items_counter_id ON public.order_items(counter_id);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with 'updated_at'
CREATE TRIGGER set_timestamp_counters
BEFORE UPDATE ON public.counters
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_menu_items
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Note: RLS policies will be added in the next step.
