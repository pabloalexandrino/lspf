# Design: Compensação Automática de Crédito x Débito nas Wallets

**Data:** 2026-03-29
**Status:** Aprovado

---

## Contexto

Membros podem ter crédito disponível em carteira (lançamentos `pago=true` como depósitos/aberturas). Quando novos débitos de sessão/ágape são gerados, o sistema deve compensar automaticamente esses débitos com o crédito disponível — sem necessidade de pagamento via PIX.

**Exemplo (Silmar):**
- Depósito (abertura): R$ 70,30 → `pago=true`
- 3 sessões geradas: R$ 27,14 → `pago=false`
- Saldo esperado pós-compensação: **R$ 43,16** (crédito restante)

---

## Modelo Contábil

### Fórmula do saldo

```ts
creditos = sum(valor WHERE pago=true)         // inclui compensações negativas
debitos  = sum(valor WHERE pago=false AND NOT compensado)
saldo    = creditos - debitos
```

Débitos compensados (`compensado=true`) **não entram** no cálculo de débitos pendentes. O lançamento de compensação (`valor=-X, pago=true`) **reduz** os créditos, preservando o saldo correto.

**Verificação matemática:**
- Antes: creditos=70,30 | debitos=27,14 | saldo=43,16
- Depois: debitos marcados `compensado=true` + compensação(-27,14, pago=true)
  - creditos = 70,30 + (-27,14) = 43,16
  - debitos = 0
  - saldo = **43,16 ✓**

### Estados de um lançamento de débito

| pago  | compensado | Estado visual | Ação disponível |
|-------|------------|---------------|-----------------|
| false | false      | Pendente       | Checkbox para marcar pago |
| false | true       | Compensado     | Badge cinza, sem ação |
| true  | false      | Pago           | — |

---

## Seção 1: Camada de Dados

### Migration (novo arquivo)

```sql
-- Add compensado flag to lancamentos
ALTER TABLE lancamentos
  ADD COLUMN compensado boolean NOT NULL DEFAULT false;

-- Add 'compensacao' to tipo check constraint
ALTER TABLE lancamentos
  DROP CONSTRAINT lancamentos_tipo_check;
ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_tipo_check
  CHECK (tipo IN (
    'sessao','agape','produto',
    'mensalidade','oferta','deposito','outro','saida_caixa',
    'compensacao'
  ));
```

### TypeScript — `lib/types.ts`

- `Lancamento.tipo`: adicionar `'compensacao'` à union
- `Lancamento`: adicionar `compensado: boolean`

---

## Seção 2: Auto-compensação em `gerarLancamentos`

Inserir após o step 4 (insert dos lançamentos), sem alterar nada antes.

### Algoritmo por membro

```
Para cada member_id com novos débitos desta sessão:

1. Calcular crédito disponível ANTES desta sessão:
   available_credit =
     sum(valor WHERE pago=true AND member_id=X)
     - sum(valor WHERE pago=false AND NOT compensado AND member_id=X AND sessao_id != currentSession)

2. Se available_credit <= 0: pular este membro

3. Ordenar novos débitos por valor ASC (maximiza itens cobertos)

4. Iterar consumindo crédito:
   remaining = available_credit
   to_compensate = []
   Para cada débito:
     if remaining >= debito.valor:
       to_compensate.push(debito)
       remaining -= debito.valor

5. Se to_compensate.length > 0:
   a. UPDATE lancamentos SET compensado=true WHERE id IN (ids)
   b. INSERT lancamento de compensação:
      {
        sessao_id:  sessaoId,        ← deletado na re-geração
        member_id:  X,
        tipo:       'compensacao',
        valor:      -(soma dos débitos cobertos),  ← negativo
        pago:       true,
        compensado: false,
        descricao:  'Compensação automática de crédito em carteira',
        caixa_id:   null,
      }
```

### Re-geração

O `DELETE WHERE sessao_id` já existente apaga os débitos da sessão e o lançamento de compensação desta sessão. Compensações de outras sessões e créditos globais do membro ficam intocados. A compensação é recalculada do zero na próxima geração.

---

## Seção 3: UI — `/financeiro/membros`

### `member-wallets-table.tsx`

**Fórmula de saldo corrigida:**
```ts
const debitoPendente = lancamentos
  .filter(l => !l.pago && !l.compensado)
  .reduce((s, l) => s + l.valor, 0)

const totalPago = lancamentos
  .filter(l => l.pago)
  .reduce((s, l) => s + l.valor, 0)   // inclui compensações negativas

const saldo = totalPago - debitoPendente
```

**Tabela principal:**
- Coluna "Débito Pendente": soma apenas `pago=false AND NOT compensado`
- Botão "Registrar pagamento": visível somente se `debitoPendente > 0`

**Sheet de lançamentos (ao clicar "Registrar pagamento"):**
- Seção A — Pendentes reais (`pago=false, compensado=false`): checkbox + valor
- Seção B — Compensados (`compensado=true`): badge cinza "Compensado", sem checkbox, sem ação

**WhatsAppButton (`whatsapp-button.tsx`):**
- Recebe todos os lançamentos do membro (já implementado)
- A lógica de mensagem já usa `creditos - debitos` (já corrigida)
- Corrigir: `pendentes = lancamentos.filter(l => !l.pago && !l.compensado)` — excluir compensados
- `temDebitos` e agrupamentos de agape/sessoes/produtos usam `pendentes` — herdam a correção automaticamente

---

## Seção 4: Dashboard — `/financeiro/page.tsx`

**Substituir os 2 cards por 4:**

| Card | Fórmula |
|------|---------|
| Total Pendente Real | `sum(pago=false AND NOT compensado)` |
| Total Pago | `sum(pago=true)` (inalterado) |
| Membros c/ crédito | membros onde `saldo > 0` → count + soma dos saldos |
| Membros devedores | membros onde `saldo < 0` → count + soma dos saldos abs |

`MemberSummary` (aba "Por Membro" em `/financeiro`):
- `pendingIds` e `totalPendente` devem filtrar `!l.pago && !l.compensado` — excluir compensados
- Botão "Quitar tudo" não deve incluir itens `compensado=true`
- Exibir badge "Compensado" para itens com `compensado=true` ao expandir membro

---

## Escopo

**Dentro do escopo:**
- Migration de banco (coluna + constraint)
- Lógica de compensação em `gerarLancamentos`
- UI de wallets (`/financeiro/membros`)
- Dashboard (`/financeiro`)
- Tipos TypeScript

**Fora do escopo:**
- Lógica de sessões, presenças ou caixas
- Mensalidades
- Compensação retroativa de débitos de sessões antigas (apenas novos lançamentos gerados pelo `gerarLancamentos`)
