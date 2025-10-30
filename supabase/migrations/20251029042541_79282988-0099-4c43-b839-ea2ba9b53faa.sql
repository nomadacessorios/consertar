-- Fix security warnings: Set search_path for functions

-- Update function to update updated_at column with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Update function to generate order number with proper search_path
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO counter
    FROM public.orders
    WHERE order_number LIKE new_number || '%';
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;