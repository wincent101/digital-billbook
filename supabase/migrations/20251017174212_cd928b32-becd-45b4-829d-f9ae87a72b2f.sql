-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view customers"
ON public.customers
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create customers"
ON public.customers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
ON public.customers
FOR UPDATE
USING (true);

-- Add customer_id to pos_transactions
ALTER TABLE public.pos_transactions
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create trigger for customers updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster customer lookups
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_phone ON public.customers(phone);