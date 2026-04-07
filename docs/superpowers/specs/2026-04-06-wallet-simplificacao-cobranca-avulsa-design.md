# Design: Simplificação da Carteira + Cobrança Avulsa

**Data:** 2026-04-06
**Status:** Aprovado

## Problema

O fluxo de pagamento atual tem dois caminhos ("Pagar em dinheiro" e "Usar crédito da wallet") que geram confusão. O modelo correto é: tudo passa pela carteira do membro, que pode ficar negativa. Além disso, falta uma forma de criar cobranças avulsas (ex: rateio de despesa extraordinária) e notificar os membros via WhatsApp.

## Solução

Redesign incremental em 3 partes independentes:
1. Remover "Pagar em dinheiro" — único fluxo de quitação é via carteira
2. `usarCreditoWallet` sem guard de saldo — sempre quita, podendo deixar negativo
3. Cobrança Avulsa — nova feature para criar débitos customizados por membro

---

## Parte 1: Remover "Pagar em dinheiro"

**Arquivo:** `src/components/financeiro/member-wallets-table.tsx`

- Remove o botão "Pagar em dinheiro" e sua handler `handleRegistrarPagamento`
- Remove o import de `marcarPagoLote`
- Renomeia o botão "Usar crédito da wallet" para **"Quitar via carteira"**
- Remove a condicional `{creditoDisponivel > 0 && (...)}` — botão sempre visível quando há pendentes
- Remove o bloqueio `disabled={... || valorSelecionado > creditoDisponivel}`
- Remove o texto "Crédito disponível: X — insuficiente para a seleção"
- Mantém exibição do crédito disponível apenas como informativo (sem bloquear ação)

---

## Parte 2: `usarCreditoWallet` sem verificação de saldo

**Arquivo:** `src/app/actions/financeiro.ts`

A action atual chama `supabase.rpc('usar_credito_wallet')` — função Postgres que tem o guard `IF v_available_credit < v_total_selecionado THEN RAISE EXCEPTION 'Crédito insuficiente'` embutido (migration `20260406000001`).

**Abordagem:** abandonar o RPC e reescrever com queries diretas (mesmo padrão de `deposito.ts`). Sem nova migration necessária.

A action `usarCreditoWallet(memberId, lancamentoIds[])` passa a:
1. Auth check
2. Buscar os lançamentos selecionados, validar que pertencem ao membro e estão `pago=false, compensado=false`
3. Somar os valores (`totalSelecionado`)
4. Marcar `compensado=true` nos lançamentos selecionados
5. Inserir lançamento `tipo='compensacao', valor=-totalSelecionado, pago=true, caixa_id=null`
6. Revalidar as páginas relevantes
7. Retornar erro apenas por falha de banco — nunca por saldo insuficiente

Remove: chamada ao RPC, fetch de crédito disponível, validação de saldo suficiente.

---

## Parte 3: Cobrança Avulsa

### UI — `CobrancaSheet`

**Arquivo:** `src/components/financeiro/cobranca-sheet.tsx` (novo)

Sheet com:
- Campo **Descrição** (texto livre, ex: "Rateio aluguel ônibus — Iniciação 2026")
- Campo **Valor por membro** (número, R$)
- Lista de membros ativos com checkboxes individuais + botão "Selecionar todos"
- Botão "Criar Cobrança" — disabled enquanto loading ou sem seleção válida

**Botão de acesso:** "Nova Cobrança" no topo da página `/financeiro/membros`, ao lado do título "Wallets dos Membros".

### Action `criarCobranca`

**Arquivo:** `src/app/actions/cobranca.ts` (novo)

`criarCobranca(descricao: string, valor: number, memberIds: string[])`

1. Auth check
2. Validações: descrição não vazia, valor > 0, memberIds.length > 0
3. Insere um lançamento por membro:
   ```
   tipo='outro', pago=false, compensado=false,
   valor, descricao, member_id, sessao_id=null, caixa_id=null
   ```
4. Revalida `/financeiro/membros`
5. Retorna `{ success: true, count: memberIds.length }` ou `{ error: string }`

### Resultado na UI

- Cada membro selecionado aparece com o novo débito pendente na tabela de wallets
- O botão WhatsApp existente já inclui todos os débitos pendentes — sem mudança no template

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/financeiro/member-wallets-table.tsx` | Remove "Pagar em dinheiro", ajusta botão de quitação |
| `src/app/actions/financeiro.ts` | Remove guard de saldo em `usarCreditoWallet` |
| `src/components/financeiro/cobranca-sheet.tsx` | Novo componente |
| `src/app/actions/cobranca.ts` | Nova server action |
| `src/app/(dashboard)/financeiro/membros/page.tsx` | Adiciona botão "Nova Cobrança" + passa members para CobrancaSheet |

---

## Critérios de aceite

- [ ] Botão "Pagar em dinheiro" não existe mais
- [ ] "Quitar via carteira" aparece sempre que há pendentes, sem restrição de saldo
- [ ] Quitar via carteira com saldo zero ou negativo funciona e deixa saldo negativo
- [ ] Botão "Nova Cobrança" no topo da página de wallets
- [ ] Form permite descrever, definir valor e selecionar membros
- [ ] "Selecionar todos" funciona
- [ ] Ao confirmar, lançamentos aparecem como débitos pendentes para cada membro selecionado
- [ ] Toast de sucesso com contagem de membros cobrados
- [ ] WhatsApp de cada membro inclui o novo débito (comportamento já existente)
