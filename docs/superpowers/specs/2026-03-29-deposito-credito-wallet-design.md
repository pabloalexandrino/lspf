# Depósito Manual de Crédito na Wallet — Design Spec

**Data:** 2026-03-29
**Status:** Aprovado

## Objetivo

Permitir que administradores registrem depósitos antecipados na wallet de cada membro. O crédito depositado é consumido automaticamente pela compensação automática já existente conforme cobranças de sessão, ágape e produtos são geradas.

---

## Contexto

O sistema já possui:
- Campo `compensado boolean` em `lancamentos` (migration `20260329000000_compensacao_credito.sql`)
- Lógica de compensação automática em `gerarLancamentos` (opera sobre débitos da sessão recém-gerada)
- Card "Créditos em Carteira" no dashboard (`/financeiro`)
- Tabela de wallets em `/financeiro/membros` com Sheet de lançamentos pendentes

Esta feature adiciona o fluxo de depósito manual e estende a compensação para operar também no momento do depósito.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Armazenamento | `lancamentos` com `tipo='deposito'`, `pago=true` | Reutiliza estrutura existente, sem nova tabela |
| Migration | Nenhuma | Campo `compensado` já existe |
| Ordem de compensação | Por `created_at ASC` (mais antigo primeiro) | Semântica correta para débitos de meses diferentes |
| `caixa_id` da compensação | `null` | Operação interna, não movimenta caixa fisicamente |
| Organização dos componentes | Componentes extraídos (`DepositoSheet`, `ExtratoSheet`) | Reutilizáveis na tabela e na página de detalhe |
| Sheet atual de pendentes | Substituído pelo `ExtratoSheet` (extrato completo) | UX mais rico, saldo acumulado visível |

---

## Arquivos

### Novos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/actions/deposito.ts` | Server action `registrarDeposito` |
| `src/components/financeiro/deposito-sheet.tsx` | Formulário de depósito |
| `src/components/financeiro/extrato-sheet.tsx` | Extrato completo com saldo acumulado + `ExtratoContent` |
| `src/app/(dashboard)/financeiro/membros/[id]/page.tsx` | Página de detalhe do membro |

### Modificados

| Arquivo | O que muda |
|---------|-----------|
| `src/components/financeiro/member-wallets-table.tsx` | Troca Sheet inline por `ExtratoSheet`; adiciona botão "Depositar"; recebe `caixas[]` |
| `src/app/(dashboard)/financeiro/membros/page.tsx` | Busca `caixas` ativos; passa para `MemberWalletsTable` |

---

## Server Action — `registrarDeposito`

**Assinatura:**
```ts
registrarDeposito(memberId: string, valor: number, data: string, descricao: string, caixaId: string | null): Promise<{ success?: boolean; error?: string }>
```

**Fluxo:**
1. Validar autenticação
2. Inserir `lancamento`: `tipo='deposito'`, `pago=true`, `valor`, `member_id`, `caixa_id`, `data_pagamento=data`, `descricao`, `compensado=false`
3. Buscar crédito disponível do membro: `sum(pago=true) − sum(pago=false AND NOT compensado)` — inclui o novo depósito
4. Se `availableCredit > 0`: buscar todos os débitos `pago=false AND compensado=false` do membro, ordenados por `created_at ASC`
5. Compensar do mais antigo ao mais novo até esgotar o crédito disponível
6. Para os débitos compensados: `UPDATE lancamentos SET compensado=true WHERE id IN (...)`
7. Inserir lançamento de compensação: `tipo='compensacao'`, `pago=true`, `valor=-totalCompensado`, `member_id`, `caixa_id=null`, `compensado=false`
8. Revalidar: `/financeiro/membros`, `/financeiro/membros/[memberId]`, `/financeiro`, `/`

---

## Componentes

### `DepositoSheet`

**Tipo:** Client component
**Props:** `member: Member`, `caixas: Caixa[]`, `open: boolean`, `onOpenChange: (open: boolean) => void`

**Formulário:**
- Membro: input readonly com `member.nome`
- Valor (R$): input numérico, obrigatório, mínimo 0.01
- Data: date input, default hoje (formato `YYYY-MM-DD`)
- Descrição: text input, default "Depósito antecipado"
- Caixa: select com `caixas[]`, opcional (pode ser null)
- Botão "Registrar Crédito"

**Comportamento ao submeter:**
1. Chama `registrarDeposito`
2. Toast de sucesso: `"Crédito de R$ X registrado para [nome]"` ou erro
3. Fecha Sheet
4. `router.refresh()`

---

### `ExtratoContent`

**Tipo:** Componente puro (sem estado, sem server actions)
**Props:** `lancamentos: LancamentoWithSessao[]`

**Renderiza:**
- Tabela com colunas: Data | Tipo | Descrição | Valor | Saldo
- Ordenada por `created_at ASC`
- Saldo calculado de forma acumulada linha a linha
- Lançamentos `compensado=true` exibem badge "Compensado"
- Lançamentos `tipo='compensacao'` exibem em cor muted
- Valores positivos em verde, negativos em vermelho

**Cálculo do saldo acumulado:**

Percorrer lançamentos em `created_at ASC` e acumular:
- `pago=true AND tipo !== 'compensacao'` → `+valor` (depósitos e pagamentos reais)
- `pago=false AND !compensado` → `-valor` (débitos reais pendentes)
- `tipo='compensacao'` → ignorar (lançamento interno de balanceamento)
- `compensado=true` → ignorar (a dívida existe, mas está coberta pelo crédito)

O saldo de cada linha é o acumulado até aquela linha. O saldo final coincide com o exibido na tabela de wallets.

---

### `ExtratoSheet`

**Tipo:** Client component
**Props:** `member: MemberWithLancamentos`, `caixas: Caixa[]`, `open: boolean`, `onOpenChange: (open: boolean) => void`

**Layout:**
- Header: "Extrato — [nome]" + botão "Depositar" (abre `DepositoSheet`)
- `ExtratoContent` com os lançamentos do membro
- Footer: saldo atual em destaque
- Débitos pendentes têm checkbox para marcar como pago (mantém `marcarPagoLote`)
- Botão "Confirmar pagamentos" habilitado quando há selecionados

---

### `MemberWalletsTable` (mudanças)

- Recebe nova prop `caixas: Caixa[]`
- Botão "Ver extrato" em **todas** as linhas (não condicional a débito pendente)
- Remove Sheet inline (linhas 133–198)
- Usa `<ExtratoSheet>` (que internamente abre `<DepositoSheet>`)

---

## Página `/financeiro/membros/[id]`

**Tipo:** Server component

**Data fetching:**
- `members` por `id`
- `lancamentos` do membro com join `sessoes`
- `caixas` ativos

**Layout:**
- Header: nome do membro, cargo (badge), saldo atual (badge colorido)
- Botão "Registrar Depósito" → abre `DepositoSheet`
- `ExtratoContent` exibido diretamente na página (não em Sheet)
- Link "← Wallets" de volta para `/financeiro/membros`

---

## O que NÃO muda

- Lógica de sessões, presenças, caixas
- `gerarLancamentos` — compensação em sessão permanece inalterada
- Schema do banco — nenhuma migration necessária
- Cards do dashboard — já implementados no Task 6
