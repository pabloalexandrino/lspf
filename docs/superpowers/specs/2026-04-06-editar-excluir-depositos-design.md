# Design: Editar e Excluir Depósitos de Membros

**Data:** 2026-04-06
**Status:** Aprovado

## Problema

Atualmente só é possível adicionar depósitos (créditos) a membros. Se um valor incorreto for inserido, não há como corrigir — é necessário recomeçar do zero sem apagar o erro.

## Solução

Expandir o `DepositoSheet` para exibir o histórico de depósitos do membro com ações de editar e excluir. A lógica de compensação automática é recalculada do zero a cada operação para garantir consistência.

---

## UI: DepositoSheet expandido

O `DepositoSheet` recebe uma nova prop `depositos: Lancamento[]` (lançamentos filtrados com `tipo = 'deposito'` do membro, passados pela página pai já existente).

**Layout em duas partes:**

### Parte superior — Histórico de depósitos
- Lista cada depósito: data | descrição | valor | botões Editar e Excluir
- "Editar" → preenche o formulário abaixo e ativa `editingId` (estado local)
- "Excluir" → executa a exclusão imediatamente com toast de feedback
- Se vazia: "Nenhum depósito registrado"

### Parte inferior — Formulário
- Modo criação (padrão): botão "Registrar Crédito" (comportamento atual inalterado)
- Modo edição (`editingId !== null`): botão "Salvar Alterações" + botão "Cancelar"

**Dados necessários:** a página `MembrosWalletPage` já busca todos os `lancamentos` do membro. O `MemberWalletsTable` filtra e passa `depositos` para o `DepositoSheet`.

---

## Server Actions

Dois novos exports em `src/app/actions/deposito.ts`:

### `editarDeposito(depositoId, memberId, valor, data, descricao, caixaId)`

1. Atualiza o lançamento `depositoId` com os novos valores
2. Deleta todos os `lancamentos` com `tipo = 'compensacao'` do membro
3. Reseta `compensado = false` em todos os débitos do membro
4. Re-executa o algoritmo de compensação automática com todos os depósitos restantes

### `excluirDeposito(depositoId, memberId)`

1. Deleta o lançamento `depositoId`
2. Deleta todos os `lancamentos` com `tipo = 'compensacao'` do membro
3. Reseta `compensado = false` em todos os débitos do membro
4. Re-executa o algoritmo de compensação automática com depósitos restantes

### Algoritmo de compensação (reutilizado)

Extrair a lógica de compensação do `registrarDeposito` para uma função interna `_recomputarCompensacoes(supabase, memberId)` que:
- Busca todos os depósitos ativos do membro (`tipo = 'deposito', pago = true`)
- Calcula crédito total
- Busca débitos pendentes ordenados por `created_at`
- Quita os mais antigos primeiro até esgotar o crédito
- Insere lançamento de compensação

Tanto `registrarDeposito`, `editarDeposito` e `excluirDeposito` chamam `_recomputarCompensacoes` após sua operação principal.

---

## Fluxo de dados

```
MembrosWalletPage (Server Component)
  └─ fetches all lancamentos for all members
       └─ MemberWalletsTable
            └─ DepositoSheet
                 props: member, caixas, open, onOpenChange
                 new prop: depositos (Lancamento[] filtrado tipo='deposito')
```

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/app/actions/deposito.ts` | Extrair `_recomputarCompensacoes`, adicionar `editarDeposito` e `excluirDeposito` |
| `src/components/financeiro/deposito-sheet.tsx` | Nova prop `depositos`, lista histórico, modo edição |
| `src/components/financeiro/member-wallets-table.tsx` | Filtrar e passar `depositos` para `DepositoSheet` |

---

## Critérios de aceite

- [ ] Lista de depósitos visível ao abrir o Sheet
- [ ] Editar preenche o formulário com dados existentes
- [ ] Salvar edição atualiza o depósito e recalcula compensações
- [ ] Excluir remove o depósito e recalcula compensações
- [ ] Cancelar edição limpa o formulário sem alterar dados
- [ ] Revalidação de todas as páginas relevantes após cada operação
