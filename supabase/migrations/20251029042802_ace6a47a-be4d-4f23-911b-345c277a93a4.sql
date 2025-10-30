-- Create initial store
INSERT INTO public.stores (name, slug, created_at, updated_at)
VALUES ('Neto', 'neto', now(), now())
ON CONFLICT (slug) DO NOTHING
RETURNING id;