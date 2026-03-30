# Depósito Manual de Crédito na Wallet — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar depósitos antecipados na wallet de cada membro, com compensação automática dos débitos pendentes ao depositar, extrato completo com saldo acumulado e página de detalhe por membro.

**Architecture:** Reutiliza tabela `lancamentos` com `tipo='deposito'`, `pago=true`. Nova server action `registrarDeposito` insere o lançamento e dispara compensação (oldest-first) sobre todos os débitos pendentes do membro. `ExtratoContent` é componente puro compartilhado entre `ExtratoSheet` (tabela) e página de detalhe. Nenhuma migration necessária.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS, shadcn/ui

---

## Mapa de Arquivos

| Arquivo | Operação |
|---------|----------|
| `src/app/(dashboard)/financeiro/page.tsx` | Corrigir bug em `memberSaldos` |
| `src/app/actions/deposito.ts` | Criar |
| `src/components/financeiro/deposito-sheet.tsx` | Criar |
| `src/components/financeiro/extrato-sheet.tsx` | Criar (exporta `ExtratoContent` + `ExtratoSheet`) |
| `src/components/financeiro/member-wallets-table.tsx` | Modificar |
| `src/app/(dashboard)/financeiro/membros/page.tsx` | Modificar |
| `src/app/(dashboard)/financeiro/membros/[id]/member-detail-client.tsx` | Criar |
| `src/app/(dashboard)/financeiro/membros/[id]/page.tsx` | Criar |

---

### Task 1: Corrigir bug em memberSaldos no dashboard

**Files:**
- Modify: `src/app/(dashboard)/financeiro/page.tsx`

**Contexto:** A correção do Task 6 anterior alterou `creditos` em `memberSaldos` para excluir `compensacao`, mas manteve `debitos` como `!compensado`. Isso é inconsistente: exclui os lançamentos negativos de compensação dos créditos sem incluir os débitos compensados nos débitos. O resultado: um membro com depósito de R$70,30 e débitos compensados de R$27,14 mostraria saldo R$70,30 (errado) em vez de R$43,16 (correto).

A fórmula correta é `sum(pago=true) − sum(pago=false AND !compensado)` — a mesma usada em `member-wallets-table.tsx`. Os lançamentos `compensacao` têm `pago=true` e `valor` negativo, o que naturalmente reduz o saldo disponível.

- [ ] **Corrigir creditos em memberSaldos**

Localizar linha ~42 em `src/app/(dashboard)/financeiro/page.tsx`:

```ts
    const creditos = mLanc.filter((l) => l.pago && l.tipo !== 'compensacao').reduce((s, l) => s + l.valor, 0)
```

Substituir por:

```ts
    const creditos = mLanc.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit**

```bash
git add "src/app/(dashboard)/financeiro/page.tsx"
git commit -m "fix: restore compensacao in memberSaldos credits for correct wallet balance"
```

---

### Task 2: Server action `registrarDeposito`

**Files:**
- Create: `src/app/actions/deposito.ts`

- [ ] **Criar `src/app/actions/deposito.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registrarDeposito(
  memberId: string,
  valor: number,
  data: string,
  descricao: string,
  caixaId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Insert deposit lancamento
  const { error: depositError } = await supabase.from('lancamentos').insert({
    member_id: memberId,
    tipo: 'deposito',
    pago: true,
    compensado: false,
    valor,
    data_pagamento: data,
    descricao,
    caixa_id: caixaId,
    sessao_id: null,
  })

  if (depositError) return { error: depositError.message }

  // 2. Fetch credits (includes new deposit + previous compensacoes) and pending debits
  const [{ data: credits }, { data: pendingDebits }] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('valor')
      .eq('member_id', memberId)
      .eq('pago', true),
    supabase
      .from('lancamentos')
      .select('id, valor')
      .eq('member_id', memberId)
      .eq('pago', false)
      .eq('compensado', false)
      .order('created_at', { ascending: true }),
  ])

  // 3. Calculate available credit
  const totalCredito = (credits ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const totalPendente = (pendingDebits ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const availableCredit = totalCredito - totalPendente

  if (availableCredit > 0 && pendingDebits && pendingDebits.length > 0) {
    // 4. Compensate oldest debits first until credit exhausted
    let remaining = availableCredit
    const toCompensate: string[] = []

    for (const debit of pendingDebits) {
      const debitValor = Number(debit.valor)
      if (remaining >= debitValor) {
        toCompensate.push(debit.id)
        remaining -= debitValor
      }
    }

    if (toCompensate.length > 0) {
      const totalCompensado = Math.round(
        pendingDebits
          .filter((d) => toCompensate.includes(d.id))
          .reduce((s, d) => s + Number(d.valor), 0) * 100
      ) / 100

      // 5. Mark debits as compensated
      const { error: updateError } = await supabase
        .from('lancamentos')
        .update({ compensado: true })
        .in('id', toCompensate)

      if (!updateError) {
        // 6. Insert compensacao lancamento (internal bookkeeping, caixa_id = null)
        await supabase.from('lancamentos').insert({
          member_id: memberId,
          sessao_id: null,
          tipo: 'compensacao',
          valor: -totalCompensado,
          pago: true,
          compensado: false,
          descricao: 'Compensação automática de crédito em carteira',
          caixa_id: null,
          data_pagamento: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
        })
      }
    }
  }

  // 7. Revalidate all relevant pages
  revalidatePath('/financeiro/membros')
  revalidatePath(`/financeiro/membros/${memberId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')

  return { success: true }
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit**

```bash
git add src/app/actions/deposito.ts
git commit -m "feat: add registrarDeposito server action with auto-compensation"
```

---

### Task 3: Componente `DepositoSheet`

**Files:**
- Create: `src/components/financeiro/deposito-sheet.tsx`

- [ ] **Criar `src/components/financeiro/deposito-sheet.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Member, Caixa } from '@/lib/types'
import { registrarDeposito } from '@/app/actions/deposito'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DepositoSheetProps {
  member: Member
  caixas: Caixa[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepositoSheet({ member, caixas, open, onOpenChange }: DepositoSheetProps) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const [valor, setValor] = useState('')
  const [data, setData] = useState(today)
  const [descricao, setDescricao] = useState('Depósito antecipado')
  const [caixaId, setCaixaId] = useState<string>('none')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setValor('')
    setData(today)
    setDescricao('Depósito antecipado')
    setCaixaId('none')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setLoading(true)
    const result = await registrarDeposito(
      member.id,
      valorNum,
      data,
      descricao || 'Depósito antecipado',
      caixaId === 'none' ? null : caixaId
    )

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Crédito de R$ ${valorNum.toFixed(2).replace('.', ',')} registrado para ${member.nome}`)
      onOpenChange(false)
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Registrar Depósito</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label>Membro</Label>
            <Input value={member.nome} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-valor">Valor (R$)</Label>
            <Input
              id="dep-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-data">Data</Label>
            <Input
              id="dep-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-descricao">Descrição</Label>
            <Input
              id="dep-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Caixa</Label>
            <Select value={caixaId} onValueChange={setCaixaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar caixa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {caixas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Crédito'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit**

```bash
git add src/components/financeiro/deposito-sheet.tsx
git commit -m "feat: add DepositoSheet form component"
```

---

### Task 4: Componentes `ExtratoContent` e `ExtratoSheet`

**Files:**
- Create: `src/components/financeiro/extrato-sheet.tsx`

**Nota sobre o saldo acumulado no ExtratoContent:**
- Filtrar fora `tipo='compensacao'` (lançamento interno de balanceamento, não visível ao usuário)
- Ordenar por `created_at ASC`
- Para cada linha: se `pago=true` → saldo += valor; se `pago=false` → saldo -= valor (independente de compensado)
- Resultado final coincide com o saldo exibido na tabela de wallets

- [ ] **Criar `src/components/financeiro/extrato-sheet.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Member, Caixa, LancamentoWithSessao } from '@/lib/types'
import { marcarPagoLote } from '@/app/actions/financeiro'
import { DepositoSheet } from './deposito-sheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PlusCircle, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// --- ExtratoContent: pure display component, no state ---

interface ExtratoContentProps {
  lancamentos: LancamentoWithSessao[]
  selected?: Set<string>
  onToggle?: (id: string) => void
}

export function ExtratoContent({ lancamentos, selected, onToggle }: ExtratoContentProps) {
  const rows = lancamentos
    .filter((l) => l.tipo !== 'compensacao')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  let saldo = 0
  const rowsWithSaldo = rows.map((l) => {
    if (l.pago) {
      saldo += l.valor
    } else {
      saldo -= l.valor
    }
    return { ...l, saldoNow: saldo }
  })

  if (rowsWithSaldo.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum lançamento encontrado.</p>
  }

  return (
    <div className="space-y-1">
      {rowsWithSaldo.map((l) => {
        const isPending = !l.pago && !l.compensado
        const isSelectable = isPending && !!onToggle

        return (
          <div
            key={l.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded border border-border text-sm',
              l.tipo === 'deposito' && 'bg-green-500/5 border-green-500/20',
              isPending && 'bg-destructive/5 border-destructive/20',
              isSelectable && selected?.has(l.id) && 'bg-primary/5 border-primary/30',
              isSelectable && 'cursor-pointer'
            )}
            onClick={isSelectable ? () => onToggle(l.id) : undefined}
          >
            {isSelectable && (
              <Checkbox
                checked={selected?.has(l.id) ?? false}
                onCheckedChange={() => onToggle(l.id)}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                {l.compensado && (
                  <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Comp.</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{l.descricao ?? l.tipo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-sm font-medium', l.pago ? 'text-green-600' : 'text-destructive')}>
                {l.pago ? '+' : '−'}{formatCurrency(l.valor)}
              </p>
              <p className={cn('text-xs', l.saldoNow >= 0 ? 'text-green-600' : 'text-destructive')}>
                {formatCurrency(l.saldoNow)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- ExtratoSheet: interactive Sheet wrapping ExtratoContent ---

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface ExtratoSheetProps {
  member: MemberWithLancamentos
  caixas: Caixa[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtratoSheet({ member, caixas, open, onOpenChange }: ExtratoSheetProps) {
  const router = useRouter()
  const [depositoOpen, setDepositoOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const pendentesReais = member.lancamentos.filter((l) => !l.pago && !l.compensado)
  const totalPago = member.lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
  const debitoPendente = pendentesReais.reduce((s, l) => s + l.valor, 0)
  const saldo = totalPago - debitoPendente

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleClose(open: boolean) {
    if (!open) setSelected(new Set())
    onOpenChange(open)
  }

  async function handleRegistrarPagamento() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarPagoLote(Array.from(selected), true)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamento(s) marcado(s) como pago(s)`)
      setSelected(new Set())
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pr-8">
            <SheetTitle>Extrato — {member.nome}</SheetTitle>
            <Button size="sm" variant="outline" onClick={() => setDepositoOpen(true)}>
              <PlusCircle className="h-3 w-3 mr-1" />
              Depositar
            </Button>
          </SheetHeader>

          <div className="mt-2 mb-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Saldo atual</span>
            <Badge
              variant={saldo < 0 ? 'destructive' : 'default'}
              className={cn('text-sm font-bold', saldo >= 0 && 'bg-green-500/20 text-green-600')}
            >
              {formatCurrency(saldo)}
            </Badge>
          </div>

          <ExtratoContent
            lancamentos={member.lancamentos}
            selected={selected}
            onToggle={toggleSelect}
          />

          {selected.size > 0 && (
            <div className="mt-4 border-t border-border pt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selecionado:</span>
                <span className="font-medium">
                  {formatCurrency(
                    pendentesReais
                      .filter((l) => selected.has(l.id))
                      .reduce((s, l) => s + l.valor, 0)
                  )}
                </span>
              </div>
              <Button className="w-full" disabled={loading} onClick={handleRegistrarPagamento}>
                <CheckCheck className="h-4 w-4 mr-2" />
                {loading ? 'Registrando...' : `Confirmar ${selected.size} pagamento(s)`}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DepositoSheet
        member={member}
        caixas={caixas}
        open={depositoOpen}
        onOpenChange={setDepositoOpen}
      />
    </>
  )
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit**

```bash
git add src/components/financeiro/extrato-sheet.tsx
git commit -m "feat: add ExtratoContent and ExtratoSheet components"
```

---

### Task 5: Atualizar `member-wallets-table.tsx`

**Files:**
- Modify: `src/components/financeiro/member-wallets-table.tsx`

- [ ] **Substituir o conteúdo completo do arquivo**

Substitua todo o conteúdo de `src/components/financeiro/member-wallets-table.tsx` por:

```tsx
'use client'

import { useState } from 'react'
import { Member, Caixa, LancamentoWithSessao } from '@/lib/types'
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExtratoSheet } from './extrato-sheet'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface MemberWalletsTableProps {
  members: MemberWithLancamentos[]
  caixas: Caixa[]
}

export function MemberWalletsTable({ members, caixas }: MemberWalletsTableProps) {
  const [extratoMember, setExtratoMember] = useState<MemberWithLancamentos | null>(null)

  const membersWithStats = members.map((m) => {
    const debitoPendente = m.lancamentos
      .filter((l) => !l.pago && !l.compensado)
      .reduce((s, l) => s + l.valor, 0)
    const totalPago = m.lancamentos
      .filter((l) => l.pago)
      .reduce((s, l) => s + l.valor, 0)
    const saldo = totalPago - debitoPendente
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
              <TableHead>WhatsApp</TableHead>
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
                <TableCell className="text-sm">
                  {m.debitoPendente > 0
                    ? <span className="text-destructive">{formatCurrency(m.debitoPendente)}</span>
                    : '—'}
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
                <TableCell>
                  <WhatsAppButton member={m} lancamentos={m.lancamentos} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setExtratoMember(m)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Ver extrato
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {extratoMember && (
        <ExtratoSheet
          member={extratoMember}
          caixas={caixas}
          open={!!extratoMember}
          onOpenChange={(open) => !open && setExtratoMember(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit**

```bash
git add src/components/financeiro/member-wallets-table.tsx
git commit -m "feat: replace inline sheet with ExtratoSheet in member-wallets-table"
```

---

### Task 6: Atualizar `/financeiro/membros/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/financeiro/membros/page.tsx`

- [ ] **Substituir conteúdo completo do arquivo**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemberWalletsTable } from '@/components/financeiro/member-wallets-table'
import { Wallet } from 'lucide-react'
import { LancamentoWithSessao } from '@/lib/types'

export default async function MembrosWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: caixas }] = await Promise.all([
    supabase.from('members').select('*').eq('ativo', true).order('nome'),
    supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
  ])

  const memberIds = (members ?? []).map((m) => m.id)

  const { data: lancamentosRaw } = memberIds.length > 0
    ? await supabase
        .from('lancamentos')
        .select('*, sessao:sessoes(data, descricao)')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lancamentos = (lancamentosRaw ?? []) as LancamentoWithSessao[]

  const membersWithLancamentos = (members ?? []).map((m) => ({
    ...m,
    lancamentos: lancamentos.filter((l) => l.member_id === m.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Wallets dos Membros</h1>
      </div>
      <MemberWalletsTable members={membersWithLancamentos} caixas={caixas ?? []} />
    </div>
  )
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Verificar comportamento manual**

1. Abrir `/financeiro/membros`
2. Confirmar que o botão "Ver extrato" aparece em todas as linhas
3. Clicar em "Ver extrato" de um membro → Sheet abre com extrato + saldo
4. Clicar em "Depositar" no header do Sheet → formulário de depósito abre
5. Registrar um depósito → toast de sucesso → tabela atualiza com novo saldo

- [ ] **Commit**

```bash
git add "src/app/(dashboard)/financeiro/membros/page.tsx"
git commit -m "feat: fetch caixas and pass to MemberWalletsTable"
```

---

### Task 7: Página de detalhe do membro

**Files:**
- Create: `src/app/(dashboard)/financeiro/membros/[id]/member-detail-client.tsx`
- Create: `src/app/(dashboard)/financeiro/membros/[id]/page.tsx`

- [ ] **Criar `src/app/(dashboard)/financeiro/membros/[id]/member-detail-client.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Member, Caixa, LancamentoWithSessao } from '@/lib/types'
import { ExtratoContent } from '@/components/financeiro/extrato-sheet'
import { DepositoSheet } from '@/components/financeiro/deposito-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface MemberDetailClientProps {
  member: MemberWithLancamentos
  caixas: Caixa[]
}

export function MemberDetailClient({ member, caixas }: MemberDetailClientProps) {
  const [depositoOpen, setDepositoOpen] = useState(false)

  const totalPago = member.lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
  const debitoPendente = member.lancamentos
    .filter((l) => !l.pago && !l.compensado)
    .reduce((s, l) => s + l.valor, 0)
  const saldo = totalPago - debitoPendente

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Saldo atual:</span>
          <Badge
            variant={saldo < 0 ? 'destructive' : 'default'}
            className={cn('text-sm font-bold', saldo >= 0 && 'bg-green-500/20 text-green-600')}
          >
            {formatCurrency(saldo)}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setDepositoOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-1" />
          Registrar Depósito
        </Button>
      </div>

      <ExtratoContent lancamentos={member.lancamentos} />

      <DepositoSheet
        member={member}
        caixas={caixas}
        open={depositoOpen}
        onOpenChange={setDepositoOpen}
      />
    </>
  )
}
```

- [ ] **Criar `src/app/(dashboard)/financeiro/membros/[id]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { LancamentoWithSessao } from '@/lib/types'
import { MemberDetailClient } from './member-detail-client'
import { Wallet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: member }, { data: lancamentosRaw }, { data: caixas }] = await Promise.all([
    supabase.from('members').select('*').eq('id', id).single(),
    supabase
      .from('lancamentos')
      .select('*, sessao:sessoes(data, descricao)')
      .eq('member_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
  ])

  if (!member) notFound()

  const lancamentos = (lancamentosRaw ?? []) as LancamentoWithSessao[]
  const memberWithLancamentos = { ...member, lancamentos }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/financeiro/membros">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Wallets
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">{member.nome}</h1>
        {member.cargo && (
          <span className="text-sm text-muted-foreground">— {member.cargo}</span>
        )}
      </div>

      <MemberDetailClient member={memberWithLancamentos} caixas={caixas ?? []} />
    </div>
  )
}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Verificar comportamento manual**

1. Abrir `/financeiro/membros/[id]` de um membro com lançamentos
2. Confirmar: saldo badge colorido no topo, botão "Registrar Depósito", extrato completo com saldo acumulado
3. Clicar "Registrar Depósito" → Sheet abre → preencher valor → confirmar → saldo atualiza
4. Botão "← Wallets" retorna à listagem

- [ ] **Commit**

```bash
git add "src/app/(dashboard)/financeiro/membros/[id]/member-detail-client.tsx" "src/app/(dashboard)/financeiro/membros/[id]/page.tsx"
git commit -m "feat: add member detail page with extrato and deposit button"
```

---

## Verificação Final

Após todos os tasks, testar o fluxo completo:

1. Membro sem lançamentos → `/financeiro/membros/[id]` mostra extrato vazio, saldo R$0,00
2. Registrar depósito R$70,30 → saldo passa para R$70,30
3. Gerar lançamentos de sessão para esse membro (ex: R$27,14 total)
4. Confirmar que os débitos aparecem como "Comp." no extrato e saldo cai para R$43,16
5. Registrar novo depósito R$50,00 → saldo deve ir para R$93,16
6. Em `/financeiro` → card "Créditos em Carteira" deve refletir R$93,16
7. Membro com débito parcialmente coberto: depósito R$10, débito R$15 → saldo −R$5 em vermelho
