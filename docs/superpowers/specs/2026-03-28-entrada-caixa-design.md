# Entrada de Caixa — Design Spec

**Data:** 2026-03-28
**Status:** Aprovado

---

## Objetivo

Permitir registrar entradas manuais nos caixas (rendimentos, depósitos externos, ajustes) sem precisar alterar diretamente o banco de dados. Complementa a funcionalidade de saídas de caixa já existente.

---

## Arquitetura

### Tipo de lançamento

Reutiliza tipos existentes de `Lancamento.tipo`: `'deposito'`, `'oferta'`, `'outro'`. Nenhum novo tipo é criado.

Entradas manuais são caracterizadas por:
- `tipo IN ('deposito', 'oferta', 'outro')`
- `member_id = null`
- `pago = true`
- `caixa_id` preenchido

Essa combinação é consistente com a fórmula de saldo do caixa:
```
saldo = SUM(valor WHERE pago=true AND tipo != 'saida_caixa' AND member_id IS NULL)
       - SUM(valor WHERE tipo = 'saida_caixa')
```

### Componentes afetados

| Arquivo | Ação |
|---|---|
| `src/lib/validations.ts` | Adicionar `entradaCaixaSchema` e `EntradaCaixaFormData` |
| `src/app/actions/saidas-caixa.ts` | Adicionar `registrarEntrada` e `excluirEntrada` |
| `src/components/financeiro/entrada-caixa-sheet.tsx` | Criar — sheet form de nova entrada |
| `src/components/financeiro/caixas-cards.tsx` | Adicionar botão "Registrar Entrada" e delete para entradas manuais |

---

## Formulário (`EntradaCaixaSheet`)

**Campos:**

| Campo | Tipo | Obrigatório | Detalhe |
|---|---|---|---|
| Tipo | select | sim | Opções: `deposito`, `oferta`, `outro` |
| Descrição | text | sim | Texto livre |
| Valor | number | sim | min 0.01 |
| Data | date | sim | Default = hoje (timezone-safe via `getFullYear/getMonth/getDate`) |
| Sessão relacionada | select | não | Lista de sessões disponíveis |

Sem campo Membro — entradas manuais sempre têm `member_id = null` (requisito da fórmula de saldo).

**Comportamento:**
- Botão trigger: "Registrar Entrada", variant outline, cor verde (`border-green-600 text-green-600 hover:bg-green-600/10`), ícone `TrendingUp`
- Submit chama `registrarEntrada`, exibe `toast.success` / `toast.error`, fecha sheet, chama `router.refresh()`
- Form reseta ao fechar o sheet

---

## Server Actions (`saidas-caixa.ts`)

### `registrarEntrada(data: unknown)`
- Autentica usuário
- Valida com `entradaCaixaSchema`
- Insere em `lancamentos` com `pago: true`, `member_id: null`, `sessao_id: null | string`
- `revalidatePath('/financeiro/caixas')` e `revalidatePath('/')`
- Retorna `{ success: true }` ou `{ error: string }`

### `excluirEntrada(id: string)`
- Autentica usuário
- Deleta com guard: `.eq('id', id).in('tipo', ['deposito', 'oferta', 'outro']).is('member_id', null)`
- `revalidatePath('/financeiro/caixas')` e `revalidatePath('/')`
- Retorna `{ success: true }` ou `{ error: string }`

---

## CaixasCards

**Botões por card:** dois botões lado a lado — "Registrar Entrada" (verde) e "Registrar Saída" (vermelho).

**Extrato — botão excluir:** aparece para:
- `tipo === 'saida_caixa'` (comportamento existente)
- `['deposito', 'oferta', 'outro'].includes(l.tipo) && l.member_id === null` (novo)

Antes de excluir, `window.confirm()` (consistente com o comportamento das saídas).

---

## Fora de escopo

- Edição de entradas (não solicitado)
- Vinculação a membros em entradas manuais
- Novo tipo de lançamento
