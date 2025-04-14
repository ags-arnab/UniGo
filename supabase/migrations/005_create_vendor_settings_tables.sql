-- Migration to create vendor settings and tax tables

-- 1. Vendor Settings Table
CREATE TABLE public.vendor_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE, -- Ensure one settings row per vendor
  shop_name text,
  working_hours jsonb, -- Store as JSON, e.g., [{"day": "Monday", "open": "09:00", "close": "17:00"}, ...] or simpler text[]
  is_open boolean NOT NULL DEFAULT true,
  order_limit integer CHECK (order_limit IS NULL OR order_limit >= 0), -- Max concurrent orders, null means no limit
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_settings IS 'Stores vendor-specific operational settings.';
COMMENT ON COLUMN public.vendor_settings.vendor_id IS 'References the vendor profile these settings belong to.';
COMMENT ON COLUMN public.vendor_settings.working_hours IS 'Operating hours for the vendor shop/counter.';
COMMENT ON COLUMN public.vendor_settings.is_open IS 'Indicates if the shop is currently open for orders.';
COMMENT ON COLUMN public.vendor_settings.order_limit IS 'Maximum number of concurrent orders allowed.';

-- Apply the existing timestamp trigger
CREATE TRIGGER set_timestamp_vendor_settings
BEFORE UPDATE ON public.vendor_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.vendor_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_settings
DROP POLICY IF EXISTS "Allow vendors to view their own settings" ON public.vendor_settings;
CREATE POLICY "Allow vendors to view their own settings" ON public.vendor_settings
  FOR SELECT USING (public.is_vendor() AND vendor_id = auth.uid());

DROP POLICY IF EXISTS "Allow vendors to update their own settings" ON public.vendor_settings;
CREATE POLICY "Allow vendors to update their own settings" ON public.vendor_settings
  FOR UPDATE USING (public.is_vendor() AND vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid()); -- Prevent changing vendor_id

-- Note: INSERT might be handled by a trigger/function upon vendor approval or first login,
-- or allow vendors to insert if their settings row doesn't exist yet.
-- For now, assuming row exists or is created elsewhere. If vendors need to create:
-- DROP POLICY IF EXISTS "Allow vendors to create their own settings" ON public.vendor_settings;
-- CREATE POLICY "Allow vendors to create their own settings" ON public.vendor_settings
--   FOR INSERT WITH CHECK (public.is_vendor() AND vendor_id = auth.uid());

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on vendor_settings" ON public.vendor_settings;
CREATE POLICY "Allow admin full access on vendor_settings" ON public.vendor_settings
  FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT SELECT, UPDATE ON public.vendor_settings TO authenticated;
-- GRANT INSERT ON public.vendor_settings TO authenticated; -- If vendors can create


-- 2. Tax Rates Table
CREATE TABLE public.tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 1), -- Store as decimal, e.g., 0.15 for 15%
  description text, -- Optional description
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tax_rates IS 'Stores tax rates configured by vendors.';
COMMENT ON COLUMN public.tax_rates.vendor_id IS 'References the vendor profile these tax rates belong to.';
COMMENT ON COLUMN public.tax_rates.name IS 'Name of the tax (e.g., VAT, Service Charge).';
COMMENT ON COLUMN public.tax_rates.rate IS 'Tax rate as a decimal (0.0 to 1.0).';
COMMENT ON COLUMN public.tax_rates.is_active IS 'Whether this tax rate is currently applied.';

-- Apply the existing timestamp trigger
CREATE TRIGGER set_timestamp_tax_rates
BEFORE UPDATE ON public.tax_rates
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_rates
DROP POLICY IF EXISTS "Allow vendors to manage their own tax rates" ON public.tax_rates;
CREATE POLICY "Allow vendors to manage their own tax rates" ON public.tax_rates
  FOR ALL USING (public.is_vendor() AND vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on tax_rates" ON public.tax_rates;
CREATE POLICY "Allow admin full access on tax_rates" ON public.tax_rates
  FOR ALL USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;


-- 3. Indexes
CREATE INDEX idx_vendor_settings_vendor_id ON public.vendor_settings(vendor_id);
CREATE INDEX idx_tax_rates_vendor_id ON public.tax_rates(vendor_id);
