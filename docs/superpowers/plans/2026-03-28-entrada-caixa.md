# Entrada de Caixa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar entradas manuais nos caixas (rendimentos, depósitos, ajustes) via formulário, sem precisar alterar o banco diretamente.

**Architecture:** Novo componente `EntradaCaixaSheet` espelha `SaidaCaixaSheet`. `registrarEntrada` e `excluirEntrada` adicionados em `saidas-caixa.ts`. `entradaCaixaSchema` adicionado em `validations.ts`. `CaixasCards` recebe botão "Registrar Entrada" ao lado do existente "Registrar Saída" e botão excluir para entradas manuais no extrato.

**Tech Stack:** Next.js 15 App Router, Supabase, zod, react-hook-form (não usado aqui — estado local simples), sonner (toast), lucide-react, shadcn/ui Sheet.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/validations.ts` | Modificar | Adicionar `entradaCaixaSchema` e `EntradaCaixaFormData` |
| `src/app/actions/saidas-caixa.ts` | Modificar | Adicionar `registrarEntrada` e `excluirEntrada` |
| `src/components/financeiro/entrada-caixa-sheet.tsx` | **Criar** | Sheet form de nova entrada manual |
| `src/components/financeiro/caixas-cards.tsx` | Modificar | Botão "Registrar Entrada" + delete para entradas manuais no extrato |

---

## Task 1: Validation Schema

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Adicionar `entradaCaixaSchema` ao final do arquivo**

Em `src/lib/validations.ts`, após a linha `export type SaidaCaixaFormData = z.infer<typeof saidaCaixaSchema>`, adicionar:

```typescript
export const entradaCaixaSchema = z.object({
  caixa_id: z.string().uuid('Caixa inválido'),
  tipo: z.enum(['deposito', 'oferta', 'outro']),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  data_pagamento: z.string().min(1, 'Data obrigatória'),
  sessao_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
})

export type EntradaCaixaFormData = z.infer<typeof entradaCaixaSchema>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica && bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat: add entradaCaixaSchema and EntradaCaixaFormData"
```

---

## Task 2: Server Actions

**Files:**
- Modify: `src/app/actions/saidas-caixa.ts`

- [ ] **Step 1: Adicionar import de `entradaCaixaSchema` e as duas funções ao final do arquivo**

Em `src/app/actions/saidas-caixa.ts`, alterar a linha de import:

```typescript
import { saidaCaixaSchema, entradaCaixaSchema } from '@/lib/validations'
```

Adicionar ao final do arquivo:

```typescript
export async function registrarEntrada(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = entradaCaixaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('lancamentos').insert({
    tipo: parsed.data.tipo,
    caixa_id: parsed.data.caixa_id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data_pagamento: parsed.data.data_pagamento,
    pago: true,
    member_id: null,
    sessao_id: parsed.data.sessao_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}

export async function excluirEntrada(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Safety guard: only delete manual entries with member_id IS NULL
  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id)
    .in('tipo', ['deposito', 'oferta', 'outro'])
    .is('member_id', null)

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica && bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/saidas-caixa.ts
git commit -m "feat: add registrarEntrada and excluirEntrada server actions"
```

---

## Task 3: EntradaCaixaSheet Component

**Files:**
- Create: `src/components/financeiro/entrada-caixa-sheet.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client'

import { useState } from 'react'
import { Caixa, Sessao } from '@/lib/types'
import { registrarEntrada } from '@/app/actions/saidas-caixa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EntradaCaixaSheetProps {
  caixa: Caixa
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntradaCaixaSheet({ caixa, sessoes }: EntradaCaixaSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<'deposito' | 'oferta' | 'outro'>('deposito')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataPagamento, setDataPagamento] = useState(today())
  const [sessaoId, setSessaoId] = useState('')

  function resetForm() {
    setTipo('deposito')
    setDescricao('')
    setValor('')
    setDataPagamento(today())
    setSessaoId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await registrarEntrada({
      caixa_id: caixa.id,
      tipo,
      descricao,
      valor,
      data_pagamento: dataPagamento,
      sessao_id: sessaoId || undefined,
    })

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Entrada registrada!')
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
        className="w-full border-green-600 text-green-600 hover:bg-green-600/10"
        onClick={() => setOpen(true)}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Registrar Entrada
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nova Entrada — {caixa.nome}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'deposito' | 'oferta' | 'outro')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="deposito">Depósito</option>
                <option value="oferta">Oferta</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Rendimento mensal"
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

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
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
cd /Users/pabloalexandrino/Herd/loja-maconica && bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/entrada-caixa-sheet.tsx
git commit -m "feat: add EntradaCaixaSheet form component"
```

---

## Task 4: Atualizar CaixasCards

**Files:**
- Modify: `src/components/financeiro/caixas-cards.tsx`

- [ ] **Step 1: Ler o arquivo atual antes de modificar**

Leia `src/components/financeiro/caixas-cards.tsx` completo.

- [ ] **Step 2: Adicionar import de `EntradaCaixaSheet` e `excluirEntrada`**

Adicionar os imports ao topo do arquivo, após os imports existentes:

```typescript
import { EntradaCaixaSheet } from './entrada-caixa-sheet'
import { excluirEntrada } from '@/app/actions/saidas-caixa'
```

- [ ] **Step 3: Adicionar handler `handleExcluirEntrada` após `handleExcluirSaida`**

Após a função `handleExcluirSaida` existente, adicionar:

```typescript
  async function handleExcluirEntrada(id: string) {
    if (!window.confirm('Excluir esta entrada de caixa? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    const result = await excluirEntrada(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Entrada excluída')
      router.refresh()
    }
    setDeletingId(null)
  }
```

- [ ] **Step 4: Adicionar botão `EntradaCaixaSheet` no card de cada caixa**

Localizar o bloco `<div className="space-y-2">` dentro do card que contém `<SaidaCaixaSheet .../>`. Substituir pelo layout de dois botões lado a lado:

```tsx
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <EntradaCaixaSheet caixa={caixa} sessoes={sessoes} />
                  <SaidaCaixaSheet caixa={caixa} sessoes={sessoes} members={members} />
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
```

- [ ] **Step 5: Adicionar botão excluir para entradas manuais no extrato**

Localizar a `<TableCell className="text-right">` que contém o botão excluir para saídas. Substituir pelo bloco que cobre tanto saídas quanto entradas manuais:

```tsx
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
                          {['deposito', 'oferta', 'outro'].includes(l.tipo) && l.member_id === null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === l.id}
                              onClick={() => handleExcluirEntrada(l.id)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica && bunx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/financeiro/caixas-cards.tsx
git commit -m "feat: add EntradaCaixaSheet button and delete for manual entries in extrato"
```

---

## Self-Review

### Spec Coverage

- [x] `entradaCaixaSchema` com campos `caixa_id`, `tipo`, `descricao`, `valor`, `data_pagamento`, `sessao_id` → Task 1
- [x] `EntradaCaixaFormData` exportado → Task 1
- [x] `registrarEntrada` com `pago: true`, `member_id: null` → Task 2
- [x] `excluirEntrada` com safety guard `.in('tipo', ['deposito','oferta','outro']).is('member_id', null)` → Task 2
- [x] `revalidatePath` em ambas as actions → Task 2
- [x] `EntradaCaixaSheet` com campos tipo, descrição, valor, data, sessão opcional → Task 3
- [x] Sem campo membro (member_id sempre null) → Task 3
- [x] Botão verde com `TrendingUp`, `border-green-600` → Task 3
- [x] `today()` timezone-safe → Task 3
- [x] Form reseta ao fechar → Task 3
- [x] `toast.success` / `toast.error` + `router.refresh()` → Task 3
- [x] Botão "Registrar Entrada" ao lado do "Registrar Saída" em `grid-cols-2` → Task 4
- [x] `handleExcluirEntrada` com `window.confirm` → Task 4
- [x] Botão excluir no extrato para entradas manuais (`tipo IN deposito/oferta/outro AND member_id IS NULL`) → Task 4

### Placeholder Scan

Nenhum TBD, TODO ou implementação incompleta.

### Type Consistency

- `entradaCaixaSchema` definido em Task 1, importado em Task 2 ✓
- `registrarEntrada` / `excluirEntrada` definidos em Task 2, importados em Task 3 e Task 4 ✓
- `EntradaCaixaSheet` recebe `caixa: Caixa` e `sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]` — consistente com o tipo já usado em `SaidaCaixaSheet` ✓
- `CaixasCards` já tem `sessoes` e `members` nas props; `EntradaCaixaSheet` não precisa de `members` (sem campo membro) ✓
