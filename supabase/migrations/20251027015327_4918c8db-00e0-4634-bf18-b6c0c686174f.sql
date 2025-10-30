-- Criar tabela para regras de fidelidade
CREATE TABLE public.loyalty_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  description text NOT NULL,
  points_required integer NOT NULL DEFAULT 0,
  reward text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage loyalty rules from their store"
ON public.loyalty_rules
FOR ALL
USING (store_id IN (
  SELECT store_id FROM profiles WHERE id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_loyalty_rules_updated_at
BEFORE UPDATE ON public.loyalty_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();