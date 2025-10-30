-- =====================================================
-- MIGRATION: Add Order Status Configuration
-- Description: Allows stores to customize order status flow
-- =====================================================

-- Create table for order status configuration
CREATE TABLE IF NOT EXISTS public.order_status_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    status_key TEXT NOT NULL, -- 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
    status_label TEXT NOT NULL, -- Custom label for the status
    is_active BOOLEAN DEFAULT true, -- If false, this status is skipped
    display_order INTEGER NOT NULL, -- Order to display in the panel
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, status_key)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_status_config_store_id ON public.order_status_config(store_id);

-- Enable RLS
ALTER TABLE public.order_status_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage status config from their store" ON public.order_status_config;
CREATE POLICY "Users can manage status config from their store"
    ON public.order_status_config FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Grant permissions
GRANT ALL ON public.order_status_config TO authenticated;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_order_status_config_updated_at ON public.order_status_config;
CREATE TRIGGER update_order_status_config_updated_at
    BEFORE UPDATE ON public.order_status_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default status configurations for existing stores
INSERT INTO public.order_status_config (store_id, status_key, status_label, is_active, display_order)
SELECT 
    s.id as store_id,
    status_key,
    status_label,
    true as is_active,
    display_order
FROM public.stores s
CROSS JOIN (
    VALUES 
        ('pending', 'Pendente', 1),
        ('preparing', 'Em Preparo', 2),
        ('ready', 'Pronto', 3),
        ('delivered', 'Entregue', 4),
        ('cancelled', 'Cancelado', 5)
) AS defaults(status_key, status_label, display_order)
ON CONFLICT (store_id, status_key) DO NOTHING;
