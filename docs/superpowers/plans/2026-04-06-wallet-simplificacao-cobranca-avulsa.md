# Wallet Simplificação + Cobrança Avulsa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover "Pagar em dinheiro" (tudo via carteira, podendo ficar negativo) e adicionar Cobrança Avulsa para cobrar membros por despesas extraordinárias.

**Architecture:** Três mudanças independentes: (1) reescrever `usarCreditoWallet` sem RPC e sem guard de saldo; (2) nova action `criarCobranca` + componente `CobrancaSheet`; (3) atualizar `MemberWalletsTable` para remover o fluxo de pagamento em dinheiro e adicionar o botão "Nova Cobrança".

**Tech Stack:** Next.js App Router, Supabase, Server Actions, shadcn/ui (Sheet, Button, Checkbox, Badge), TypeScript, Lucide React

---

## File Map

| Arquivo | Mudança |
|---|---|
| `src/app/actions/financeiro.ts` | Reescrever `usarCreditoWallet` sem RPC, sem guard de saldo |
| `src/app/actions/cobranca.ts` | Novo — `criarCobranca` server action |
| `src/components/financeiro/cobranca-sheet.tsx` | Novo — form de cobrança avulsa |
| `src/components/financeiro/member-wallets-table.tsx` | Remove "Pagar em dinheiro", renomeia botão, adiciona "Nova Cobrança" |

---

## Task 1: Reescrever `usarCreditoWallet` sem RPC

**Files:**
- Modify: `src/app/actions/financeiro.ts`

- [ ] **Step 1: Substituir a função `usarCreditoWallet` (linhas 273–291)**

Localizar a função `usarCreditoWallet` que chama `supabase.rpc('usar_credito_wallet', ...)` e substituir pela implementação abaixo. O restante do arquivo não muda.

```typescript
export async function usarCreditoWallet(memberId: string, lancamentoIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (lancamentoIds.length === 0) return { error: 'Nenhum lançamento selecionado' }

  // 1. Fetch and validate selected lancamentos
  const { data: lancamentos, error: fetchError } = await supabase
    .from('lancamentos')
    .select('id, valor, member_id, pago, compensado')
    .in('id', lancamentoIds)

  if (fetchError) return { error: fetchError.message }
  if (!lancamentos || lancamentos.length === 0) return { error: 'Lançamentos não encontrados' }

  for (const l of lancamentos) {
    if (l.member_id !== memberId) return { error: 'Lançamentos inválidos' }
    if (l.pago) return { error: 'Lançamento já está pago' }
    if (l.compensado) return { error: 'Lançamento já foi compensado' }
  }

  const totalSelecionado = Math.round(
    lancamentos.reduce((s, l) => s + Number(l.valor), 0) * 100
  ) / 100

  // 2. Mark selected lancamentos as compensated
  const { error: updateError } = await supabase
    .from('lancamentos')
    .update({ compensado: true })
    .in('id', lancamentoIds)

  if (updateError) return { error: updateError.message }

  // 3. Insert compensacao entry (negative valor — reduces wallet balance, can go negative)
  const { error: insertError } = await supabase.from('lancamentos').insert({
    member_id: memberId,
    sessao_id: null,
    tipo: 'compensacao',
    valor: -totalSelecionado,
    pago: true,
    compensado: false,
    descricao: 'Compensação manual de crédito em carteira',
    caixa_id: null,
    data_pagamento: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
  })

  if (insertError) return { error: insertError.message }

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/membros')
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/financeiro.ts
git commit -m "feat: rewrite usarCreditoWallet without RPC, allow negative wallet balance"
```

---

## Task 2: Criar `src/app/actions/cobranca.ts`

**Files:**
- Create: `src/app/actions/cobranca.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarCobranca(
  descricao: string,
  valor: number,
  memberIds: string[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (!descricao.trim()) return { error: 'Descrição é obrigatória' }
  if (!valor || valor <= 0) return { error: 'Valor deve ser maior que zero' }
  if (memberIds.length === 0) return { error: 'Selecione ao menos um membro' }

  const lancamentos = memberIds.map((memberId) => ({
    member_id: memberId,
    sessao_id: null,
    tipo: 'outro' as const,
    descricao: descricao.trim(),
    valor: Math.round(valor * 100) / 100,
    pago: false,
    compensado: false,
    caixa_id: null,
    data_pagamento: null,
  }))

  const { error } = await supabase.from('lancamentos').insert(lancamentos)
  if (error) return { error: error.message }

  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true, count: memberIds.length }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/cobranca.ts
git commit -m "feat: add criarCobranca server action"
```

---

## Task 3: Criar `src/components/financeiro/cobranca-sheet.tsx`

**Files:**
- Create: `src/components/financeiro/cobranca-sheet.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
'use client'

import { useState } from 'react'
import { Member } from '@/lib/types'
import { criarCobranca } from '@/app/actions/cobranca'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CobrancaSheetProps {
  members: Member[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CobrancaSheet({ members, open, onOpenChange }: CobrancaSheetProps) {
  const router = useRouter()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setDescricao('')
    setValor('')
    setSelected(new Set())
  }

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === members.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(members.map((m) => m.id)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (selected.size === 0) {
      toast.error('Selecione ao menos um membro')
      return
    }

    setLoading(true)
    const result = await criarCobranca(descricao, valorNum, Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Cobrança criada para ${result.count} membro(s)`)
      onOpenChange(false)
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  const allSelected = members.length > 0 && selected.size === members.length

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Cobrança</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cob-descricao">Descrição</Label>
            <Input
              id="cob-descricao"
              placeholder="Ex: Rateio aluguel ônibus — Iniciação 2026"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cob-valor">Valor por membro (R$)</Label>
            <Input
              id="cob-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Membros ({selected.size}/{members.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={toggleAll}
              >
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-md p-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-secondary/50 text-sm"
                >
                  <Checkbox
                    checked={selected.has(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  <span>{m.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || selected.size === 0}
          >
            {loading
              ? 'Criando...'
              : `Criar Cobrança${selected.size > 0 ? ` (${selected.size} membros)` : ''}`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/cobranca-sheet.tsx
git commit -m "feat: add CobrancaSheet component for custom member charges"
```

---

## Task 4: Atualizar `MemberWalletsTable`

**Files:**
- Modify: `src/components/financeiro/member-wallets-table.tsx`

Remove o botão "Pagar em dinheiro", renomeia "Usar crédito da wallet" para "Quitar via carteira" (sempre visível, sem guard de saldo), e adiciona o botão "Nova Cobrança" com o `CobrancaSheet`.

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```typescript
'use client'

import { useState } from 'react'
import { Member, Caixa, LancamentoWithSessao } from '@/lib/types'
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { DepositoSheet } from './deposito-sheet'
import { CobrancaSheet } from './cobranca-sheet'
import { formatCurrency } from '@/lib/utils'
import { usarCreditoWallet } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CreditCard, PlusCircle, Wallet, Receipt } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface MemberWalletsTableProps {
  members: MemberWithLancamentos[]
  caixas: Caixa[]
}

export function MemberWalletsTable({ members, caixas }: MemberWalletsTableProps) {
  const router = useRouter()
  const [sheetMember, setSheetMember] = useState<MemberWithLancamentos | null>(null)
  const [depositoMember, setDepositoMember] = useState<MemberWithLancamentos | null>(null)
  const [cobrancaOpen, setCobrancaOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Pre-compute stats for all members
  const membersWithStats = members.map((m) => {
    const debitoPendente = m.lancamentos.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    const totalPago = m.lancamentos.filter((l) => l.pago && l.tipo !== 'compensacao').reduce((s, l) => s + l.valor, 0)
    const totalCredito = m.lancamentos
      .filter((l) => l.pago && (l.tipo === 'deposito' || l.tipo === 'compensacao'))
      .reduce((s, l) => s + l.valor, 0)
    const saldo = totalCredito - debitoPendente
    return { ...m, debitoPendente, totalPago, saldo, totalCredito }
  })

  const pendentesReais = sheetMember?.lancamentos.filter((l) => !l.pago && !l.compensado) ?? []
  const compensados = sheetMember?.lancamentos.filter((l) => l.compensado) ?? []

  const creditoDisponivel = sheetMember
    ? (membersWithStats.find((m) => m.id === sheetMember.id)?.totalCredito ?? 0)
    : 0

  const valorSelecionado = pendentesReais
    .filter((l) => selected.has(l.id))
    .reduce((s, l) => s + l.valor, 0)

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

  async function handleQuitarViaCarteira() {
    if (selected.size === 0 || !sheetMember) return
    setLoading(true)
    const result = await usarCreditoWallet(sheetMember.id, Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamento(s) quitado(s) via carteira`)
      setSheetMember(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      {/* Header with Nova Cobrança button */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setCobrancaOpen(true)}
        >
          <Receipt className="h-3 w-3 mr-1" />
          Nova Cobrança
        </Button>
      </div>

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
                  <span className={m.debitoPendente > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {formatCurrency(m.debitoPendente)}
                  </span>
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
                  <WhatsAppButton
                    member={m}
                    lancamentos={m.lancamentos}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDepositoMember(m)}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Adicionar crédito
                    </Button>
                    {m.debitoPendente > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openSheet(m)}
                      >
                        <Wallet className="h-3 w-3 mr-1" />
                        Quitar débitos
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Deposito sheet */}
      {depositoMember && (
        <DepositoSheet
          member={depositoMember}
          caixas={caixas}
          depositos={(members.find((m) => m.id === depositoMember.id) ?? depositoMember).lancamentos.filter((l) => l.tipo === 'deposito').slice().reverse()}
          open={!!depositoMember}
          onOpenChange={(open) => { if (!open) setDepositoMember(null) }}
        />
      )}

      {/* Cobrança avulsa sheet */}
      <CobrancaSheet
        members={members}
        open={cobrancaOpen}
        onOpenChange={setCobrancaOpen}
      />

      {/* Quitar débitos sheet */}
      <Sheet open={!!sheetMember} onOpenChange={(open) => !open && setSheetMember(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lançamentos pendentes — {sheetMember?.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {pendentesReais.length === 0 && compensados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pendentesReais.map((l) => (
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

                {compensados.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Compensados por crédito</p>
                    {compensados.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted/30">
                        <div className="flex items-center gap-2 flex-1 text-sm">
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Compensado</Badge>
                          <span className="text-muted-foreground">{l.descricao ?? l.tipo}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatCurrency(l.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selecionado:</span>
                    <span className="font-medium">{formatCurrency(valorSelecionado)}</span>
                  </div>
                  {creditoDisponivel !== 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Saldo atual: {formatCurrency(creditoDisponivel)}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={selected.size === 0 || loading}
                    onClick={handleQuitarViaCarteira}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {loading ? 'Processando...' : 'Quitar via carteira'}
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

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Testar manualmente no browser em `/financeiro/membros`**

1. Verificar que o botão "Pagar em dinheiro" não existe mais
2. Clicar "Quitar débitos" em um membro com pendentes → verificar que o botão "Quitar via carteira" aparece
3. Selecionar um lançamento e clicar "Quitar via carteira" com saldo zero → verificar que funciona e saldo fica negativo
4. Clicar "Nova Cobrança" → preencher descrição, valor, selecionar membros → confirmar
5. Verificar que os membros selecionados aparecem com o novo débito pendente na tabela
6. Clicar no WhatsApp de um membro cobrado → verificar que a mensagem inclui o novo débito

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/member-wallets-table.tsx
git commit -m "feat: remove pay-in-cash, add quitar-via-carteira and nova-cobranca to wallet table"
```
