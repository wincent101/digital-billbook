-- Create delivery_batches table for storing each delivery round
CREATE TABLE public.delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  batch_number TEXT NOT NULL,
  delivery_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create delivery_batch_items table for items in each delivery batch
CREATE TABLE public.delivery_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  transaction_item_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_batches
CREATE POLICY "Anyone can view delivery batches"
ON public.delivery_batches FOR SELECT
USING (true);

CREATE POLICY "Anyone can create delivery batches"
ON public.delivery_batches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update delivery batches"
ON public.delivery_batches FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete delivery batches"
ON public.delivery_batches FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for delivery_batch_items
CREATE POLICY "Anyone can view delivery batch items"
ON public.delivery_batch_items FOR SELECT
USING (true);

CREATE POLICY "Anyone can create delivery batch items"
ON public.delivery_batch_items FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_delivery_batches_updated_at
BEFORE UPDATE ON public.delivery_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();