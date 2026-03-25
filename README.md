# Loja Maçônica — Sistema de Gestão

Sistema de gestão para loja maçônica com controle de membros, sessões, presença, consumo de produtos e lançamentos financeiros.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase** (PostgreSQL + Auth + RLS) — instância local
- **Tailwind CSS v4** + shadcn/ui
- **React Hook Form** + Zod
- **Recharts** para gráficos
- **Sonner** para notificações

## Pré-requisitos

- Node.js 20+ (ou Bun)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (para Supabase local)

## Setup

### 1. Instalar dependências

```bash
bun install
```

### 2. Iniciar Supabase local

```bash
cd /path/to/loja-maconica
npx supabase start
```

### 3. Aplicar migrations (cria as tabelas)

```bash
npx supabase db reset
```

Isso cria todas as tabelas com RLS habilitado.

### 4. Criar o primeiro usuário

1. Acesse o Supabase Studio: http://127.0.0.1:54323
2. Vá em **Authentication → Users**
3. Clique em **"Add user"**
4. Informe email e senha
5. Confirme o email diretamente no Studio

### 5. Iniciar o servidor de desenvolvimento

```bash
bun dev
```

Acesse: http://localhost:3000

## Variáveis de Ambiente

Arquivo `.env.local` (já configurado para dev local):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

## Funcionalidades

### Membros (`/members`)
- Cadastro, edição e exclusão de membros
- Filtro por status (ativo/inativo) e busca por nome
- Campos: nome, nome histórico, cargo, data de nascimento

### Sessões (`/sessoes`)
- Cadastro e gerenciamento de sessões
- Painel completo com 4 abas:
  - **Presença**: marcar quais membros estiveram presentes
  - **Ágape**: subconjunto dos presentes que ficaram para o ágape
  - **Consumo**: registrar consumo individual de produtos (cerveja, água, etc.)
  - **Financeiro**: gerar lançamentos automaticamente e ver resumo

### Lógica Financeira
- **`custo_extra`** com `tem_agape=false`: dividido igualmente entre todos os presentes → tipo `sessao`
- **`custo_extra`** com `tem_agape=true`: dividido igualmente entre presentes no ágape → tipo `agape`
- **Consumo individual**: cada item gera lançamento individual → tipo `produto`

### Financeiro (`/financeiro`)
- Lista todos os lançamentos com filtros (membro, tipo, status, sessão)
- Marcar como pago individualmente ou em lote
- Visão por membro com opção "Quitar tudo"

### Produtos (`/produtos`)
- Cadastro e edição de produtos (cerveja, água, etc.)
- Produtos não são excluídos — apenas inativados

### Dashboard (`/`)
- Total de membros ativos
- Sessões realizadas no mês
- Total de inadimplentes e valor pendente
- Próxima sessão agendada
- Gráfico de presença nas últimas 6 sessões
- Top 5 maiores devedores

## Desenvolvimento

```bash
# Dev server
bun dev

# Build de produção
bun run build

# Verificar tipos
bunx tsc --noEmit
```
