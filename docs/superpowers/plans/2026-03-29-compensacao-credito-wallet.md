# Compensação Automática de Crédito — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compensar automaticamente débitos de sessão/ágape com crédito disponível na wallet do membro, preservando saldo = créditos − débitos_não_compensados.

**Architecture:** Campo `compensado boolean` em `lancamentos` distingue "coberto por crédito" de "pendente real". Lançamento de compensação (valor negativo, pago=true) consome o crédito sem necessidade de PIX. Fórmula: `sum(pago=true) − sum(pago=false AND NOT compensado)`.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS, shadcn/ui

---

## Mapa de Arquivos

| Arquivo | Operação |
|---------|----------|
| `supabase/migrations/20260329000000_compensacao_credito.sql` | Criar |
| `src/lib/types.ts` | Modificar |
| `src/app/actions/financeiro.ts` | Modificar |
| `src/components/financeiro/member-wallets-table.tsx` | Modificar |
| `src/components/members/whatsapp-button.tsx` | Modificar |
| `src/components/financeiro/member-summary.tsx` | Modificar |
| `src/app/(dashboard)/financeiro/page.tsx` | Modificar |

---

### Task 1: Migration + TypeScript types

**Files:**
- Create: `supabase/migrations/20260329000000_compensacao_credito.sql`
- Modify: `src/lib/types.ts`

- [ ] **Criar arquivo de migration**

Crie `supabase/migrations/20260329000000_compensacao_credito.sql`:

```sql
-- Add compensado flag: distinguishes "covered by credit" from "pending payment"
ALTER TABLE lancamentos
  ADD COLUMN compensado boolean NOT NULL DEFAULT false;

-- Extend tipo check constraint to include 'compensacao'
ALTER TABLE lancamentos
  DROP CONSTRAINT IF EXISTS lancamentos_tipo_check;

ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_tipo_check
  CHECK (tipo IN (
    'sessao', 'agape', 'produto',
    'mensalidade', 'oferta',
    'deposito', 'outro', 'saida_caixa',
    'compensacao'
  ));
```

- [ ] **Aplicar migration ao banco**

Via Supabase Dashboard → SQL Editor, ou:
```bash
supabase db push
```

Verificar: a tabela `lancamentos` deve ter a coluna `compensado` e o constraint deve incluir `'compensacao'`.

- [ ] **Atualizar tipo `Lancamento` em `src/lib/types.ts`**

Localizar o tipo `Lancamento` (linha ~54) e aplicar as duas mudanças:

```ts
export type Lancamento = {
  id: string
  sessao_id: string | null
  member_id: string | null
  tipo: 'sessao' | 'agape' | 'produto' | 'mensalidade' | 'oferta' | 'deposito' | 'outro' | 'saida_caixa' | 'compensacao'
  descricao: string | null
  valor: number
  pago: boolean
  compensado: boolean
  data_pagamento: string | null
  caixa_id: string | null
  created_at: string
}
```

- [ ] **Verificar que o projeto compila sem erros de tipo**

```bash
npx tsc --noEmit
```

Esperado: sem erros relacionados a `compensado` ou `tipo`.

- [ ] **Commit**

```bash
git add supabase/migrations/20260329000000_compensacao_credito.sql src/lib/types.ts
git commit -m "feat: add compensado field and compensacao tipo to lancamentos"
```

---

### Task 2: Auto-compensação em `gerarLancamentos`

**Files:**
- Modify: `src/app/actions/financeiro.ts`

- [ ] **Adicionar lógica de auto-compensação após o insert (step 4)**

Localizar o comentário `// 5. Revalidate` em `src/app/actions/financeiro.ts` (linha ~119) e inserir o bloco abaixo ANTES dele:

```ts
  // 5. Auto-compensate members who have available credit
  const memberIdsWithDebits = [...new Set(lancamentos.map((l) => l.member_id))]

  for (const memberId of memberIdsWithDebits) {
    // Fetch all pago=true for this member (includes previous negative compensações)
    const [{ data: credits }, { data: otherDebits }] = await Promise.all([
      supabase
        .from('lancamentos')
        .select('valor')
        .eq('member_id', memberId)
        .eq('pago', true),
      supabase
        .from('lancamentos')
        .select('valor')
        .eq('member_id', memberId)
        .eq('pago', false)
        .eq('compensado', false)
        .neq('sessao_id', sessaoId),
    ])

    const totalCredito = (credits ?? []).reduce((s, l) => s + Number(l.valor), 0)
    const totalOtherDebits = (otherDebits ?? []).reduce((s, l) => s + Number(l.valor), 0)
    const availableCredit = totalCredito - totalOtherDebits

    if (availableCredit <= 0) continue

    // Fetch just-inserted debits for this member+session, ordered by valor ASC
    const { data: newDebits } = await supabase
      .from('lancamentos')
      .select('id, valor')
      .eq('sessao_id', sessaoId)
      .eq('member_id', memberId)
      .eq('pago', false)
      .eq('compensado', false)
      .order('valor', { ascending: true })

    if (!newDebits || newDebits.length === 0) continue

    let remaining = availableCredit
    const toCompensate: string[] = []

    for (const debit of newDebits) {
      const valor = Number(debit.valor)
      if (remaining >= valor) {
        toCompensate.push(debit.id)
        remaining -= valor
      }
    }

    if (toCompensate.length === 0) continue

    const totalCompensado = Math.round(
      newDebits
        .filter((d) => toCompensate.includes(d.id))
        .reduce((s, d) => s + Number(d.valor), 0) * 100
    ) / 100

    await Promise.all([
      supabase
        .from('lancamentos')
        .update({ compensado: true })
        .in('id', toCompensate),
      supabase.from('lancamentos').insert({
        sessao_id: sessaoId,
        member_id: memberId,
        tipo: 'compensacao',
        valor: -totalCompensado,
        pago: true,
        compensado: false,
        descricao: 'Compensação automática de crédito em carteira',
        caixa_id: null,
      }),
    ])
  }
```

O comentário original `// 5. Revalidate` passa a ser `// 6. Revalidate` — atualizar os números dos comentários dos steps 5 e 6.

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

- [ ] **Verificar comportamento manual**

1. Abrir `/sessoes/[id]` de uma sessão com membros que têm crédito
2. Clicar em "Gerar Lançamentos"
3. Ir em `/financeiro/membros`
4. Confirmar que o membro com crédito tem `compensado=true` nos débitos e saldo correto

- [ ] **Commit**

```bash
git add src/app/actions/financeiro.ts
git commit -m "feat: auto-compensate session debits with available wallet credit"
```

---

### Task 3: Wallets table — fórmula de saldo + Sheet com seção "Compensado"

**Files:**
- Modify: `src/components/financeiro/member-wallets-table.tsx`

- [ ] **Corrigir fórmula de saldo e `debitoPendente`**

Localizar o bloco `membersWithStats` (linha ~62) e substituir:

```ts
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
```

- [ ] **Separar pendentes e compensados na Sheet**

Localizar `const pendentes = sheetMember?.lancamentos.filter((l) => !l.pago) ?? []` (linha ~32) e substituir:

```ts
  const pendentesReais = sheetMember?.lancamentos.filter((l) => !l.pago && !l.compensado) ?? []
  const compensados = sheetMember?.lancamentos.filter((l) => l.compensado) ?? []
```

- [ ] **Substituir todas as referências de `pendentes` por `pendentesReais` na Sheet**

Localizar todos os usos de `pendentes` na lógica da Sheet e renomear:
- `pendentes.length === 0` → `pendentesReais.length === 0`
- `pendentes.map(...)` → `pendentesReais.map(...)`
- `pendentes.filter((l) => selected.has(l.id))` → `pendentesReais.filter((l) => selected.has(l.id))`

- [ ] **Adicionar seção "Compensados" no conteúdo da Sheet**

Dentro do bloco `<>` que existe quando `pendentesReais.length > 0`, APÓS o `</div>` da lista de checkboxes e ANTES do `<div className="border-t ...">`, adicionar:

```tsx
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
```

Também mostrar a seção "Compensados" mesmo quando não há pendentes reais. Substituir a condição inicial da Sheet de:

```tsx
            {pendentesReais.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
```

por:

```tsx
            {pendentesReais.length === 0 && compensados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/financeiro/member-wallets-table.tsx
git commit -m "feat: fix wallet saldo formula and show Compensado state in sheet"
```

---

### Task 4: WhatsApp button — excluir compensados de `pendentes`

**Files:**
- Modify: `src/components/members/whatsapp-button.tsx`

- [ ] **Corrigir filtro `pendentes` em `gerarMensagemCobranca`**

Localizar linha ~21:
```ts
  const pendentes = lancamentos.filter((l) => !l.pago)
```

Substituir por:
```ts
  const pendentes = lancamentos.filter((l) => !l.pago && !l.compensado)
```

Esta linha é usada para `agapes`, `sessoesLanc`, `produtos` e para `debitos` no cálculo do saldo — todos herdam a correção automaticamente.

- [ ] **Corrigir `temDebitos` no componente `WhatsAppButton`**

Localizar linha ~72:
```ts
  const pendentes = lancamentos.filter((l) => !l.pago)
```

Substituir por:
```ts
  const pendentes = lancamentos.filter((l) => !l.pago && !l.compensado)
```

Isso garante que o botão WhatsApp fique desabilitado para membros cujos débitos estão todos compensados.

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/members/whatsapp-button.tsx
git commit -m "feat: exclude compensado debits from whatsapp charge message"
```

---

### Task 5: Member summary — excluir compensados de `pendingIds` + badge

**Files:**
- Modify: `src/components/financeiro/member-summary.tsx`

- [ ] **Corrigir `totalPendente` e `pendingIds`**

Localizar o bloco `byMember` (linha ~23):

```ts
  const byMember = members.map((member) => {
    const memberLancamentos = lancamentos.filter((l) => l.member_id === member.id)
    const totalPago = memberLancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const totalPendente = memberLancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
    return { member, lancamentos: memberLancamentos, totalPago, totalPendente }
  }).filter((g) => g.lancamentos.length > 0)
```

Substituir por:

```ts
  const byMember = members.map((member) => {
    const memberLancamentos = lancamentos.filter((l) => l.member_id === member.id)
    const totalPago = memberLancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const totalPendente = memberLancamentos.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    return { member, lancamentos: memberLancamentos, totalPago, totalPendente }
  }).filter((g) => g.lancamentos.length > 0)
```

- [ ] **Corrigir `pendingIds` dentro do `.map` de renderização**

Localizar linha ~55:
```ts
        const pendingIds = mLancamentos.filter((l) => !l.pago).map((l) => l.id)
```

Substituir por:
```ts
        const pendingIds = mLancamentos.filter((l) => !l.pago && !l.compensado).map((l) => l.id)
```

- [ ] **Adicionar badge "Compensado" na lista expandida**

Localizar o mapeamento de lançamentos na view expandida (linha ~94):

```tsx
                {mLancamentos.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                      <span className="text-muted-foreground">{l.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(l.valor)}</span>
                      <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                        {l.pago ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
```

Substituir por:

```tsx
                {mLancamentos.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                      <span className="text-muted-foreground">{l.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(l.valor)}</span>
                      <Badge
                        variant={l.pago ? 'default' : 'secondary'}
                        className={l.compensado ? 'text-xs bg-muted text-muted-foreground' : 'text-xs'}
                      >
                        {l.pago ? 'Pago' : l.compensado ? 'Compensado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/components/financeiro/member-summary.tsx
git commit -m "feat: exclude compensado from pending ids and show Compensado badge"
```

---

### Task 6: Dashboard — 4 cards com breakdown de crédito/débito

**Files:**
- Modify: `src/app/(dashboard)/financeiro/page.tsx`

- [ ] **Corrigir `totalPendente` e adicionar métricas de saldo por membro**

Localizar o bloco de cálculo após o `map` de enriquecimento (linha ~33):

```ts
  const totalPendente = lancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
  const totalPago = lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
```

Substituir por:

```ts
  const totalPendente = lancamentos
    .filter((l) => !l.pago && !l.compensado)
    .reduce((s, l) => s + l.valor, 0)

  const totalPago = lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)

  // Per-member saldo for dashboard breakdown
  const memberSaldos = (members ?? []).map((m) => {
    const mLanc = lancamentos.filter((l) => l.member_id === m.id)
    const creditos = mLanc.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const debitos = mLanc.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    return creditos - debitos
  })

  const membrosComCredito = memberSaldos.filter((s) => s > 0)
  const membrosDevedores = memberSaldos.filter((s) => s < 0)
  const totalCreditoDisponivel = membrosComCredito.reduce((s, v) => s + v, 0)
  const totalDevidoReal = membrosDevedores.reduce((s, v) => s + Math.abs(v), 0)
```

- [ ] **Substituir os 2 cards por 4 cards**

Localizar o bloco `{/* Summary cards */}` (linha ~43):

```tsx
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Pendente</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-xl font-bold text-green-500">{formatCurrency(totalPago)}</p>
        </div>
      </div>
```

Substituir por:

```tsx
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Pendente Real</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalPendente)}</p>
          <p className="text-xs text-muted-foreground mt-1">{membrosDevedores.length} membros devedores</p>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-xl font-bold text-green-500">{formatCurrency(totalPago)}</p>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Créditos em Carteira</p>
          <p className="text-xl font-bold text-blue-500">{formatCurrency(totalCreditoDisponivel)}</p>
          <p className="text-xs text-muted-foreground mt-1">{membrosComCredito.length} membros c/ crédito</p>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Devido</p>
          <p className="text-xl font-bold text-orange-500">{formatCurrency(totalDevidoReal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{membrosDevedores.length} devedores</p>
        </div>
      </div>
```

- [ ] **Verificar compilação**

```bash
npx tsc --noEmit
```

- [ ] **Verificar visualmente**

1. Abrir `/financeiro`
2. Confirmar 4 cards presentes
3. "Pendente Real" não inclui membros compensados
4. "Créditos em Carteira" mostra membros com saldo positivo

- [ ] **Commit**

```bash
git add src/app/(dashboard)/financeiro/page.tsx
git commit -m "feat: update dashboard with 4-card credit/debt breakdown"
```

---

## Verificação Final

Após todos os tasks, testar o fluxo completo:

1. Membro com depósito (abertura, `pago=true`) — ex: R$ 70,30
2. Gerar lançamentos para uma sessão com esse membro
3. Confirmar em `/financeiro/membros`:
   - Débitos da sessão aparecem com badge "Compensado" (não "Pendente")
   - Saldo = R$ 43,16 (não R$ 70,30 nem R$ 97,44)
   - Botão "Registrar pagamento" ausente (sem débitos reais)
4. Confirmar em `/financeiro`:
   - "Pendente Real" não inclui esse membro
   - "Créditos em Carteira" conta esse membro com R$ 43,16
5. Regenerar lançamentos (simular mudança de custo):
   - Clicar "Gerar Lançamentos" novamente
   - Saldo continua correto — compensação recalculada do zero
