# Members Screen Redesign — Design Spec

**Data:** 2026-04-08
**Projeto:** Loja Maçônica "Luz da Sabedoria, Prosperidade e Fraternidade"
**Stack:** Next.js 16+ App Router · TypeScript · Supabase · Tailwind CSS v4 · shadcn/ui · react-hook-form · Zod

---

## Contexto

A tela de membros será completamente redesenhada para suportar o novo schema expandido da tabela `members`. Os campos maçônicos (grau, cargo, progressão, CIM, etc.) foram adicionados diretamente ao banco de dados. A relação many-to-many `member_cargos` fica obsoleta — cargo agora é único por membro via `cargo_id` FK direto em `members`.

---

## Schema do Banco (estado atual)

### `members`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nome | text NOT NULL | |
| nome_historico | text | Personagem histórico (ex: "Alberto Santos Dumont") |
| funcao | text | Papel ritual (ex: "Mestre de Harmonia") |
| cargo_id | uuid FK → cargos(id) | Cargo único |
| grau | text | 'MI' \| 'MM' \| 'CM' \| 'AM' \| 'C' |
| numero | integer | Número sequencial na Loja |
| cidade | text | |
| profissao | text | |
| cim | text | Registro CIM (ex: "351211") |
| turma | integer | NULL = Fundador |
| fundador | boolean | |
| ativo | boolean | |
| data_nascimento | date | |
| data_am | date | Data de Iniciação |
| data_cm | date | Data de Elevação |
| data_mm | date | Data de Exaltação |
| data_cm_prev | date | Previsão de Elevação (se data_cm NULL) |
| data_mm_prev | date | Previsão de Exaltação (se data_mm NULL) |
| indicado_por | text | Para AM e Candidatos |
| whatsapp | text | 10–11 dígitos |
| created_at | timestamptz | |

### `cargos`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nome | text | Ex: "Venerável Mestre" |
| cor | text | Hex (ex: "#f59e0b") |
| ordem | integer | Ordenação no select |
| ativo | boolean | |

### `member_cargos`
Tabela obsoleta — mantida no banco mas não utilizada pelo novo código. Pode ser dropada em migration futura.

---

## Arquitetura

### Fluxo de Dados

```
page.tsx (Server Component)
  ├─ busca members com join: cargo:cargos(id, nome, cor, ordem)
  ├─ busca cargos ativos ordenados por ordem
  ├─ lê searchParams da URL
  └─ passa tudo para <MembersClient />

MembersClient (Client Component)
  ├─ filtra membros localmente com useMemo (sem request extra)
  ├─ sincroniza filtros com URL via useSearchParams + router.replace
  └─ renderiza MembersFilters + toggle + MembersTable | MembersCards
```

### Query Base (page.tsx)
```typescript
const { data: members } = await supabase
  .from('members')
  .select('*, cargo:cargos(id, nome, cor, ordem)')
  .order('numero', { ascending: true })

const { data: cargos } = await supabase
  .from('cargos')
  .select('*')
  .eq('ativo', true)
  .order('ordem')
```

### Decisão de Filtros — Opção A (URL searchParams)
Filtros persistem na URL — link compartilhável, back/forward do browser funciona, estado sobrevive ao refresh. Filtragem ocorre no cliente com `useMemo` sobre os dados já carregados.

---

## Componentes

### Novos
| Componente | Arquivo | Responsabilidade |
|---|---|---|
| MembersClient | `src/components/members/members-client.tsx` | Orquestra filtros, toggle view, estado de sheet |
| MembersFilters | `src/components/members/members-filters.tsx` | Barra colapsável em mobile, emite mudanças para MembersClient |
| MembersCards | `src/components/members/members-cards.tsx` | Grid 1/2/3 cols com cards completos |
| ProgressionTimeline | `src/components/members/progression-timeline.tsx` | Mini-timeline AM→CM→MM com tooltip |

### Modificados
| Componente | Arquivo | Mudanças |
|---|---|---|
| MembersTable | `src/components/members/members-table.tsx` | Novas colunas: Nº, Grau, Cargo, Função, Progressão, Status |
| MemberForm | `src/components/members/member-form.tsx` | 3 seções expandidas com todos os novos campos |

### Reutilizados sem alteração
- `CargoBadge` — badge com cor dinâmica do cargo
- `WhatsappButton` — botão de cobrança

---

## Tela /members

### Toggle de Visualização
Botões no topo direito: `[≡ Lista]` `[⊞ Cards]`. Estado persistido em localStorage (preferência do usuário).

### Filtros (MembersFilters)

| Filtro | URL param | Tipo |
|---|---|---|
| Busca | `q` | text (nome ou CIM) |
| Grau | `grau` | array: MI, MM, CM, AM, C |
| Turma | `turma` | "fundador" ou "1"–"5" |
| Cargo | `cargo_id` | UUID |
| Cidade | `cidade` | text |
| Status | `status` | "ativo" \| "inativo" \| "todos" (default: "ativo") |

Filtros combinados com AND. Colapsável em mobile via accordion.

---

## Modo Lista (MembersTable)

### Colunas

| Coluna | Campo | Detalhe |
|---|---|---|
| Nº | `numero` | Badge "FUND." dourado se `fundador = true` |
| Irmão | `nome` + `nome_historico` | Duas linhas: bold + italic suave |
| Grau | `grau` | Badge com cor fixa por sigla |
| Cargo | `cargo` | Badge com cor de `cargos.cor` |
| Função | `funcao` | Texto suave; NULL = "—" |
| Cidade | `cidade` | Texto simples |
| CIM | `cim` | Fonte mono; NULL = "—" |
| Progressão | dates | Mini-timeline AM→CM→MM |
| Status | `ativo` | Badge Ativo/Inativo |

### Cores de Grau (fixas)
| Grau | Cor |
|---|---|
| MI | `#7c3aed` (roxo escuro) |
| MM | `#1e3a5f` (azul marinho) |
| CM | `#16a34a` (verde) |
| AM | `#ea580c` (laranja) |
| C | `#6b7280` (cinza) |

---

## Modo Cards (MembersCards)

Grid responsivo: 1 col mobile / 2 cols tablet / 3 cols desktop.

### Anatomia do Card
```
┌─────────────────────────────────────┐
│  [20]  [badge grau]  [badge cargo]  │  ← header
│                                     │
│  Pablo William Alexandrino Ferraz   │  ← nome (bold)
│  Alberto Santos Dumont              │  ← nome_historico (italic, suave)
│                                     │
│  Mestre de Harmonia                 │  ← funcao (se preenchido)
│  Birigui · Diretor de Tecnologia    │  ← cidade · profissao
│  CIM: 351211                        │  ← cim (mono, se preenchido)
│                                     │
│  AM ──●── CM ──○── MM               │  ← ProgressionTimeline
│  21/12/2024  04/04/2026  05/10/2026 │
│                                     │
│  Turma 2              [Ativo ●]     │  ← footer
└─────────────────────────────────────┘
```

**Detalhes visuais:**
- Borda esquerda colorida com `cargos.cor`
- Fundadores: estrela ★ dourada no canto superior direito
- Candidatos (grau = 'C'): exibe "Indicado por: ..." no footer
- Fundadores sem datas: omite ProgressionTimeline

---

## ProgressionTimeline

Mini-timeline horizontal com 3 nós: AM → CM → MM.

| Estado | Visual |
|---|---|
| Data confirmada | Ponto preenchido/colorido |
| Data prevista | Ponto com borda tracejada |
| Sem data | Ponto vazio/cinza |

- Tooltip (shadcn Tooltip) no hover com data formatada `dd/MM/yyyy`
- Fundadores sem nenhuma data: componente não renderiza
- Nunca sobrepõe data confirmada com prevista no mesmo nó

---

## Formulário de Edição (MemberForm)

Sheet lateral. 3 seções organizadas por accordion ou tabs.

### Seção 1 — Dados Maçônicos
- `numero` — input numérico
- `grau` — select: MI / MM / CM / AM / C
- `cargo_id` — select populado de cargos ativos ordenados por `ordem`
- `funcao` — input texto
- `cim` — input texto
- `turma` — select: Fundador (null) / 1 / 2 / 3 / 4 / 5
- `fundador` — toggle
- `indicado_por` — input texto (visível apenas se grau = 'AM' ou 'C')

### Seção 2 — Progressão
- `data_am` — date picker
- `data_cm` — date picker
- `data_cm_prev` — date picker (visível se `data_cm` vazio)
- `data_mm` — date picker
- `data_mm_prev` — date picker (visível se `data_mm` vazio)

### Seção 3 — Dados Pessoais
- `nome` — input texto (obrigatório)
- `nome_historico` — input texto
- `data_nascimento` — date picker
- `profissao` — input texto
- `cidade` — input texto
- `whatsapp` — input texto (10–11 dígitos)
- `ativo` — toggle

---

## Tipagem TypeScript

```typescript
// src/lib/types.ts

export type Grau = 'MI' | 'MM' | 'CM' | 'AM' | 'C'

export type Cargo = {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
}

export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  funcao: string | null
  cargo_id: string | null
  cargo: Cargo | null
  grau: Grau | null
  numero: number | null
  cidade: string | null
  profissao: string | null
  cim: string | null
  turma: number | null
  fundador: boolean
  ativo: boolean
  data_nascimento: string | null
  data_am: string | null
  data_cm: string | null
  data_mm: string | null
  data_cm_prev: string | null
  data_mm_prev: string | null
  indicado_por: string | null
  whatsapp: string | null
  created_at: string
}

// MemberWithCargos — REMOVIDO (obsoleto)
```

---

## Validação Zod (memberSchema)

```typescript
export const memberSchema = z.object({
  nome: z.string().min(2),
  nome_historico: z.string().nullable().optional(),
  funcao: z.string().nullable().optional(),
  cargo_id: z.string().uuid().nullable().optional(),
  grau: z.enum(['MI', 'MM', 'CM', 'AM', 'C']).nullable().optional(),
  numero: z.number().int().positive().nullable().optional(),
  cidade: z.string().nullable().optional(),
  profissao: z.string().nullable().optional(),
  cim: z.string().nullable().optional(),
  turma: z.number().int().nullable().optional(),
  fundador: z.boolean().default(false),
  ativo: z.boolean().default(true),
  data_nascimento: z.string().nullable().optional(),
  data_am: z.string().nullable().optional(),
  data_cm: z.string().nullable().optional(),
  data_mm: z.string().nullable().optional(),
  data_cm_prev: z.string().nullable().optional(),
  data_mm_prev: z.string().nullable().optional(),
  indicado_por: z.string().nullable().optional(),
  whatsapp: z.string().regex(/^\d{10,11}$/).nullable().optional(),
})
```

---

## Server Actions

### `getMembers()`
```typescript
supabase
  .from('members')
  .select('*, cargo:cargos(id, nome, cor, ordem)')
  .order('numero', { ascending: true })
```

### `createMember(data)` / `updateMember(id, data)`
- Remove lógica de `cargo_ids` array e `member_cargos`
- Aceita `cargo_id` string nullable diretamente
- Campos novos incluídos no insert/update

---

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/lib/types.ts` | Reescrever tipos |
| `src/lib/validations.ts` | Atualizar memberSchema |
| `src/app/actions/members.ts` | Atualizar queries e mutations |
| `src/app/(dashboard)/members/page.tsx` | Server Component com nova query |
| `src/components/members/members-client.tsx` | NOVO — orquestrador client |
| `src/components/members/members-filters.tsx` | NOVO — filtros com URL sync |
| `src/components/members/members-table.tsx` | Reescrever colunas |
| `src/components/members/members-cards.tsx` | NOVO — grid de cards |
| `src/components/members/member-form.tsx` | Expandir com 3 seções |
| `src/components/members/progression-timeline.tsx` | NOVO — mini-timeline |

---

## Decisões e Restrições

- `member_cargos` mantida no banco mas ignorada pelo novo código
- Filtros via URL searchParams (Opção A aprovada)
- Toggle Lista/Cards persiste em localStorage
- `indicado_por` visível no form apenas se grau = 'AM' ou 'C'
- `data_cm_prev` / `data_mm_prev` visíveis no form apenas se data confirmada ausente
- Fundadores sem datas omitem a ProgressionTimeline
- Tema dark — badges coloridos devem ter boa legibilidade em fundo escuro (#0f0f0f)
- Gerenciador de pacotes: bun
