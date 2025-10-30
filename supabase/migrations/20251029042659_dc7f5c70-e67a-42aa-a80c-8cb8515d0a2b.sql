-- Create default store for admin user
INSERT INTO public.stores (name, slug)
VALUES ('Loja Principal', 'loja-principal')
ON CONFLICT (slug) DO NOTHING;