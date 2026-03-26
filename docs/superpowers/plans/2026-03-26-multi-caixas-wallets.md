# Multi-Caixas, Wallets e Mensalidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the financial module to support two named cash registers (caixas), individual member wallets, and monthly dues (mensalidades), without breaking existing session/attendance/consumption logic.

**Architecture:** Foundation-first — DB migration → types → actions → UI. The two caixas are static seed data resolved by name at query time. Member wallets are derived from the existing `lancamentos` table (no separate balance table). Mensalidades live in their own table and generate `lancamentos` on payment.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Shadcn UI, Sonner (toast), Lucide icons.

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260327000000_multi_caixas.sql` | DB schema changes |
| `src/app/actions/mensalidades.ts` | Server actions for mensalidades |
| `src/components/sessoes/tronco-form.tsx` | Tronco de Solidariedade input on sessão detail |
| `src/components/financeiro/caixas-cards.tsx` | Two caixa balance cards |
| `src/components/financeiro/member-wallets-table.tsx` | Member wallet table + payment sheet |
| `src/components/financeiro/mensalidades-table.tsx` | Mensalidades table + generate + batch pay |
| `src/app/(dashboard)/sessoes/[id]/page.tsx` | Sessão detail (tabs: Presença/Ágape/Consumo/Financeiro/Tronco) |
| `src/app/(dashboard)/financeiro/caixas/page.tsx` | Caixas page |
| `src/app/(dashboard)/financeiro/membros/page.tsx` | Member wallets page |
| `src/app/(dashboard)/financeiro/mensalidades/page.tsx` | Mensalidades page |

### Modify
| File | Change |
|------|--------|
| `src/lib/types.ts` | Extend `Lancamento.tipo`, add `Caixa`, `TroncoSolidariedade`, `Mensalidade` |
| `src/app/actions/financeiro.ts` | Set `caixa_id` in `gerarLancamentos`, add `salvarTronco` |
| `src/components/layout/sidebar.tsx` | Expandable Financeiro submenu |
| `src/components/dashboard/metrics-cards.tsx` | Add 2 caixa balance cards |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260327000000_multi_caixas.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260327000000_multi_caixas.sql

-- 1. caixas
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

-- 2. lancamentos: add caixa_id + extend tipo check
alter table lancamentos
  add column caixa_id uuid references caixas(id);

alter table lancamentos
  drop constraint if exists lancamentos_tipo_check;

alter table lancamentos
  add constraint lancamentos_tipo_check check (tipo in (
    'sessao', 'agape', 'produto',
    'mensalidade', 'oferta',
    'deposito', 'outro'
  ));

-- sessao_id is already nullable in the schema — no change needed

-- 3. tronco_solidariedade
create table tronco_solidariedade (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  valor numeric(10,2) not null default 0,
  observacao text,
  created_at timestamptz default now(),
  unique(sessao_id)
);

-- 4. mensalidades
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

-- 5. RLS
alter table caixas enable row level security;
alter table tronco_solidariedade enable row level security;
alter table mensalidades enable row level security;

create policy "authenticated_all_caixas"
  on caixas for all to authenticated using (true) with check (true);

create policy "authenticated_all_tronco"
  on tronco_solidariedade for all to authenticated using (true) with check (true);

create policy "authenticated_all_mensalidades"
  on mensalidades for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
# or, if using local dev:
# supabase migration up
```

Expected: no errors. Tables `caixas`, `tronco_solidariedade`, `mensalidades` created. `lancamentos` has `caixa_id` column and extended `tipo` constraint.

- [ ] **Step 3: Verify seeds**

In Supabase Studio (or `supabase db remote commit`), run:
```sql
select id, nome from caixas;
```
Expected: 2 rows — "Bar da Sabedoria" and "Caixa da Loja".

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260327000000_multi_caixas.sql
git commit -m "feat: migration for caixas, tronco and mensalidades"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update types.ts**

Replace the entire file content:

```typescript
export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  data_nascimento: string | null
  cargo: string | null
  ativo: boolean
  created_at: string
}

export type Sessao = {
  id: string
  data: string
  descricao: string | null
  custo_sessao: number
  custo_sessao_descricao: string | null
  custo_agape: number
  custo_agape_descricao: string | null
  tem_agape: boolean
  created_at: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  descricao: string | null
  ativo: boolean
  created_at: string
}

export type PresencaSessao = {
  id: string
  sessao_id: string
  member_id: string
}

export type PresencaAgape = {
  id: string
  sessao_id: string
  member_id: string
}

export type ConsumoProduto = {
  id: string
  sessao_id: string
  member_id: string
  produto_id: string
  quantidade: number
  created_at: string
}

export type Lancamento = {
  id: string
  sessao_id: string | null
  member_id: string | null
  tipo: 'sessao' | 'agape' | 'produto' | 'mensalidade' | 'oferta' | 'deposito' | 'outro'
  descricao: string | null
  valor: number
  pago: boolean
  data_pagamento: string | null
  caixa_id: string | null
  created_at: string
}

export type Caixa = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

export type TroncoSolidariedade = {
  id: string
  sessao_id: string
  valor: number
  observacao: string | null
  created_at: string
}

export type Mensalidade = {
  id: string
  member_id: string
  mes_referencia: string
  valor: number
  pago: boolean
  data_pagamento: string | null
  created_at: string
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: extend types for caixas, tronco and mensalidades"
```

---

## Task 3: Update financeiro actions

**Files:**
- Modify: `src/app/actions/financeiro.ts`

- [ ] **Step 1: Update gerarLancamentos to set caixa_id**

In `src/app/actions/financeiro.ts`, replace the entire file:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getBarSabedoriaId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase
    .from('caixas')
    .select('id')
    .eq('nome', 'Bar da Sabedoria')
    .single()
  return data?.id ?? null
}

export async function gerarLancamentos(sessaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const barId = await getBarSabedoriaId(supabase)

  // 1. Delete existing lancamentos for this session
  await supabase.from('lancamentos').delete().eq('sessao_id', sessaoId)

  // 2. Fetch all data
  const [
    { data: sessao },
    { data: presencasSessao },
    { data: presencasAgape },
    { data: consumos },
  ] = await Promise.all([
    supabase.from('sessoes').select('*').eq('id', sessaoId).single(),
    supabase.from('presenca_sessao').select('member_id').eq('sessao_id', sessaoId),
    supabase.from('presenca_agape').select('member_id').eq('sessao_id', sessaoId),
    supabase
      .from('consumo_produtos')
      .select('*, produto:produtos(*)')
      .eq('sessao_id', sessaoId),
  ])

  if (!sessao) return { error: 'Sessão não encontrada' }

  const lancamentos: Array<{
    sessao_id: string
    member_id: string
    tipo: 'sessao' | 'agape' | 'produto'
    descricao: string
    valor: number
    pago: boolean
    caixa_id: string | null
  }> = []

  // 3a. Custo da sessão — divide among session presentes
  const custoSessao = Number(sessao.custo_sessao) || 0
  if (custoSessao > 0) {
    const sessionMembers = presencasSessao ?? []
    if (sessionMembers.length > 0) {
      const baseValue = Math.floor((custoSessao / sessionMembers.length) * 100) / 100
      const remainder = Math.round((custoSessao - baseValue * sessionMembers.length) * 100) / 100
      sessionMembers.forEach((p, index) => {
        const valor = index === sessionMembers.length - 1 ? baseValue + remainder : baseValue
        lancamentos.push({
          sessao_id: sessaoId,
          member_id: p.member_id,
          tipo: 'sessao',
          descricao: 'Bar da Sabedoria',
          valor: Math.round(valor * 100) / 100,
          pago: false,
          caixa_id: barId,
        })
      })
    }
  }

  // 3b. Custo do ágape — divide among ágape presentes
  const custoAgape = Number(sessao.custo_agape) || 0
  if (custoAgape > 0) {
    const agapeMembers = presencasAgape ?? []
    if (agapeMembers.length > 0) {
      const baseValue = Math.floor((custoAgape / agapeMembers.length) * 100) / 100
      const remainder = Math.round((custoAgape - agapeMembers.length * baseValue) * 100) / 100
      agapeMembers.forEach((p, index) => {
        const valor = index === agapeMembers.length - 1 ? baseValue + remainder : baseValue
        lancamentos.push({
          sessao_id: sessaoId,
          member_id: p.member_id,
          tipo: 'agape',
          descricao: 'Bar da Sabedoria',
          valor: Math.round(valor * 100) / 100,
          pago: false,
          caixa_id: barId,
        })
      })
    }
  }

  // 3c. Individual product consumptions
  for (const consumo of consumos ?? []) {
    const produto = consumo.produto as { nome: string; preco: number } | null
    if (!produto) continue
    const valor = Math.round(produto.preco * consumo.quantidade * 100) / 100
    lancamentos.push({
      sessao_id: sessaoId,
      member_id: consumo.member_id,
      tipo: 'produto',
      descricao: `${produto.nome} (${consumo.quantidade}x)`,
      valor,
      pago: false,
      caixa_id: barId,
    })
  }

  // 4. Insert all
  if (lancamentos.length > 0) {
    const { error } = await supabase.from('lancamentos').insert(lancamentos)
    if (error) return { error: error.message }
  }

  // 5. Revalidate
  revalidatePath(`/sessoes/${sessaoId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')

  return { success: true, count: lancamentos.length }
}

export async function marcarPago(lancamentoId: string, pago: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('lancamentos')
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', lancamentoId)

  if (error) return { error: error.message }

  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}

export async function marcarPagoLote(lancamentoIds: string[], pago: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (lancamentoIds.length === 0) return { success: true }

  const { error } = await supabase
    .from('lancamentos')
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
    })
    .in('id', lancamentoIds)

  if (error) return { error: error.message }

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/membros')
  revalidatePath('/')
  return { success: true }
}

export async function salvarTronco(sessaoId: string, valor: number, observacao: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('tronco_solidariedade')
    .upsert(
      { sessao_id: sessaoId, valor, observacao: observacao || null },
      { onConflict: 'sessao_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/sessoes/${sessaoId}`)
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/financeiro.ts
git commit -m "feat: set caixa_id in gerarLancamentos, add salvarTronco action"
```

---

## Task 4: Mensalidades actions

**Files:**
- Create: `src/app/actions/mensalidades.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/actions/mensalidades.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCaixaLojaId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase
    .from('caixas')
    .select('id')
    .eq('nome', 'Caixa da Loja')
    .single()
  return data?.id ?? null
}

// mesReferencia: first day of month, e.g. "2026-03-01"
export async function gerarMensalidades(mesReferencia: string, valor: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id')
    .eq('ativo', true)

  if (membersError) return { error: membersError.message }
  if (!members || members.length === 0) return { error: 'Nenhum membro ativo encontrado' }

  const rows = members.map((m) => ({
    member_id: m.id,
    mes_referencia: mesReferencia,
    valor,
    pago: false,
  }))

  // upsert: ignore if already exists (unique constraint on member_id + mes_referencia)
  const { error } = await supabase
    .from('mensalidades')
    .upsert(rows, { onConflict: 'member_id,mes_referencia', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/mensalidades')
  return { success: true, count: members.length }
}

export async function marcarMensalidadePaga(mensalidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const today = new Date().toISOString().split('T')[0]

  const { data: mensalidade, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .single()

  if (fetchError || !mensalidade) return { error: 'Mensalidade não encontrada' }

  const caixaLojaId = await getCaixaLojaId(supabase)

  // Mark as paid
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: true, data_pagamento: today })
    .eq('id', mensalidadeId)

  if (updateError) return { error: updateError.message }

  // Create lancamento entry so it shows in caixa balance
  const { error: lancError } = await supabase.from('lancamentos').insert({
    sessao_id: null,
    member_id: mensalidade.member_id,
    tipo: 'mensalidade',
    descricao: `Mensalidade ${mensalidade.mes_referencia.substring(0, 7)}`,
    valor: mensalidade.valor,
    pago: true,
    data_pagamento: today,
    caixa_id: caixaLojaId,
  })

  if (lancError) return { error: lancError.message }

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}

export async function marcarMensalidadesPagasLote(mensalidadeIds: string[]) {
  if (mensalidadeIds.length === 0) return { success: true }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const today = new Date().toISOString().split('T')[0]
  const caixaLojaId = await getCaixaLojaId(supabase)

  const { data: mensalidades, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .in('id', mensalidadeIds)
    .eq('pago', false)

  if (fetchError) return { error: fetchError.message }
  if (!mensalidades || mensalidades.length === 0) return { success: true, count: 0 }

  // Mark all as paid
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: true, data_pagamento: today })
    .in('id', mensalidadeIds)

  if (updateError) return { error: updateError.message }

  // Create lancamentos for each
  const lancamentos = mensalidades.map((m) => ({
    sessao_id: null as string | null,
    member_id: m.member_id,
    tipo: 'mensalidade' as const,
    descricao: `Mensalidade ${m.mes_referencia.substring(0, 7)}`,
    valor: m.valor,
    pago: true,
    data_pagamento: today,
    caixa_id: caixaLojaId,
  }))

  const { error: lancError } = await supabase.from('lancamentos').insert(lancamentos)
  if (lancError) return { error: lancError.message }

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true, count: mensalidades.length }
}

export async function desfazerMensalidadePaga(mensalidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: mensalidade, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .single()

  if (fetchError || !mensalidade) return { error: 'Mensalidade não encontrada' }

  // Revert mensalidade
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: false, data_pagamento: null })
    .eq('id', mensalidadeId)

  if (updateError) return { error: updateError.message }

  // Remove the related lancamento (match by member_id + tipo + mes_referencia in descricao)
  await supabase
    .from('lancamentos')
    .delete()
    .eq('member_id', mensalidade.member_id)
    .eq('tipo', 'mensalidade')
    .eq('descricao', `Mensalidade ${mensalidade.mes_referencia.substring(0, 7)}`)

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/mensalidades.ts
git commit -m "feat: mensalidades server actions"
```

---

## Task 5: Sidebar submenu

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Replace sidebar with submenu support**

```typescript
// src/components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, DollarSign, Package,
  ChevronLeft, ChevronRight, Triangle, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const financeiroSubItems = [
  { href: '/financeiro', label: 'Visão Geral', exact: true },
  { href: '/financeiro/caixas', label: 'Caixas' },
  { href: '/financeiro/membros', label: 'Wallets dos Membros' },
  { href: '/financeiro/mensalidades', label: 'Mensalidades' },
]

const topNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [financeiroOpen, setFinanceiroOpen] = useState(true)
  const pathname = usePathname()

  const isFinanceiroActive = pathname.startsWith('/financeiro')

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300',
        'bg-[hsl(var(--sidebar))]',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 p-4 border-b border-border', collapsed && 'justify-center')}>
        <Triangle className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
        {!collapsed && <span className="font-bold text-sm text-primary">Luz da Sabedoria, Prosperidade e Fraternidade</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {topNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}

        {/* Financeiro with submenu */}
        {collapsed ? (
          <Link
            href="/financeiro"
            className={cn(
              'flex items-center justify-center px-2 py-2 rounded-md text-sm transition-colors',
              isFinanceiroActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <DollarSign className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <div>
            <button
              onClick={() => setFinanceiroOpen((v) => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isFinanceiroActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <DollarSign className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Financeiro</span>
              {financeiroOpen
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />}
            </button>

            {financeiroOpen && (
              <div className="ml-7 mt-1 space-y-1">
                {financeiroSubItems.map((sub) => {
                  const isActive = sub.exact
                    ? pathname === sub.href
                    : pathname === sub.href || pathname.startsWith(sub.href + '/')
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        'flex items-center px-3 py-1.5 rounded-md text-xs transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {sub.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4 mr-2" /><span className="text-xs">Recolher</span></>}
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: expandable Financeiro submenu in sidebar"
```

---

## Task 6: TroncoForm component

**Files:**
- Create: `src/components/sessoes/tronco-form.tsx`

- [ ] **Step 1: Create TroncoForm**

```typescript
// src/components/sessoes/tronco-form.tsx
'use client'

import { useState } from 'react'
import { TroncoSolidariedade } from '@/lib/types'
import { salvarTronco } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Save, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TroncoFormProps {
  sessaoId: string
  tronco: TroncoSolidariedade | null
}

export function TroncoForm({ sessaoId, tronco }: TroncoFormProps) {
  const router = useRouter()
  const [valor, setValor] = useState(tronco ? String(tronco.valor) : '')
  const [observacao, setObservacao] = useState(tronco?.observacao ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSalvar() {
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum < 0) {
      toast.error('Valor inválido')
      return
    }
    setLoading(true)
    const result = await salvarTronco(sessaoId, valorNum, observacao)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Tronco de solidariedade salvo!')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {tronco && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600">
            Registrado: <strong>{formatCurrency(tronco.valor)}</strong>
            {tronco.observacao && ` — ${tronco.observacao}`}
          </span>
        </div>
      )}

      <div className="space-y-3 max-w-sm">
        <div className="space-y-1">
          <Label htmlFor="tronco-valor">Valor (R$)</Label>
          <Input
            id="tronco-valor"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="tronco-obs">Observação (opcional)</Label>
          <Input
            id="tronco-obs"
            placeholder="Ex: arrecadado na sessão ordinária"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <Button onClick={handleSalvar} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : tronco ? 'Atualizar' : 'Registrar'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/sessoes/tronco-form.tsx
git commit -m "feat: TroncoForm component"
```

---

## Task 7: Sessão detail page

**Files:**
- Create: `src/app/(dashboard)/sessoes/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/(dashboard)/sessoes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PresencaList } from '@/components/sessoes/presenca-list'
import { AgapeList } from '@/components/sessoes/agape-list'
import { ConsumoForm } from '@/components/sessoes/consumo-form'
import { ResumoFinanceiro } from '@/components/sessoes/resumo-financeiro'
import { TroncoForm } from '@/components/sessoes/tronco-form'
import { formatDate } from '@/lib/utils'
import { Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SessaoDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: sessao },
    { data: members },
    { data: produtos },
    { data: presencasSessao },
    { data: presencasAgape },
    { data: consumosRaw },
    { data: lancamentosRaw },
    { data: tronco },
  ] = await Promise.all([
    supabase.from('sessoes').select('*').eq('id', id).single(),
    supabase.from('members').select('*').order('nome').eq('ativo', true),
    supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    supabase.from('presenca_sessao').select('*').eq('sessao_id', id),
    supabase.from('presenca_agape').select('*').eq('sessao_id', id),
    supabase.from('consumo_produtos').select('*, produto:produtos(*)').eq('sessao_id', id),
    supabase.from('lancamentos').select('*, member:members(*)').eq('sessao_id', id),
    supabase.from('tronco_solidariedade').select('*').eq('sessao_id', id).maybeSingle(),
  ])

  if (!sessao) notFound()

  const consumos = (consumosRaw ?? []).map((c) => ({
    ...c,
    produto: c.produto as { id: string; nome: string; preco: number; descricao: string | null; ativo: boolean; created_at: string } | undefined,
  }))

  const lancamentos = (lancamentosRaw ?? []).map((l) => ({
    ...l,
    member: l.member as { id: string; nome: string } | undefined,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessoes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">
          Sessão — {formatDate(sessao.data)}
        </h1>
      </div>

      {sessao.descricao && (
        <p className="text-muted-foreground text-sm">{sessao.descricao}</p>
      )}

      <Tabs defaultValue="presenca">
        <TabsList className={`grid w-full ${sessao.tem_agape ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
          {sessao.tem_agape && <TabsTrigger value="agape">Ágape</TabsTrigger>}
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="tronco">Tronco</TabsTrigger>
        </TabsList>

        <TabsContent value="presenca" className="mt-4">
          <PresencaList
            sessaoId={id}
            members={members ?? []}
            presencas={presencasSessao ?? []}
          />
        </TabsContent>

        {sessao.tem_agape && (
          <TabsContent value="agape" className="mt-4">
            <AgapeList
              sessaoId={id}
              members={members ?? []}
              presencasSessao={presencasSessao ?? []}
              presencasAgape={presencasAgape ?? []}
            />
          </TabsContent>
        )}

        <TabsContent value="consumo" className="mt-4">
          <ConsumoForm
            sessaoId={id}
            members={members ?? []}
            produtos={produtos ?? []}
            consumos={consumos}
            presencasSessao={presencasSessao ?? []}
          />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <ResumoFinanceiro
            sessao={sessao}
            members={members ?? []}
            presencasSessao={presencasSessao ?? []}
            presencasAgape={presencasAgape ?? []}
            consumos={consumos}
            lancamentos={lancamentos}
          />
        </TabsContent>

        <TabsContent value="tronco" className="mt-4">
          <TroncoForm sessaoId={id} tronco={tronco ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test the page in browser**

Start dev server (`npm run dev`), navigate to `/sessoes`, click the external link icon on any session row. Expected: session detail page loads with tabs.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/sessoes/[id]/page.tsx
git commit -m "feat: sessao detail page with tabs and tronco"
```

---

## Task 8: Caixas page

**Files:**
- Create: `src/components/financeiro/caixas-cards.tsx`
- Create: `src/app/(dashboard)/financeiro/caixas/page.tsx`

- [ ] **Step 1: Create CaixasCards component**

```typescript
// src/components/financeiro/caixas-cards.tsx
'use client'

import { useState, useMemo } from 'react'
import { Caixa, Lancamento } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CaixaComLancamentos extends Caixa {
  lancamentos: Lancamento[]
}

interface CaixasCardsProps {
  caixas: CaixaComLancamentos[]
}

export function CaixasCards({ caixas }: CaixasCardsProps) {
  const [extratoCaixaId, setExtratoCaixaId] = useState<string | null>(null)
  const [filterDe, setFilterDe] = useState('')
  const [filterAte, setFilterAte] = useState('')

  const caixaExtrato = caixas.find((c) => c.id === extratoCaixaId)

  const lancamentosFiltrados = useMemo(() => {
    if (!caixaExtrato) return []
    return caixaExtrato.lancamentos.filter((l) => {
      if (filterDe && l.created_at.substring(0, 10) < filterDe) return false
      if (filterAte && l.created_at.substring(0, 10) > filterAte) return false
      return true
    })
  }, [caixaExtrato, filterDe, filterAte])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caixas.map((caixa) => {
          const saldo = caixa.lancamentos
            .filter((l) => l.pago)
            .reduce((s, l) => s + l.valor, 0)
          const pendente = caixa.lancamentos
            .filter((l) => !l.pago)
            .reduce((s, l) => s + l.valor, 0)
          const isOpen = extratoCaixaId === caixa.id

          return (
            <div key={caixa.id} className="p-4 rounded-lg border border-border space-y-3">
              <div>
                <h3 className="font-semibold text-sm">{caixa.nome}</h3>
                {caixa.descricao && (
                  <p className="text-xs text-muted-foreground">{caixa.descricao}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo (pago)</p>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(saldo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(pendente)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setExtratoCaixaId(isOpen ? null : caixa.id)}
              >
                {isOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {isOpen ? 'Fechar extrato' : 'Ver extrato'}
              </Button>
            </div>
          )
        })}
      </div>

      {extratoCaixaId && caixaExtrato && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-medium text-sm">Extrato — {caixaExtrato.nome}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>De:</span>
              <input
                type="date"
                value={filterDe}
                onChange={(e) => setFilterDe(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background"
              />
              <span>Até:</span>
              <input
                type="date"
                value={filterAte}
                onChange={(e) => setFilterAte(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.created_at.substring(0, 10))}</TableCell>
                      <TableCell className="text-sm">{l.descricao ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(l.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                          {l.pago ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {lancamentosFiltrados.length} lançamento(s) — Total pago: {formatCurrency(lancamentosFiltrados.filter(l => l.pago).reduce((s, l) => s + l.valor, 0))}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create caixas page**

```typescript
// src/app/(dashboard)/financeiro/caixas/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CaixasCards } from '@/components/financeiro/caixas-cards'
import { Landmark } from 'lucide-react'

export default async function CaixasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: caixas }, { data: lancamentos }] = await Promise.all([
    supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
    supabase.from('lancamentos').select('*').not('caixa_id', 'is', null),
  ])

  const caixasComLancamentos = (caixas ?? []).map((caixa) => ({
    ...caixa,
    lancamentos: (lancamentos ?? []).filter((l) => l.caixa_id === caixa.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Caixas</h1>
      </div>
      <CaixasCards caixas={caixasComLancamentos} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/caixas-cards.tsx src/app/(dashboard)/financeiro/caixas/page.tsx
git commit -m "feat: caixas page with balance and extrato"
```

---

## Task 9: Member wallets page

**Files:**
- Create: `src/components/financeiro/member-wallets-table.tsx`
- Create: `src/app/(dashboard)/financeiro/membros/page.tsx`

- [ ] **Step 1: Create MemberWalletsTable component**

```typescript
// src/components/financeiro/member-wallets-table.tsx
'use client'

import { useState } from 'react'
import { Member, Lancamento } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { marcarPagoLote } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: Lancamento[]
}

interface MemberWalletsTableProps {
  members: MemberWithLancamentos[]
}

export function MemberWalletsTable({ members }: MemberWalletsTableProps) {
  const router = useRouter()
  const [sheetMember, setSheetMember] = useState<MemberWithLancamentos | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const pendentes = sheetMember?.lancamentos.filter((l) => !l.pago) ?? []

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openSheet(member: MemberWithLancamentos) {
    setSheetMember(member)
    setSelected(new Set())
  }

  async function handleRegistrarPagamento() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarPagoLote(Array.from(selected), true)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamento(s) marcado(s) como pago(s)`)
      setSheetMember(null)
      router.refresh()
    }
    setLoading(false)
  }

  const membersWithStats = members.map((m) => {
    const debitoPendente = m.lancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
    const totalPago = m.lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const totalLancado = m.lancamentos.reduce((s, l) => s + l.valor, 0)
    const saldo = totalPago - totalLancado
    return { ...m, debitoPendente, totalPago, saldo }
  })

  return (
    <>
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead className="hidden sm:table-cell">Nome Histórico</TableHead>
              <TableHead>Débito Pendente</TableHead>
              <TableHead className="hidden md:table-cell">Total Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersWithStats.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-sm">{m.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {m.nome_historico ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-destructive">
                  {m.debitoPendente > 0 ? formatCurrency(m.debitoPendente) : '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-green-500">
                  {formatCurrency(m.totalPago)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={m.saldo < 0 ? 'destructive' : 'default'}
                    className={cn('text-xs', m.saldo >= 0 && 'bg-green-500/20 text-green-600')}
                  >
                    {formatCurrency(m.saldo)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m.debitoPendente > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => openSheet(m)}
                    >
                      <Wallet className="h-3 w-3 mr-1" />
                      Registrar pagamento
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!sheetMember} onOpenChange={(open) => !open && setSheetMember(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lançamentos pendentes — {sheetMember?.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {pendentes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pendentes.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-3 p-2 rounded border border-border cursor-pointer hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggleSelect(l.id)}
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{l.descricao ?? l.tipo}</p>
                        <p className="text-muted-foreground text-xs capitalize">{l.tipo}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(l.valor)}</span>
                    </label>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selecionado:</span>
                    <span className="font-medium">
                      {formatCurrency(pendentes.filter((l) => selected.has(l.id)).reduce((s, l) => s + l.valor, 0))}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={selected.size === 0 || loading}
                    onClick={handleRegistrarPagamento}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {loading ? 'Registrando...' : `Confirmar ${selected.size} pagamento(s)`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

- [ ] **Step 2: Create membros page**

```typescript
// src/app/(dashboard)/financeiro/membros/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemberWalletsTable } from '@/components/financeiro/member-wallets-table'
import { Wallet } from 'lucide-react'

export default async function MembrosWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: lancamentos }] = await Promise.all([
    supabase.from('members').select('*').eq('ativo', true).order('nome'),
    supabase.from('lancamentos').select('*'),
  ])

  const membersWithLancamentos = (members ?? []).map((m) => ({
    ...m,
    lancamentos: (lancamentos ?? []).filter((l) => l.member_id === m.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Wallets dos Membros</h1>
      </div>
      <MemberWalletsTable members={membersWithLancamentos} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/member-wallets-table.tsx src/app/(dashboard)/financeiro/membros/page.tsx
git commit -m "feat: member wallets page with payment sheet"
```

---

## Task 10: Mensalidades page

**Files:**
- Create: `src/components/financeiro/mensalidades-table.tsx`
- Create: `src/app/(dashboard)/financeiro/mensalidades/page.tsx`

- [ ] **Step 1: Create MensalidadesTable component**

```typescript
// src/components/financeiro/mensalidades-table.tsx
'use client'

import { useState, useMemo } from 'react'
import { Mensalidade, Member } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  gerarMensalidades,
  marcarMensalidadePaga,
  marcarMensalidadesPagasLote,
  desfazerMensalidadePaga,
} from '@/app/actions/mensalidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MensalidadeEnriched = Mensalidade & { member?: Member }

interface MensalidadesTableProps {
  mensalidades: MensalidadeEnriched[]
  mesAtual: string  // "2026-03"
}

export function MensalidadesTable({ mensalidades, mesAtual }: MensalidadesTableProps) {
  const router = useRouter()
  const [mes, setMes] = useState(mesAtual)
  const [valorGerar, setValorGerar] = useState('100')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Filter mensalidades for selected month
  const filtered = useMemo(() => {
    return mensalidades.filter((m) => m.mes_referencia.startsWith(mes))
  }, [mensalidades, mes])

  const pendentes = filtered.filter((m) => !m.pago)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const pendentesIds = pendentes.map((m) => m.id)
    if (selected.size === pendentesIds.length && pendentesIds.every((id) => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendentesIds))
    }
  }

  async function handleGerar() {
    const valorNum = parseFloat(valorGerar.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error('Valor inválido')
      return
    }
    setLoading(true)
    const mesReferencia = `${mes}-01`
    const result = await gerarMensalidades(mesReferencia, valorNum)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Mensalidades geradas para ${result.count} membros`)
      router.refresh()
    }
    setLoading(false)
  }

  async function handlePagarLote() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarMensalidadesPagasLote(Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.count} mensalidade(s) marcada(s) como paga(s)`)
      setSelected(new Set())
      router.refresh()
    }
    setLoading(false)
  }

  async function handleTogglePago(mensalidade: MensalidadeEnriched) {
    if (mensalidade.pago) {
      const result = await desfazerMensalidadePaga(mensalidade.id)
      if (result?.error) toast.error(result.error)
      else router.refresh()
    } else {
      const result = await marcarMensalidadePaga(mensalidade.id)
      if (result?.error) toast.error(result.error)
      else router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Mês de referência</label>
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valor padrão (R$)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={valorGerar}
            onChange={(e) => setValorGerar(e.target.value)}
            className="w-32"
          />
        </div>

        <Button variant="outline" onClick={handleGerar} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Gerar mensalidades
        </Button>

        {selected.size > 0 && (
          <Button onClick={handlePagarLote} disabled={loading}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar {selected.size} como pago
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{filtered.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Pagos</p>
          <p className="text-lg font-bold text-green-500">{filtered.filter((m) => m.pago).length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-lg font-bold text-destructive">{pendentes.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={pendentes.length > 0 && pendentes.every((m) => selected.has(m.id))}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Membro</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Data Pagamento</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma mensalidade para {mes}. Clique em &quot;Gerar mensalidades&quot; para criar.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className={m.pago ? 'opacity-60' : ''}>
                  <TableCell>
                    {!m.pago && (
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleSelect(m.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.member?.nome ?? '—'}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(m.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={m.pago ? 'default' : 'secondary'} className="text-xs">
                      {m.pago ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {m.data_pagamento ? formatDate(m.data_pagamento) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleTogglePago(m)}
                    >
                      {m.pago ? 'Desfazer' : 'Pagar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create mensalidades page**

```typescript
// src/app/(dashboard)/financeiro/mensalidades/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MensalidadesTable } from '@/components/financeiro/mensalidades-table'
import { CalendarDays } from 'lucide-react'

export default async function MensalidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [{ data: mensalidades }, { data: members }] = await Promise.all([
    supabase.from('mensalidades').select('*').order('mes_referencia', { ascending: false }),
    supabase.from('members').select('*').eq('ativo', true).order('nome'),
  ])

  const mensalidadesEnriched = (mensalidades ?? []).map((m) => ({
    ...m,
    member: (members ?? []).find((mb) => mb.id === m.member_id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Mensalidades</h1>
      </div>
      <MensalidadesTable mensalidades={mensalidadesEnriched} mesAtual={mesAtual} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/mensalidades-table.tsx src/app/(dashboard)/financeiro/mensalidades/page.tsx
git commit -m "feat: mensalidades page with generate and batch pay"
```

---

## Task 11: Dashboard metrics — caixa balance cards

**Files:**
- Modify: `src/components/dashboard/metrics-cards.tsx`

- [ ] **Step 1: Add caixa balance queries and cards**

Replace the entire file:

```typescript
// src/components/dashboard/metrics-cards.tsx
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Calendar, AlertTriangle, DollarSign, Clock, Landmark, Coins } from 'lucide-react'

export async function MetricsCards() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    { count: totalAtivos },
    { count: sessoesNoMes },
    { data: inadimplentes },
    { data: valorPendente },
    { data: proximaSessao },
    { data: caixas },
    { data: lancamentosPagos },
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('sessoes').select('id', { count: 'exact', head: true })
      .gte('data', firstOfMonth).lte('data', lastOfMonth),
    supabase.from('lancamentos').select('member_id').eq('pago', false),
    supabase.from('lancamentos').select('valor').eq('pago', false),
    supabase.from('sessoes').select('data').gt('data', today).order('data').limit(1),
    supabase.from('caixas').select('id, nome').eq('ativo', true),
    supabase.from('lancamentos').select('valor, caixa_id').eq('pago', true).not('caixa_id', 'is', null),
  ])

  const totalInadimplentes = new Set((inadimplentes ?? []).map((l) => l.member_id)).size
  const totalValorPendente = (valorPendente ?? []).reduce((s, l) => s + Number(l.valor), 0)

  const barId = (caixas ?? []).find((c) => c.nome === 'Bar da Sabedoria')?.id
  const lojaId = (caixas ?? []).find((c) => c.nome === 'Caixa da Loja')?.id

  const saldoBar = (lancamentosPagos ?? [])
    .filter((l) => l.caixa_id === barId)
    .reduce((s, l) => s + Number(l.valor), 0)

  const saldoLoja = (lancamentosPagos ?? [])
    .filter((l) => l.caixa_id === lojaId)
    .reduce((s, l) => s + Number(l.valor), 0)

  const cards = [
    {
      title: 'Membros Ativos',
      value: String(totalAtivos ?? 0),
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Sessões no Mês',
      value: String(sessoesNoMes ?? 0),
      icon: Calendar,
      color: 'text-blue-400',
    },
    {
      title: 'Inadimplentes',
      value: String(totalInadimplentes),
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
    {
      title: 'Valor Pendente',
      value: formatCurrency(totalValorPendente),
      icon: DollarSign,
      color: 'text-destructive',
    },
    {
      title: 'Próxima Sessão',
      value: proximaSessao?.[0]?.data ? formatDate(proximaSessao[0].data) : '—',
      icon: Clock,
      color: 'text-green-400',
    },
    {
      title: 'Bar da Sabedoria',
      value: formatCurrency(saldoBar),
      icon: Coins,
      color: 'text-amber-500',
    },
    {
      title: 'Caixa da Loja',
      value: formatCurrency(saldoLoja),
      icon: Landmark,
      color: 'text-violet-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => (
        <div key={card.title} className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-xs text-muted-foreground">{card.title}</span>
          </div>
          <p className="text-xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/metrics-cards.tsx
git commit -m "feat: add caixa balance cards to dashboard"
```

---

## Final Verification

- [ ] **Run full build**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Manual smoke test checklist**

Open `http://localhost:3000` (with `npm run dev`) and verify:

1. Sidebar shows Financeiro submenu with 4 items (collapses/expands on click)
2. `/financeiro/caixas` — 2 cards aparecem, "Ver extrato" funciona
3. `/financeiro/membros` — tabela com saldo por membro, sheet de pagamento abre
4. `/financeiro/mensalidades` — gerar mensalidades para o mês atual, marcar como pago
5. `/sessoes/[id]` — abre ao clicar no link externo na tabela; aba Tronco funciona
6. Dashboard — 7 cards incluindo Bar da Sabedoria e Caixa da Loja
7. Na sessão, gerar lançamentos → verificar em Supabase Studio que `caixa_id` está preenchido

- [ ] **Final commit**

```bash
git commit --allow-empty -m "chore: multi-caixas wallets mensalidades feature complete"
```
