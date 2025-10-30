-- Adicionar colunas de programa de fidelidade à tabela products
ALTER TABLE products 
ADD COLUMN earns_loyalty_points boolean NOT NULL DEFAULT FALSE,
ADD COLUMN loyalty_points_value numeric NOT NULL DEFAULT 0.0;