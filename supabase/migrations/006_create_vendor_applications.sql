-- Define application status enum type (if not already defined elsewhere)
DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendor_applications Table
CREATE TABLE public.vendor_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'pending'::public.application_status,
  business_name text NOT NULL,
  business_type text NOT NULL,
  other_business_type text, -- For when business_type is 'other'
  contact_person text NOT NULL,
  email text NOT NULL, -- Application contact email, might differ from profile email
  phone text NOT NULL,
  description text,
  established_year integer,
  vendor_type text, -- e.g., 'food', 'merchandise'
  university_affiliation text,
  has_food_license boolean,
  has_business_registration boolean,
  reviewer_notes text, -- Notes from admin during review
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone, -- Timestamp when reviewed
  created_at timestamp with time zone NOT NULL DEFAULT now(), -- Redundant with submitted_at? Keep for consistency or remove.
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Comments
COMMENT ON TABLE public.vendor_applications IS 'Stores applications submitted by users wishing to become vendors.';
COMMENT ON COLUMN public.vendor_applications.user_id IS 'References the profile of the user submitting the application.';
COMMENT ON COLUMN public.vendor_applications.status IS 'Current status of the application.';
COMMENT ON COLUMN public.vendor_applications.email IS 'Contact email provided in the application.';
COMMENT ON COLUMN public.vendor_applications.reviewer_notes IS 'Feedback or notes from the admin who reviewed the application.';
COMMENT ON COLUMN public.vendor_applications.reviewed_at IS 'Timestamp when the application was last reviewed.';

-- Apply the timestamp trigger for updated_at
CREATE TRIGGER set_timestamp_vendor_applications
BEFORE UPDATE ON public.vendor_applications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp(); -- Assumes trigger_set_timestamp exists from migration 003

-- Enable RLS
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_applications
-- Allow users to insert their own application
DROP POLICY IF EXISTS "Allow users to submit their own application" ON public.vendor_applications;
CREATE POLICY "Allow users to submit their own application" ON public.vendor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own application status
DROP POLICY IF EXISTS "Allow users to view their own application" ON public.vendor_applications;
CREATE POLICY "Allow users to view their own application" ON public.vendor_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins full access
DROP POLICY IF EXISTS "Allow admin full access on vendor_applications" ON public.vendor_applications;
CREATE POLICY "Allow admin full access on vendor_applications" ON public.vendor_applications
  FOR ALL USING (public.is_admin()); -- Assumes is_admin() helper exists from migration 004

-- Grant permissions
GRANT SELECT, INSERT ON public.vendor_applications TO authenticated;
-- Admins get full access via their specific policy

-- Indexes
CREATE INDEX idx_vendor_applications_user_id ON public.vendor_applications(user_id);
CREATE INDEX idx_vendor_applications_status ON public.vendor_applications(status);
