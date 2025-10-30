# 🧪 Como Testar a Página de Setup

Este documento explica como testar localmente a página de instalação do sistema.

## 🚀 Executar Localmente

1. **Instalar dependências:**
```bash
npm install
# ou
bun install
```

2. **Configurar variáveis de ambiente:**

Crie um arquivo `.env` na raiz do projeto com:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_publica
```

3. **Iniciar o servidor de desenvolvimento:**
```bash
npm run dev
# ou
bun run dev
```

4. **Acessar a página de setup:**
```
http://localhost:5173/setup
```

## 📸 O que você deve ver

### 1. Tela Inicial (Antes da Instalação)
- ✅ Título "Instalação do Sistema"
- ✅ Card azul com instruções de pré-requisitos
- ✅ Card com lista de 9 passos de instalação (todos com status "Aguardando")
- ✅ Botão "Iniciar Instalação"
- ✅ Aviso importante sobre o processo

### 2. Durante a Instalação
- ✅ Barra de progresso animada
- ✅ Passos sendo marcados como "Em execução" (azul) e depois "Concluído" (verde)
- ✅ Botão desabilitado com texto "Instalando..."

### 3. Após Instalação Bem-Sucedida
- ✅ Todos os passos marcados como "Concluído" (verde)
- ✅ Novo card verde aparece: "Criar Usuário Administrador"
- ✅ Formulário com 5 campos:
  - Nome da Loja
  - Nome Completo
  - Email
  - Senha
  - Confirmar Senha
- ✅ Botão "Criar Administrador"

### 4. Após Criar Administrador
- ✅ Toast de sucesso
- ✅ Redirecionamento automático para `/login` após 2 segundos

## 🔧 Estrutura de Arquivos Criados/Modificados

```
/workspace/rapid-onyx-9505/
├── INSTRUCOES_INSTALACAO.md          # Instruções completas de instalação
├── TESTE_SETUP.md                     # Este arquivo
├── src/pages/Setup.tsx                # Página de setup atualizada
├── supabase/
│   ├── migrations/
│   │   └── 20251029022239_complete_setup.sql  # Migration completa
│   └── functions/
│       ├── admin-create-user/
│       │   └── index.ts              # Edge function atualizada
│       └── setup-system/
│           └── index.ts              # Edge function de setup
```

## 📝 Fluxo de Instalação

```
1. Usuário acessa /setup
2. Vê instruções e clica em "Iniciar Instalação"
3. Sistema executa edge function "setup-system"
4. Edge function verifica:
   - Existência de tabelas
   - Políticas RLS
   - Funções e triggers
   - Configurações de autenticação
5. Se tudo OK, exibe formulário de criação de admin
6. Usuário preenche dados do administrador
7. Sistema chama edge function "admin-create-user"
8. Cria:
   - Loja
   - Usuário no Supabase Auth
   - Perfil do usuário
   - Role de admin na tabela user_roles
9. Redireciona para /login
```

## 🐛 Solução de Problemas

### Erro: "Edge function not found"
**Solução:** As edge functions precisam ser deployadas:
```bash
supabase functions deploy admin-create-user
supabase functions deploy setup-system
```

### Erro: "Permission denied" ao criar tabelas
**Solução:** Execute a migration SQL primeiro:
```bash
supabase db push
```
Ou copie o conteúdo de `20251029022239_complete_setup.sql` no SQL Editor do Supabase.

### Erro: "SUPABASE_SERVICE_ROLE_KEY não configurado"
**Solução:** Configure o secret:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### Erro ao criar usuário administrador
**Possíveis causas:**
1. Tabela `user_roles` não existe → Execute a migration
2. Email já existe → Use outro email
3. Senha muito curta → Use pelo menos 6 caracteres

## ✅ Checklist de Verificação

Antes de considerar a instalação completa, verifique:

- [ ] Extensões PostgreSQL habilitadas (uuid-ossp, pgcrypto)
- [ ] Migration executada com sucesso
- [ ] Edge functions deployadas
- [ ] Service role key configurada nos secrets
- [ ] Página /setup carrega sem erros
- [ ] Instalação executa sem erros
- [ ] Formulário de admin aparece após instalação
- [ ] Usuário admin criado com sucesso
- [ ] Login funciona com credenciais criadas
- [ ] Usuário tem acesso ao dashboard

## 📚 Documentação Adicional

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
