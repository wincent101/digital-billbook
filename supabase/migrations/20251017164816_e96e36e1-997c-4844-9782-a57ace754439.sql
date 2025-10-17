-- Create products table for POS system
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pos_transactions table
CREATE TABLE public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  qr_code_data TEXT,
  payment_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for pos_transactions
CREATE POLICY "Anyone can view transactions"
  ON public.pos_transactions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create transactions"
  ON public.pos_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update transactions"
  ON public.pos_transactions FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete transactions"
  ON public.pos_transactions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for transaction_items
CREATE POLICY "Anyone can view transaction items"
  ON public.transaction_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create transaction items"
  ON public.transaction_items FOR INSERT
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON public.pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX idx_pos_transactions_created_at ON public.pos_transactions(created_at DESC);
CREATE INDEX idx_products_is_active ON public.products(is_active);