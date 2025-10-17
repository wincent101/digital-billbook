-- Add phone number field to business_settings table
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS phone_number TEXT;