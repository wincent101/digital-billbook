-- Add signature_url to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS signature_url text;

-- Add rank column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS rank text DEFAULT 'standard';

-- Add comment to explain rank values
COMMENT ON COLUMN public.customers.rank IS 'Customer rank: standard, silver, gold, platinum, vip';