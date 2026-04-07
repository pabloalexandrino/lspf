# Saídas de Caixa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar saídas de caixa (despesas, reembolsos) vinculadas a um caixa, com formulário, extrato colorido e exclusão.

**Architecture:** Novo tipo `'saida_caixa'` adicionado ao union de `Lancamento.tipo`; server action separado em `saidas-caixa.ts`; formulário de saída em `SaidaCaixaSheet` client component; `CaixasCards` atualizado para receber sessões + membros, recolor extrato e recalcular saldo corretamente.

**Tech Stack:** Next.js 15 App Router, Supabase, zod, react-hook-form, @base-ui/react (Sheet, Input, Label, Button), sonner (toast), lucide-react.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/types.ts` | Modificar | Adicionar `'saida_caixa'` ao union de `Lancamento.tipo` |
| `src/lib/validations.ts` | Modificar | Adicionar `saidaCaixaSchema` e `SaidaCaixaFormData` |
| `src/app/actions/saidas-caixa.ts` | **Criar** | `registrarSaida(data)` e `excluirSaida(id)` server actions |
| `src/app/(dashboard)/financeiro/caixas/page.tsx` | Modificar | Buscar `sessoes` e `members` ativos para passar ao `CaixasCards` |
| `src/components/financeiro/saida-caixa-sheet.tsx` | **Criar** | Sheet com formulário de nova saída (descrição, valor, data, sessão?, membro?) |
| `src/components/financeiro/caixas-cards.tsx` | Modificar | Props sessoes+members; saldo correto; extrato colorido; botão "Registrar Saída"; botão excluir saída |

---

## Task 1: Types + Validations

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Adicionar `saida_caixa` ao union de `Lancamento.tipo`**

Em `src/lib/types.ts`, alterar a linha do `tipo`:

```typescript
export type Lancamento = {
  id: string
  sessao_id: string | null
  member_id: string | null
  tipo: 'sessao' | 'agape' | 'produto' | 'mensalidade' | 'oferta' | 'deposito' | 'outro' | 'saida_caixa'
  descricao: string | null
  valor: number
  pago: boolean
  data_pagamento: string | null
  caixa_id: string | null
  created_at: string
}
```

- [ ] **Step 2: Adicionar `saidaCaixaSchema` em `src/lib/validations.ts`**

Adicionar ao final do arquivo, antes dos `export type`:

```typescript
export const saidaCaixaSchema = z.object({
  caixa_id: z.string().uuid('Caixa inválido'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  data_pagamento: z.string().min(1, 'Data obrigatória'),
  sessao_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
  member_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
})

export type SaidaCaixaFormData = z.infer<typeof saidaCaixaSchema>
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica && bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/validations.ts
git commit -m "feat: add saida_caixa type and saidaCaixaSchema"
```

---

## Task 2: Server Action — saidas-caixa.ts

**Files:**
- Create: `src/app/actions/saidas-caixa.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { saidaCaixaSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function registrarSaida(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = saidaCaixaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { error } = await supabase.from('lancamentos').insert({
    tipo: 'saida_caixa' as const,
    caixa_id: parsed.data.caixa_id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data_pagamento: parsed.data.data_pagamento,
    pago: true,
    sessao_id: parsed.data.sessao_id ?? null,
    member_id: parsed.data.member_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}

export async function excluirSaida(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Only delete if it's actually a saida_caixa — safety guard
  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id)
    .eq('tipo', 'saida_caixa')

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/saidas-caixa.ts
git commit -m "feat: add registrarSaida and excluirSaida server actions"
```

---

## Task 3: Page — buscar sessões e membros

**Files:**
- Modify: `src/app/(dashboard)/financeiro/caixas/page.tsx`

- [ ] **Step 1: Atualizar a page para buscar sessões e membros**

Substituir o conteúdo completo de `src/app/(dashboard)/financeiro/caixas/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CaixasCards } from '@/components/financeiro/caixas-cards'
import { Landmark } from 'lucide-react'
import { Member, Sessao } from '@/lib/types'

export default async function CaixasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: caixas }, { data: lancamentos }, { data: sessoes }, { data: members }] =
    await Promise.all([
      supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
      supabase.from('lancamentos').select('*').not('caixa_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('sessoes').select('id, data, descricao').order('data', { ascending: false }),
      supabase.from('members').select('id, nome').eq('ativo', true).order('nome'),
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
      <CaixasCards
        caixas={caixasComLancamentos}
        sessoes={(sessoes ?? []) as Pick<Sessao, 'id' | 'data' | 'descricao'>[]}
        members={(members ?? []) as Pick<Member, 'id' | 'nome'>[]}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bunx tsc --noEmit
```

Expected: zero erros (mas `CaixasCards` ainda não aceita as novas props — vai falhar até Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/financeiro/caixas/page.tsx
git commit -m "feat: fetch sessoes and members in caixas page"
```

---

## Task 4: SaidaCaixaSheet — formulário de nova saída

**Files:**
- Create: `src/components/financeiro/saida-caixa-sheet.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
'use client'

import { useState } from 'react'
import { Caixa, Member, Sessao } from '@/lib/types'
import { registrarSaida } from '@/app/actions/saidas-caixa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { TrendingDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SaidaCaixaSheetProps {
  caixa: Caixa
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
  members: Pick<Member, 'id' | 'nome'>[]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function SaidaCaixaSheet({ caixa, sessoes, members }: SaidaCaixaSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataPagamento, setDataPagamento] = useState(today())
  const [sessaoId, setSessaoId] = useState('')
  const [memberId, setMemberId] = useState('')

  function resetForm() {
    setDescricao('')
    setValor('')
    setDataPagamento(today())
    setSessaoId('')
    setMemberId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await registrarSaida({
      caixa_id: caixa.id,
      descricao,
      valor,
      data_pagamento: dataPagamento,
      sessao_id: sessaoId || undefined,
      member_id: memberId || undefined,
    })

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Saída registrada!')
      resetForm()
      setOpen(false)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <TrendingDown className="h-4 w-4 mr-2" />
        Registrar Saída
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nova Saída — {caixa.nome}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Compra de bebidas ágape"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data *</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessao_id">Sessão relacionada (opcional)</Label>
              <select
                id="sessao_id"
                value={sessaoId}
                onChange={(e) => setSessaoId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Nenhuma —</option>
                {sessoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data} {s.descricao ? `— ${s.descricao}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_id">Membro relacionado (opcional)</Label>
              <select
                id="member_id"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Nenhum —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/saida-caixa-sheet.tsx
git commit -m "feat: add SaidaCaixaSheet form component"
```

---

## Task 5: CaixasCards — saldo correto, extrato colorido, botões

**Files:**
- Modify: `src/components/financeiro/caixas-cards.tsx`

Esta task atualiza `caixas-cards.tsx` com todas as mudanças de uma vez:
1. Novas props `sessoes` e `members`
2. Cálculo de saldo correto (entradas - saídas)
3. Extrato com cores (verde/vermelho) e prefixo +/-
4. Botão "Registrar Saída" (via `SaidaCaixaSheet`)
5. Botão excluir para cada `saida_caixa` no extrato

- [ ] **Step 1: Ler o arquivo atual antes de modificar**

Leia `src/components/financeiro/caixas-cards.tsx` completo.

- [ ] **Step 2: Substituir o conteúdo completo**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Caixa, Lancamento, Member, Sessao } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { SaidaCaixaSheet } from './saida-caixa-sheet'
import { excluirSaida } from '@/app/actions/saidas-caixa'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CaixaComLancamentos extends Caixa {
  lancamentos: Lancamento[]
}

interface CaixasCardsProps {
  caixas: CaixaComLancamentos[]
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
  members: Pick<Member, 'id' | 'nome'>[]
}

export function CaixasCards({ caixas, sessoes, members }: CaixasCardsProps) {
  const router = useRouter()
  const [extratoCaixaId, setExtratoCaixaId] = useState<string | null>(null)
  const [filterDe, setFilterDe] = useState('')
  const [filterAte, setFilterAte] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const caixaExtrato = caixas.find((c) => c.id === extratoCaixaId)

  const lancamentosFiltrados = useMemo(() => {
    if (!caixaExtrato) return []
    return caixaExtrato.lancamentos.filter((l) => {
      const dateKey = l.data_pagamento ?? l.created_at.substring(0, 10)
      if (filterDe && dateKey < filterDe) return false
      if (filterAte && dateKey > filterAte) return false
      return true
    })
  }, [caixaExtrato, filterDe, filterAte])

  async function handleExcluirSaida(id: string) {
    setDeletingId(id)
    const result = await excluirSaida(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Saída excluída')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caixas.map((caixa) => {
          const entradas = caixa.lancamentos
            .filter((l) => l.pago && l.tipo !== 'saida_caixa')
            .reduce((s, l) => s + l.valor, 0)
          const saidas = caixa.lancamentos
            .filter((l) => l.tipo === 'saida_caixa')
            .reduce((s, l) => s + l.valor, 0)
          const saldo = entradas - saidas
          const pendente = caixa.lancamentos
            .filter((l) => !l.pago && l.tipo !== 'saida_caixa')
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
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(pendente)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <SaidaCaixaSheet caixa={caixa} sessoes={sessoes} members={members} />
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((l) => {
                    const isSaida = l.tipo === 'saida_caixa'
                    const dateDisplay = l.data_pagamento ?? l.created_at.substring(0, 10)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{formatDate(dateDisplay)}</TableCell>
                        <TableCell className="text-sm">{l.descricao ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs capitalize ${isSaida ? 'border-destructive/50 text-destructive' : ''}`}
                          >
                            {isSaida ? 'saída' : l.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${isSaida ? 'text-destructive' : 'text-green-500'}`}>
                          {isSaida ? '— ' : '+ '}
                          {formatCurrency(l.valor)}
                        </TableCell>
                        <TableCell>
                          {isSaida ? (
                            <Badge variant="secondary" className="text-xs">Realizada</Badge>
                          ) : (
                            <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                              {l.pago ? 'Pago' : 'Pendente'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSaida && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === l.id}
                              onClick={() => handleExcluirSaida(l.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lancamentosFiltrados.length} lançamento(s)</span>
            <span>
              Entradas: {formatCurrency(lancamentosFiltrados.filter(l => l.pago && l.tipo !== 'saida_caixa').reduce((s, l) => s + l.valor, 0))}
              {' | '}
              Saídas: {formatCurrency(lancamentosFiltrados.filter(l => l.tipo === 'saida_caixa').reduce((s, l) => s + l.valor, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/caixas-cards.tsx
git commit -m "feat: update CaixasCards with saida support, correct saldo, colored extrato"
```

---

## Self-Review

### Spec Coverage

- [x] Botão "Registrar Saída" que abre Sheet → Task 4 + Task 5
- [x] Formulário com Descrição (obrigatório) → Task 4
- [x] Formulário com Valor (obrigatório) → Task 4
- [x] Formulário com Data (obrigatório, default hoje) → Task 4
- [x] Formulário com Sessão relacionada (select opcional) → Task 4
- [x] Formulário com Membro relacionado (select opcional) → Task 4
- [x] Extrato com entradas verde + / saídas vermelho - → Task 5
- [x] Saldo = entradas pagas - saídas → Task 5
- [x] `registrarSaida(data)` em `app/actions/saidas-caixa.ts` → Task 2
- [x] `excluirSaida(id)` em `app/actions/saidas-caixa.ts` → Task 2
- [x] `pago = true` na saída → Task 2
- [x] Botão excluir saída no extrato → Task 5
- [x] Tipo `'saida_caixa'` adicionado ao TypeScript → Task 1

### Placeholder Scan

Nenhum TBD, TODO ou implementação incompleta.

### Type Consistency

- `Pick<Sessao, 'id' | 'data' | 'descricao'>[]` definido em Task 3, usado em Task 4 e Task 5 ✓
- `Pick<Member, 'id' | 'nome'>[]` definido em Task 3, usado em Task 4 e Task 5 ✓
- `saidaCaixaSchema` definido em Task 1, importado em Task 2 ✓
- `excluirSaida` definido em Task 2, importado em Task 5 ✓
- `SaidaCaixaSheet` definido em Task 4, importado em Task 5 ✓
- `l.tipo !== 'saida_caixa'` válido após Task 1 adicionar ao union ✓

### Nota sobre o filtro do extrato

O filtro de datas agora usa `l.data_pagamento ?? l.created_at.substring(0, 10)` em vez de só `l.created_at`. Para saídas, `data_pagamento` é o campo relevante (data real da despesa). Para entradas, usa `created_at` como fallback quando não há `data_pagamento` definido. Isso é consistente com o campo exibido na coluna "Data" da tabela.
