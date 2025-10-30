-- Adicionar coluna image_url na tabela products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Criar a conta admin
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Inserir usuário na tabela auth.users se não existir
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'designeflix@gmail.com',
    crypt('designeflix123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Designeflix Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'designeflix@gmail.com'
  )
  RETURNING id INTO admin_user_id;

  -- Se o usuário já existir, buscar o ID
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'designeflix@gmail.com';
  END IF;

  -- Inserir perfil do usuário
  INSERT INTO public.profiles (id, full_name)
  VALUES (admin_user_id, 'Designeflix Admin')
  ON CONFLICT (id) DO NOTHING;

  -- Inserir role de admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;