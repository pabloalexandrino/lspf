# WhatsApp Cobrança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo WhatsApp nos membros e um botão de cobrança que gera link wa.me com mensagem personalizada baseada nos lançamentos pendentes.

**Architecture:** Campo `whatsapp` (só dígitos, sem +55) no banco; `WhatsAppButton` client component recebe `member`, `lancamentos` pendentes e `sessao?` opcional, gera mensagem e abre `wa.me` link. Exibido em três páginas: /members, /sessoes/[id] (aba Financeiro), /financeiro/membros.

**Tech Stack:** Next.js 15 App Router, Supabase, react-hook-form + zod, react-icons (FaWhatsapp), Tailwind CSS, shadcn/ui Button + Tooltip.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260327000002_whatsapp_member.sql` | Criar | Adiciona coluna `whatsapp text` na tabela `members` |
| `src/lib/types.ts` | Modificar | Adiciona `whatsapp` em `Member`; adiciona `LancamentoWithSessao` |
| `src/lib/validations.ts` | Modificar | Adiciona campo `whatsapp` no `memberSchema` |
| `src/app/actions/members.ts` | Nenhuma | Campo `whatsapp` já passa via `memberData` (só `cargo_ids` é extraído) |
| `src/components/members/whatsapp-button.tsx` | Criar | Botão WhatsApp com lógica de geração de mensagem e tooltip |
| `src/components/members/member-form.tsx` | Modificar | Adiciona campo WhatsApp com máscara visual |
| `src/app/(dashboard)/members/page.tsx` | Modificar | Adiciona query de lançamentos pendentes (com join de sessão) |
| `src/components/members/members-table.tsx` | Modificar | Aceita `lancamentos` prop; adiciona coluna WhatsApp |
| `src/app/(dashboard)/sessoes/[id]/page.tsx` | Modificar | Passa `members` com `whatsapp` para `ResumoFinanceiro` (já incluso via `*`) |
| `src/components/sessoes/resumo-financeiro.tsx` | Modificar | Adiciona botão WhatsApp por membro no agrupamento da tabela de lançamentos |
| `src/app/(dashboard)/financeiro/membros/page.tsx` | Modificar | Atualiza query de lançamentos para incluir join de sessão |
| `src/components/financeiro/member-wallets-table.tsx` | Modificar | Adiciona coluna WhatsApp por membro |

---

## Task 1: Migration — Coluna whatsapp

**Files:**
- Create: `supabase/migrations/20260327000002_whatsapp_member.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS whatsapp text;
```

- [ ] **Step 2: Aplicar a migration**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npx supabase db push
# OU se usar supabase local:
# npx supabase migration up
```

Expected: migration aplicada sem erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000002_whatsapp_member.sql
git commit -m "feat: add whatsapp column to members table"
```

---

## Task 2: Types e Validations

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Adicionar `whatsapp` ao tipo `Member` e criar `LancamentoWithSessao`**

Em `src/lib/types.ts`, modificar o tipo `Member` e adicionar o novo tipo:

```typescript
export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  data_nascimento: string | null
  cargo: string | null
  ativo: boolean
  whatsapp: string | null  // <-- adicionar esta linha
  created_at: string
}

// Adicionar ao final do arquivo:
export type LancamentoWithSessao = Lancamento & {
  sessao?: { data: string; descricao: string | null } | null
}
```

- [ ] **Step 2: Adicionar `whatsapp` ao `memberSchema`**

Em `src/lib/validations.ts`, dentro de `memberSchema`:

```typescript
export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_historico: z.string().optional().or(z.literal('')),
  data_nascimento: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  ativo: z.boolean().default(true),
  cargo_ids: z.array(z.string()).default([]),
  whatsapp: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().regex(/^\d{10,11}$/, 'WhatsApp deve ter 10 ou 11 dígitos').nullable().optional()
  ),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/validations.ts
git commit -m "feat: add whatsapp field to Member type and memberSchema"
```

---

## Task 3: Instalar react-icons e criar WhatsAppButton

**Files:**
- Create: `src/components/members/whatsapp-button.tsx`

- [ ] **Step 1: Instalar react-icons**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
bun add react-icons
```

Expected: `react-icons` aparece em `package.json` dependencies.

- [ ] **Step 2: Verificar que Tooltip está disponível no shadcn**

```bash
ls src/components/ui/tooltip.tsx
```

Se não existir:
```bash
npx shadcn@latest add tooltip
```

- [ ] **Step 3: Criar o componente `WhatsAppButton`**

Criar `src/components/members/whatsapp-button.tsx` com o conteúdo completo:

```tsx
'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Member, LancamentoWithSessao, Sessao } from '@/lib/types'
import { format } from 'date-fns'

interface WhatsAppButtonProps {
  member: Member
  lancamentos: LancamentoWithSessao[]   // lançamentos pendentes (pago=false) desse membro
  sessao?: Sessao                        // opcional: sessão de referência
}

function gerarMensagemCobranca(
  member: Member,
  lancamentos: LancamentoWithSessao[],
  sessao?: Sessao
): string {
  const primeiroNome = member.nome.split(' ')[0]
  const pendentes = lancamentos.filter((l) => !l.pago)

  const agapes = pendentes.filter((l) => l.tipo === 'agape')
  const sessoesLanc = pendentes.filter((l) => l.tipo === 'sessao')
  const produtos = pendentes.filter((l) => l.tipo === 'produto')

  const saldoTotal = pendentes.reduce((sum, l) => sum + l.valor, 0)

  function formatarData(lancamento: LancamentoWithSessao): string {
    const dataStr = sessao?.data ?? lancamento.sessao?.data
    if (!dataStr) return '?'
    return format(new Date(dataStr + 'T00:00:00'), 'dd/MM')
  }

  function formatarValor(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const linhas: string[] = [`Boa tarde Ir:. ${primeiroNome}, tudo bem?`]

  if (agapes.length > 0) {
    const totalAgape = agapes.reduce((s, l) => s + l.valor, 0)
    const dataRef = formatarData(agapes[0])
    linhas.push(`\nSeu ágape referente à sessão do dia ${dataRef}, ficou:`)
    linhas.push(`R$ ${formatarValor(totalAgape)} rateio do jantar`)
  }

  if (sessoesLanc.length > 0) {
    sessoesLanc.forEach((l) => {
      const dataRef = formatarData(l)
      const desc = l.descricao ?? `sessão de ${dataRef}`
      linhas.push(`\nCusto da sessão: R$ ${formatarValor(l.valor)} (${desc})`)
      linhas.push(`Dividido entre os presentes na sessão.`)
    })
  }

  if (produtos.length > 0) {
    linhas.push(`\nConsumo individual:`)
    produtos.forEach((l) => {
      linhas.push(`- ${l.descricao ?? 'Produto'}: R$ ${formatarValor(l.valor)}`)
    })
  }

  linhas.push(`\nSaldo na carteira: - R$ ${formatarValor(saldoTotal)}`)
  linhas.push(`\nSegue chave pix: bardasabedoria@gmail.com`)
  linhas.push(`\nAguardo comprovante de pagamento para dar baixa. TFA 🙏`)

  return linhas.join('\n')
}

export function WhatsAppButton({ member, lancamentos, sessao }: WhatsAppButtonProps) {
  const pendentes = lancamentos.filter((l) => !l.pago)
  const temWhatsapp = Boolean(member.whatsapp)
  const temDebitos = pendentes.length > 0

  const disabled = !temWhatsapp || !temDebitos

  const tooltipText = !temWhatsapp
    ? 'WhatsApp não cadastrado'
    : !temDebitos
      ? 'Membro sem débitos pendentes'
      : null

  function handleClick() {
    if (!member.whatsapp) return
    const numero = `55${member.whatsapp}`
    const mensagem = gerarMensagemCobranca(member, lancamentos, sessao)
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                variant="outline"
                disabled
                className="opacity-40 cursor-not-allowed"
              >
                <FaWhatsapp className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          {tooltipText && (
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-600 text-green-500 hover:bg-green-600/10"
      onClick={handleClick}
    >
      <FaWhatsapp className="h-4 w-4" />
    </Button>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/members/whatsapp-button.tsx bun.lock package.json
git commit -m "feat: add WhatsAppButton component with message generation"
```

---

## Task 4: Campo WhatsApp no MemberForm

**Files:**
- Modify: `src/components/members/member-form.tsx`

- [ ] **Step 1: Adicionar campo WhatsApp com máscara e lógica de salvar só dígitos**

Em `src/components/members/member-form.tsx`, adicionar dentro do `useForm` defaultValues e o campo no JSX.

Localizar a linha do defaultValues e adicionar `whatsapp`:

```typescript
defaultValues: {
  nome: member?.nome ?? '',
  nome_historico: member?.nome_historico ?? '',
  data_nascimento: member?.data_nascimento ?? '',
  ativo: member?.ativo ?? true,
  cargo_ids: currentCargoIds,
  whatsapp: member?.whatsapp ?? '',
},
```

Adicionar a função de máscara no componente (após `toggleCargo`):

```typescript
function formatWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}
```

Adicionar o campo JSX antes do campo de Status (antes do `<div className="flex items-center justify-between">`):

```tsx
<div className="space-y-2">
  <Label htmlFor="whatsapp">WhatsApp</Label>
  <Input
    id="whatsapp"
    placeholder="(44) 99999-8888"
    value={formatWhatsapp(watch('whatsapp') ?? '')}
    onChange={(e) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
      setValue('whatsapp', digits)
    }}
  />
  {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/members/member-form.tsx
git commit -m "feat: add whatsapp field with mask to member form"
```

---

## Task 5: Tabela de Membros — coluna WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/members/page.tsx`
- Modify: `src/components/members/members-table.tsx`

- [ ] **Step 1: Atualizar `members/page.tsx` para buscar lançamentos pendentes**

Substituir o conteúdo de `src/app/(dashboard)/members/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/members/members-table'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MemberWithCargos, Cargo, LancamentoWithSessao } from '@/lib/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: cargos }, { data: lancamentosRaw }] = await Promise.all([
    supabase
      .from('members')
      .select('*, member_cargos(id, cargo_id, cargos(*))')
      .order('nome'),
    supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('lancamentos')
      .select('*, sessao:sessoes(data, descricao)')
      .eq('pago', false)
      .not('member_id', 'is', null),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Membros</h1>
      </div>
      <MembersTable
        members={(members ?? []) as MemberWithCargos[]}
        allCargos={(cargos ?? []) as Cargo[]}
        lancamentos={(lancamentosRaw ?? []) as LancamentoWithSessao[]}
      />
    </div>
  )
}
```

- [ ] **Step 2: Atualizar `members-table.tsx` para aceitar `lancamentos` e exibir coluna WhatsApp**

Em `src/components/members/members-table.tsx`:

Adicionar imports:
```typescript
import { Lancamento } from '@/lib/types'
import { WhatsAppButton } from './whatsapp-button'
```

Atualizar a interface `MembersTableProps`:
```typescript
interface MembersTableProps {
  members: MemberWithCargos[]
  allCargos: Cargo[]
  lancamentos: LancamentoWithSessao[]
}
```

Atualizar a assinatura da função:
```typescript
export function MembersTable({ members, allCargos, lancamentos }: MembersTableProps) {
```

Adicionar `LancamentoWithSessao` nos imports de types (adicionar ao import existente):
```typescript
import { MemberWithCargos, Cargo, LancamentoWithSessao } from '@/lib/types'
```

Adicionar `<TableHead>WhatsApp</TableHead>` após a última `<TableHead>`:
```tsx
<TableHead>Status</TableHead>
<TableHead>WhatsApp</TableHead>
<TableHead className="text-right">Ações</TableHead>
```

Adicionar `<TableCell>` com `WhatsAppButton` após a célula de Status (dentro do `filtered.map`):
```tsx
<TableCell>
  <Badge variant={member.ativo ? 'default' : 'secondary'}>
    {member.ativo ? 'Ativo' : 'Inativo'}
  </Badge>
</TableCell>
<TableCell>
  <WhatsAppButton
    member={member}
    lancamentos={lancamentos.filter((l) => l.member_id === member.id)}
  />
</TableCell>
```

Também atualizar o `colSpan` do "Nenhum membro encontrado" de `5` para `6`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/members/page.tsx src/components/members/members-table.tsx
git commit -m "feat: add whatsapp button column to members table"
```

---

## Task 6: Sessão — botão WhatsApp na aba Financeiro

**Files:**
- Modify: `src/components/sessoes/resumo-financeiro.tsx`
- Modify: `src/app/(dashboard)/sessoes/[id]/page.tsx` (verificar se `members` já tem `whatsapp`)

- [ ] **Step 1: Verificar que `sessoes/[id]/page.tsx` passa members com whatsapp**

A query `supabase.from('members').select('*, member_cargos(...)')` já usa `*` logo `whatsapp` é incluído. A tipagem usa `MemberWithCargos` que herda de `Member` (que agora tem `whatsapp`). Nenhuma alteração necessária na page.

- [ ] **Step 2: Atualizar `ResumoFinanceiroProps` para incluir `members` com `whatsapp`**

Em `src/components/sessoes/resumo-financeiro.tsx`, adicionar import do `WhatsAppButton`:

```typescript
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { MemberWithCargos } from '@/lib/types'
```

Atualizar a interface (mudar `Member[]` para `MemberWithCargos[]`):
```typescript
interface ResumoFinanceiroProps {
  sessao: Sessao
  members: MemberWithCargos[]
  presencasSessao: PresencaSessao[]
  presencasAgape: PresencaAgape[]
  consumos: (ConsumoProduto & { produto?: Produto })[]
  lancamentos: (Lancamento & { member?: Member })[]
}
```

Atualizar o import de types (remover `Member` separado se necessário, ou manter ambos):
```typescript
import { Lancamento, MemberWithCargos, PresencaSessao, PresencaAgape, ConsumoProduto, Produto, Sessao } from '@/lib/types'
```

- [ ] **Step 3: Adicionar coluna WhatsApp na tabela de lançamentos do ResumoFinanceiro**

Na seção da tabela de lançamentos (dentro de `{lancamentos.length > 0 && ...}`), atualizar:

Adicionar `<TableHead>WhatsApp</TableHead>` no header:
```tsx
<TableHead>Membro</TableHead>
<TableHead>Tipo</TableHead>
<TableHead>Descrição</TableHead>
<TableHead>Valor</TableHead>
<TableHead>Status</TableHead>
<TableHead>WhatsApp</TableHead>
```

Construir o mapa de lançamentos pendentes por membro antes do return (dentro do componente):
```typescript
const pendentesMap = lancamentos.reduce<Record<string, typeof lancamentos>>((acc, l) => {
  if (!l.pago && l.member_id) {
    acc[l.member_id] = [...(acc[l.member_id] ?? []), l]
  }
  return acc
}, {})
```

Adicionar `<TableCell>` com botão no map de lancamentos:
```tsx
{lancamentos.map((l) => (
  <TableRow key={l.id}>
    <TableCell className="text-sm">{l.member?.nome ?? '—'}</TableCell>
    <TableCell>
      <Badge variant="secondary" className="text-xs">{l.tipo}</Badge>
    </TableCell>
    <TableCell className="text-sm text-muted-foreground">{l.descricao}</TableCell>
    <TableCell className="text-sm">{formatCurrency(l.valor)}</TableCell>
    <TableCell>
      <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
        {l.pago ? 'Pago' : 'Pendente'}
      </Badge>
    </TableCell>
    <TableCell>
      {l.member_id && (() => {
        const memberObj = members.find((m) => m.id === l.member_id)
        if (!memberObj) return null
        return (
          <WhatsAppButton
            member={memberObj}
            lancamentos={pendentesMap[l.member_id] ?? []}
            sessao={sessao}
          />
        )
      })()}
    </TableCell>
  </TableRow>
))}
```

Também atualizar a prop `members` recebida pela função:
```typescript
export function ResumoFinanceiro({
  sessao,
  members,
  presencasSessao,
  presencasAgape,
  consumos,
  lancamentos,
}: ResumoFinanceiroProps) {
```

- [ ] **Step 4: Atualizar a chamada em `sessoes/[id]/page.tsx`**

A chamada já passa `members` — verificar que o tipo está correto. Atualizar o cast se necessário:

```typescript
<ResumoFinanceiro
  sessao={sessao}
  members={(members ?? []) as MemberWithCargos[]}
  presencasSessao={presencasSessao ?? []}
  presencasAgape={presencasAgape ?? []}
  consumos={consumos}
  lancamentos={lancamentos}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/sessoes/resumo-financeiro.tsx src/app/(dashboard)/sessoes/[id]/page.tsx
git commit -m "feat: add whatsapp button per member in sessao resumo financeiro"
```

---

## Task 7: Wallets dos Membros — coluna WhatsApp

**Files:**
- Modify: `src/app/(dashboard)/financeiro/membros/page.tsx`
- Modify: `src/components/financeiro/member-wallets-table.tsx`

- [ ] **Step 1: Atualizar query de lançamentos em `financeiro/membros/page.tsx` para incluir sessão**

Em `src/app/(dashboard)/financeiro/membros/page.tsx`, atualizar a query de lancamentos:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemberWalletsTable } from '@/components/financeiro/member-wallets-table'
import { Wallet } from 'lucide-react'
import { LancamentoWithSessao } from '@/lib/types'

export default async function MembrosWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('members').select('*').eq('ativo', true).order('nome')

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
      <MemberWalletsTable members={membersWithLancamentos} />
    </div>
  )
}
```

- [ ] **Step 2: Adicionar coluna WhatsApp em `member-wallets-table.tsx`**

Em `src/components/financeiro/member-wallets-table.tsx`:

Adicionar imports:
```typescript
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { LancamentoWithSessao } from '@/lib/types'
```

Atualizar a interface interna para usar `LancamentoWithSessao`:
```typescript
interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}
```

Adicionar `<TableHead>WhatsApp</TableHead>` antes de `<TableHead className="text-right">Ação</TableHead>`:
```tsx
<TableHead>WhatsApp</TableHead>
<TableHead className="text-right">Ação</TableHead>
```

Adicionar `<TableCell>` com botão antes da célula de Ação (dentro do `membersWithStats.map`):
```tsx
<TableCell>
  <WhatsAppButton
    member={m}
    lancamentos={m.lancamentos.filter((l) => !l.pago)}
  />
</TableCell>
<TableCell className="text-right">
  {m.debitoPendente > 0 && (
    <Button ...>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/financeiro/membros/page.tsx src/components/financeiro/member-wallets-table.tsx
git commit -m "feat: add whatsapp button column to member wallets table"
```

---

## Self-Review

### Spec Coverage
- [x] Migration `whatsapp text` na tabela members → Task 1
- [x] Campo WhatsApp no form com máscara → Task 4
- [x] Salvar só dígitos no banco → Task 4 (`setValue` com digits)
- [x] `WhatsAppButton` com props corretas → Task 3
- [x] Botão desabilitado sem whatsapp → Task 3 (`!temWhatsapp`)
- [x] Botão desabilitado sem débitos → Task 3 (`!temDebitos`)
- [x] Tooltip nos estados desabilitados → Task 3
- [x] Link `wa.me/55{whatsapp}?text=...` → Task 3
- [x] `gerarMensagemCobranca()` com saudação, ágape, sessão, produtos, saldo, pix → Task 3
- [x] `PRIMEIRO_NOME` = primeira palavra → Task 3
- [x] `DATA_SESSAO` em dd/MM → Task 3 (via `format`)
- [x] Apenas seções com lançamentos pendentes → Task 3 (filter por tipo antes de renderizar)
- [x] `SALDO_TOTAL_PENDENTE` = soma pago=false → Task 3
- [x] Tabela Membros com coluna WhatsApp → Task 5
- [x] Query membros busca lançamentos pendentes → Task 5
- [x] Página Sessão aba Financeiro com botão por membro → Task 6
- [x] Wallets dos Membros com coluna WhatsApp → Task 7
- [x] Visual verde quando ativo → Task 3
- [x] Visual opaco quando desabilitado → Task 3
- [x] `react-icons` (FaWhatsapp) → Task 3

### Placeholder Scan
- Nenhum "TBD", "TODO" ou implementação incompleta encontrada.

### Type Consistency
- `LancamentoWithSessao` definida em Task 2, usada em Tasks 5, 6, 7 ✓
- `WhatsAppButton` recebe `Member` (com `whatsapp`) e `LancamentoWithSessao[]` ✓
- `MemberWithCargos` já herda `Member` (que agora tem `whatsapp`) ✓
- `pendentesMap` em Task 6 usa `typeof lancamentos` que é `(Lancamento & { member?: Member })[]` — **atenção**: o tipo de lancamentos no ResumoFinanceiro é diferente de `LancamentoWithSessao`. Como passamos `sessao` como prop, não precisamos de `sessao` dentro de cada lancamento nessa tela. A função `gerarMensagemCobranca` usa `sessao?.data` do prop quando disponível. ✓
