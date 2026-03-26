# Design: Múltiplos Caixas, Wallets de Membros e Mensalidades

**Data:** 2026-03-26
**Status:** Aprovado

---

## Contexto

O sistema financeiro atual registra lançamentos de sessão (sessao/agape/produto) sem distinguir em qual caixa o dinheiro entra. Não existe controle de mensalidades nem de saldo individual por membro. Esta spec expande o módulo financeiro para suportar múltiplos caixas, wallets individuais e gestão de mensalidades.

---

## Modelo Conceitual

### Dois caixas da loja
- **Bar da Sabedoria** — recebe pagamentos de sessão, ágape e produtos
- **Caixa da Loja** — recebe mensalidades, ofertas e despesas gerais

### Wallet do membro
- Cada membro tem um saldo derivado dos lançamentos: `saldo = total pago − total lançado`
- Saldo negativo = deve para a loja
- Saldo positivo = tem crédito

### Tronco de Solidariedade
- Valor de oferta coletiva por sessão
- Entrada no Caixa da Loja
- 1 registro por sessão (unique)

---

## Schema do Banco

### Decisão de design: Option A — estender `tipo`
O campo `lancamentos.tipo` é estendido para cobrir todos os tipos de transação. O campo `categoria` proposto inicialmente foi eliminado por ser redundante.

```sql
-- 1. Tabela caixas
create table caixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean default true,
  created_at timestamptz default now()
);

insert into caixas (nome, descricao) values
  ('Bar da Sabedoria', 'Custos de sessão, ágape e consumo'),
  ('Caixa da Loja', 'Mensalidades, ofertas e despesas gerais');

-- 2. lancamentos: caixa_id + tipo estendido
alter table lancamentos
  add column caixa_id uuid references caixas(id);

alter table lancamentos
  drop constraint lancamentos_tipo_check;

alter table lancamentos
  add constraint lancamentos_tipo_check check (tipo in (
    'sessao', 'agape', 'produto',
    'mensalidade', 'oferta',
    'deposito', 'outro'
  ));

-- 3. Tronco de Solidariedade
create table tronco_solidariedade (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  valor numeric(10,2) not null default 0,
  observacao text,
  created_at timestamptz default now(),
  unique(sessao_id)
);

-- 4. Mensalidades
create table mensalidades (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  mes_referencia date not null,
  valor numeric(10,2) not null default 0,
  pago boolean default false,
  data_pagamento date,
  created_at timestamptz default now(),
  unique(member_id, mes_referencia)
);

-- RLS: authenticated users can do everything
alter table caixas enable row level security;
alter table tronco_solidariedade enable row level security;
alter table mensalidades enable row level security;

create policy "authenticated_all_caixas" on caixas for all to authenticated using (true) with check (true);
create policy "authenticated_all_tronco" on tronco_solidariedade for all to authenticated using (true) with check (true);
create policy "authenticated_all_mensalidades" on mensalidades for all to authenticated using (true) with check (true);
```

**Nota:** `sessao_id` em `lancamentos` já é nullable no schema — lançamentos de mensalidade terão `sessao_id = null`.

---

## Roteamento por tipo → caixa

| tipo | caixa_id |
|------|----------|
| sessao, agape, produto | Bar da Sabedoria |
| mensalidade, oferta, deposito, outro | Caixa da Loja |

---

## Types (`src/lib/types.ts`)

```ts
// Extensão de Lancamento
tipo: 'sessao' | 'agape' | 'produto' | 'mensalidade' | 'oferta' | 'deposito' | 'outro'

// Novos
type Caixa = { id: string; nome: string; descricao: string | null; ativo: boolean; created_at: string }
type TroncoSolidariedade = { id: string; sessao_id: string; valor: number; observacao: string | null; created_at: string }
type Mensalidade = { id: string; member_id: string; mes_referencia: string; valor: number; pago: boolean; data_pagamento: string | null; created_at: string }
```

---

## Server Actions

### `src/app/actions/financeiro.ts` (atualizar)
- `gerarLancamentos`: busca id do "Bar da Sabedoria" e seta `caixa_id` em todos os lançamentos gerados
- `salvarTronco(sessaoId, valor, observacao)`: upsert em `tronco_solidariedade`

### `src/app/actions/mensalidades.ts` (novo)
- `gerarMensalidades(mesReferencia: string, valor: number)`: insere 1 linha por membro ativo (constraint unique previne duplicatas)
- `marcarMensalidadePaga(mensalidadeId)`: `pago=true`, `data_pagamento=today`, cria lançamento `tipo='mensalidade'` no Caixa da Loja
- `marcarMensalidadesPagasLote(ids[])`: idem em lote

---

## Páginas e Componentes

### Navegação (sidebar)
Submenu expansível para Financeiro com `useState`:
```
▼ Financeiro
    Visão Geral         /financeiro
    Caixas              /financeiro/caixas
    Wallets dos Membros /financeiro/membros
    Mensalidades        /financeiro/mensalidades
```
Quando colapsado: mostra só ícone `DollarSign`.

### `/financeiro/caixas` (nova)
- Server Component; 2 cards lado a lado
- Card: nome, saldo (sum pago), total pendente
- Botão "Ver extrato" → lista de lançamentos do caixa com filtro de período (client component)
- Componente: `src/components/financeiro/caixas-cards.tsx`

### `/financeiro/membros` (nova)
- Server Component; tabela de todos os membros
- Colunas: Nome | Débito pendente | Total pago | Saldo (vermelho/verde)
- "Registrar pagamento" → Sheet com lançamentos pendentes do membro; seleciona e chama `marcarPagoLote`
- Componente: `src/components/financeiro/member-wallets-table.tsx`

### `/financeiro/mensalidades` (nova)
- Seletor de mês/ano
- Botão "Gerar mensalidades" com campo de valor padrão
- Tabela: Nome | Valor | Status | Data pagamento | Ação
- Checkbox para marcar em lote como pagas
- Componente: `src/components/financeiro/mensalidades-table.tsx`

### `/sessoes/[id]` (nova — rota já referenciada, página ainda não existe)
- Abas: Presença | Ágape | Consumo | Financeiro | Tronco
- Reaproveitam os componentes existentes: `PresencaList`, `AgapeList`, `ConsumoForm`, `ResumoFinanceiro`
- Aba "Tronco": `TroncoForm` com campo valor + observação + botão salvar; mostra se já registrado
- Componente: `src/components/sessoes/tronco-form.tsx`

### Dashboard — `MetricsCards` (modificar)
- Adicionar 2 cards: Saldo Bar da Sabedoria | Saldo Caixa da Loja

---

## Arquivos Afetados

### Criar
```
supabase/migrations/20260327000000_multi_caixas.sql
src/app/(dashboard)/financeiro/caixas/page.tsx
src/app/(dashboard)/financeiro/membros/page.tsx
src/app/(dashboard)/financeiro/mensalidades/page.tsx
src/app/(dashboard)/sessoes/[id]/page.tsx
src/components/financeiro/caixas-cards.tsx
src/components/financeiro/member-wallets-table.tsx
src/components/financeiro/mensalidades-table.tsx
src/components/sessoes/tronco-form.tsx
src/app/actions/mensalidades.ts
```

### Modificar
```
src/lib/types.ts
src/app/actions/financeiro.ts
src/components/layout/sidebar.tsx
src/components/dashboard/metrics-cards.tsx
src/components/financeiro/lancamentos-table.tsx  (filtro por caixa — baixa prioridade)
```

### Não tocados
```
src/components/sessoes/presenca-list.tsx
src/components/sessoes/agape-list.tsx
src/components/sessoes/consumo-form.tsx
src/components/sessoes/resumo-financeiro.tsx
src/lib/validations.ts
```

---

## Restrições e Garantias

- Lógica existente de presença e consumo não é alterada
- `gerarLancamentos` continua idempotente (delete + reinsert)
- Constraint `unique(member_id, mes_referencia)` previne mensalidades duplicadas
- Constraint `unique(sessao_id)` em `tronco_solidariedade` previne duplicatas por sessão
- RLS: authenticated users têm acesso total (padrão do projeto)
