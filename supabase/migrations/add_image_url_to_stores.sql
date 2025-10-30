-- Adiciona a coluna 'image_url' à tabela 'stores' se ela ainda não existir.
-- Este comando não apaga dados existentes.
ALTER TABLE public.stores
ADD COLUMN image_url TEXT;