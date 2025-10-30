-- Criar tabela product_variations se não existir
CREATE TABLE IF NOT EXISTS public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela product_variations
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para product_variations (mesmas permissões que products)
CREATE POLICY "Users can view product variations from their store"
ON public.product_variations FOR SELECT
USING (product_id IN (
  SELECT id FROM public.products
  WHERE store_id IN (
    SELECT store_id FROM public.profiles
    WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can insert product variations in their store"
ON public.product_variations FOR INSERT
WITH CHECK (product_id IN (
  SELECT id FROM public.products
  WHERE store_id IN (
    SELECT store_id FROM public.profiles
    WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can update product variations in their store"
ON public.product_variations FOR UPDATE
USING (product_id IN (
  SELECT id FROM public.products
  WHERE store_id IN (
    SELECT store_id FROM public.profiles
    WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can delete product variations in their store"
ON public.product_variations FOR DELETE
USING (product_id IN (
  SELECT id FROM public.products
  WHERE store_id IN (
    SELECT store_id FROM public.profiles
    WHERE id = auth.uid()
  )
));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_product_variations_updated_at
BEFORE UPDATE ON public.product_variations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna has_variations na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;

-- Adicionar coluna motoboy_whatsapp_number na tabela stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS motoboy_whatsapp_number TEXT;

-- Adicionar colunas variation_name e product_variation_id na tabela order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variation_name TEXT,
ADD COLUMN IF NOT EXISTS product_variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id 
ON public.product_variations(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_variation_id 
ON public.order_items(product_variation_id);