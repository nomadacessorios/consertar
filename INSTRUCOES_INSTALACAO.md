# 📦 Instruções de Instalação do Sistema

Este guia completo irá ajudá-lo a configurar o sistema de gestão de assados do zero.

## 📋 Pré-requisitos

Antes de iniciar a instalação pela página `/setup`, você precisa executar os seguintes comandos SQL diretamente no Supabase SQL Editor:

### 1. Habilitar Extensões Necessárias

Execute no SQL Editor do Supabase:

```sql
-- Habilitar extensão UUID (caso não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensão pgcrypto para funções de hash
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Configurar Auto-confirm de Email (Opcional - apenas para desenvolvimento)

Para ambiente de desenvolvimento, você pode desabilitar a confirmação de email:

1. Acesse o Supabase Dashboard
2. Vá em `Authentication` > `Settings` > `Email Auth`
3. Desmarque a opção "Confirm email" (Enable email confirmations)
4. Salve as alterações

**⚠️ ATENÇÃO:** Em produção, mantenha a confirmação de email habilitada por segurança!

### 3. Configurar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis de ambiente estão configuradas no seu projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_publica
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 4. Executar a Migration Completa

Execute a migration SQL que cria toda a estrutura do banco:

**Opção 1: Via Supabase Dashboard**
1. Acesse o Supabase Dashboard
2. Vá em `Database` > `Migrations`
3. Clique em `New migration`
4. Copie e cole o conteúdo do arquivo `/supabase/migrations/20251029022239_complete_setup.sql`
5. Execute a migration

**Opção 2: Via CLI do Supabase**
```bash
# Instalar o Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar o projeto
supabase link --project-ref seu_project_ref

# Executar migrations
supabase db push
```

### 5. Deploy das Edge Functions

As Edge Functions precisam ser deployadas usando o CLI do Supabase:

```bash
# Deploy das edge functions
supabase functions deploy admin-create-user
supabase functions deploy admin-delete-user
supabase functions deploy admin-delete-store
supabase functions deploy setup-system
```

### 6. Configurar Secrets para Edge Functions

As edge functions precisam acessar a Service Role Key:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

**Importante:** Você pode encontrar sua Service Role Key em:
- Supabase Dashboard > Settings > API > `service_role` (secret)

## Processo de Instalação

Após completar os pré-requisitos acima:

1. Acesse a página `/setup` no seu navegador
2. Clique no botão "Iniciar Instalação"
3. Aguarde a conclusão de todos os passos
4. Ao finalizar, crie o usuário administrador usando o formulário
5. Faça login com o usuário administrador criado

## Estrutura Criada

A instalação criará as seguintes estruturas:

### Tabelas Principais
- `stores` - Lojas do sistema
- `profiles` - Perfis de usuários
- `user_roles` - Papéis/permissões dos usuários

### Tabelas de Produtos
- `products` - Produtos
- `product_variations` - Variações de produtos
- `categories` - Categorias (se existir)

### Tabelas de Pedidos
- `orders` - Pedidos
- `order_items` - Itens dos pedidos
- `cash_register` - Caixa

### Tabelas de Fidelidade
- `customers` - Clientes
- `loyalty_rules` - Regras de fidelidade
- `loyalty_transactions` - Transações de fidelidade

### Políticas RLS
Todas as tabelas terão Row Level Security (RLS) configurado com políticas apropriadas.

### Funções e Triggers
- `update_updated_at_column()` - Atualiza automaticamente o campo updated_at
- `handle_new_user()` - Cria perfil ao criar novo usuário
- `has_role()` - Verifica se usuário tem determinado papel

## Troubleshooting

### Erro: "Edge function not found"
- Verifique se as edge functions foram deployadas corretamente
- Execute: `supabase functions list` para ver as functions disponíveis

### Erro: "Permission denied"
- Verifique se o SUPABASE_SERVICE_ROLE_KEY está configurado corretamente
- Certifique-se de estar usando a service role key, não a anon key

### Erro ao criar usuário administrador
- Verifique se a tabela `user_roles` foi criada corretamente
- Confirme que as permissões RLS estão configuradas

## Suporte

Em caso de dúvidas ou problemas, consulte a documentação do Supabase:
- https://supabase.com/docs
- https://supabase.com/docs/guides/functions
