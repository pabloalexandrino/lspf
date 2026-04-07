# Project State

**Updated:** 2026-03-27

---

## Project Reference

**What we're building:** Sistema de gestão para loja maçônica — presença em sessões, consumo, controle financeiro com múltiplos caixas, wallets de membros e mensalidades.

**Stack:** Next.js 15 (App Router), Supabase, TypeScript, Tailwind CSS, Shadcn UI

**Branch atual:** master (sem PR aberto para main)

---

## Current Position

**Status:** 3 features completas na sessão de hoje (27/03). Próxima: Saídas de Caixa (plano pronto, não executado).

---

## Recent Work

### Sessão 2026-03-27 — WhatsApp Cobrança (COMPLETA)
Todos os tasks do plano `docs/superpowers/plans/2026-03-27-whatsapp-cobranca.md` executados:

- `1ec4636` add whatsapp column to members table
- `6937200` add whatsapp field to Member type and memberSchema
- `903bb96` add WhatsAppButton component with message generation
- `bb89c56` add whatsapp field with mask to member form
- `59dfb1b` add whatsapp button column to members table
- `eabc041` add whatsapp button per member in sessao resumo financeiro
- `dcec466` add whatsapp button column to member wallets table
- `a574e52` fix: filter pending-only lancamentos before passing to WhatsAppButton

### Sessão 2026-03-27 — Cargos CRUD + Redesign Membros (COMPLETA)
Plano `docs/superpowers/plans/2026-03-27-cargos-membros-redesign.md` executado (antes do whatsapp).
Features: tabela `cargos`, tabela `member_cargos`, `CargoBadge`, `MemberDisplay`, página /cargos.

### Sessão 2026-03-26 — Multi-caixas / Wallets / Mensalidades (COMPLETA)
Plano `docs/superpowers/plans/2026-03-26-multi-caixas-wallets.md` — 11 tasks completos.

---

## Pending Todos

- [ ] Executar plano Saídas de Caixa (`docs/superpowers/plans/2026-03-27-saidas-caixa.md`)
- [ ] Criar PR de master → main com todas as features completas

---

## Blockers / Concerns

Nenhum blocker ativo.

---

## Session Continuity

Last session: 2026-03-27
Stopped at: WhatsApp Cobrança completa; próximo é Saídas de Caixa
