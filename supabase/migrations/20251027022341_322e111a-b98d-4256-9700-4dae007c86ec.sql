-- Adicionar política RLS para usuários visualizarem sua própria loja
CREATE POLICY "Users can view their own store"
ON public.stores
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Adicionar política RLS para usuários atualizarem sua própria loja
CREATE POLICY "Users can update their own store"
ON public.stores
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);