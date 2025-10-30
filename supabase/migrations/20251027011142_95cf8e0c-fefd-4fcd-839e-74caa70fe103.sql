-- Add payment_method enum type
CREATE TYPE payment_method AS ENUM ('pix', 'credito', 'debito', 'dinheiro', 'fidelidade');

-- Add delivery and payment columns to orders table
ALTER TABLE public.orders
ADD COLUMN delivery BOOLEAN DEFAULT false,
ADD COLUMN delivery_fee NUMERIC DEFAULT 0,
ADD COLUMN payment_method payment_method,
ADD COLUMN change_for NUMERIC,
ADD COLUMN delivery_address TEXT,
ADD COLUMN delivery_number TEXT,
ADD COLUMN delivery_reference TEXT,
ADD COLUMN delivery_cep TEXT;

-- Add loyalty points to customers table
ALTER TABLE public.customers
ADD COLUMN points INTEGER DEFAULT 0;

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage categories from their store"
ON public.categories
FOR ALL
USING (store_id IN (
  SELECT store_id FROM profiles WHERE id = auth.uid()
));

-- Add category_id and stock_quantity to products
ALTER TABLE public.products
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN stock_quantity INTEGER DEFAULT 0;

-- Create loyalty_transactions table
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for loyalty_transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loyalty transactions from their store"
ON public.loyalty_transactions
FOR SELECT
USING (customer_id IN (
  SELECT id FROM customers WHERE store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can insert loyalty transactions from their store"
ON public.loyalty_transactions
FOR INSERT
WITH CHECK (customer_id IN (
  SELECT id FROM customers WHERE store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
));

-- Add trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();