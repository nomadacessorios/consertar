-- Adicionar campos à tabela stores para customização
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- Adicionar campos à tabela orders para reserva e horário
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS reservation_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time TIME;