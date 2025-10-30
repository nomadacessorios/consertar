-- Create product_variations table
CREATE TABLE public.product_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    price_adjustment numeric DEFAULT 0 NOT NULL, -- Can be positive or negative
    stock_quantity integer DEFAULT 0 NOT NULL,
    CONSTRAINT product_variations_pkey PRIMARY KEY (id),
    CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_variations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.product_variations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.product_variations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.product_variations FOR DELETE USING (auth.role() = 'authenticated');

-- Add has_variations column to products table
ALTER TABLE public.products ADD COLUMN has_variations boolean DEFAULT false NOT NULL;

-- Add product_variation_id and variation_name to order_items table
ALTER TABLE public.order_items ADD COLUMN product_variation_id uuid NULL;
ALTER TABLE public.order_items ADD COLUMN variation_name text NULL;

ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_variation_id_fkey FOREIGN KEY (product_variation_id) REFERENCES public.product_variations(id) ON DELETE SET NULL;