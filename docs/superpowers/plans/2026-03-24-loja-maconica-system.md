# Loja Maçônica - Sistema de Gestão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Masonic lodge management system with auth, members, sessions, financial control, products, and dashboard.

**Architecture:** Next.js 16 App Router + Supabase local (PostgreSQL + Auth). Server Components for data fetching, Server Actions for mutations, Client Components for interactive UI. Route groups: `(auth)` and `(dashboard)`.

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript, Supabase SSR, Tailwind v4, shadcn/ui, React Hook Form, Zod, Lucide React, Recharts, Sonner

**Working directory:** `/Users/pabloalexandrino/Herd/loja-maconica/.claude/worktrees/kind-northcutt`

**Reference files (main repo):** `/Users/pabloalexandrino/Herd/loja-maconica/` (package.json, tsconfig, etc. - copy as base)

---

## PHASE 0: Bootstrap

### Task 1: Copy base project files to worktree

**Files to create:**
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `.gitignore`
- `.env.local`
- `public/` (copy from main)

- [ ] Copy `package.json` from `/Users/pabloalexandrino/Herd/loja-maconica/package.json` to worktree root
- [ ] Copy `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore` the same way
- [ ] Copy `.env.local` (already has SUPABASE vars: URL=http://127.0.0.1:54321, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Copy `public/` directory
- [ ] Commit: `git add . && git commit -m "chore: add base Next.js project files"`

---

### Task 2: Install dependencies

- [ ] Run: `npm install` (installs base Next.js deps from package.json)
- [ ] Run: `npm install @supabase/supabase-js @supabase/ssr`
- [ ] Run: `npm install react-hook-form @hookform/resolvers zod`
- [ ] Run: `npm install recharts sonner`
- [ ] Run: `npm install lucide-react`
- [ ] Run: `npm install class-variance-authority clsx tailwind-merge`
- [ ] Commit: `git add package.json package-lock.json && git commit -m "chore: install project dependencies"`

---

### Task 3: shadcn/ui init + install components

- [ ] Run: `npx shadcn@latest init` (choose dark theme, slate base, CSS variables)
  - When asked about Tailwind config: use CSS variables approach
  - This creates `components/ui/` and updates `globals.css`
- [ ] Run: `npx shadcn@latest add button card badge dialog dropdown-menu form input label select separator sheet skeleton table tabs toast`
- [ ] Run: `npx shadcn@latest add checkbox popover command`
- [ ] Commit: `git add . && git commit -m "chore: setup shadcn/ui with components"`

---

### Task 4: Database migration

**File:** `supabase/migrations/20260324000000_initial_schema.sql`

- [ ] Create migration file with this SQL:

```sql
-- members
create table members (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_historico text,
  data_nascimento date,
  cargo text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- sessoes
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text,
  custo_extra numeric(10,2) default 0,
  custo_extra_descricao text,
  tem_agape boolean default false,
  created_at timestamptz default now()
);

-- presenca_sessao
create table presenca_sessao (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  unique(sessao_id, member_id)
);

-- presenca_agape
create table presenca_agape (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  unique(sessao_id, member_id)
);

-- produtos
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null,
  descricao text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- consumo_produtos
create table consumo_produtos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  produto_id uuid references produtos(id) on delete cascade,
  quantidade integer not null default 1,
  created_at timestamptz default now()
);

-- lancamentos
create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  tipo text check (tipo in ('sessao', 'agape', 'produto')) not null,
  descricao text,
  valor numeric(10,2) not null,
  pago boolean default false,
  data_pagamento date,
  created_at timestamptz default now()
);

-- RLS: enable on all tables
alter table members enable row level security;
alter table sessoes enable row level security;
alter table presenca_sessao enable row level security;
alter table presenca_agape enable row level security;
alter table produtos enable row level security;
alter table consumo_produtos enable row level security;
alter table lancamentos enable row level security;

-- RLS policies: authenticated users can do everything
create policy "authenticated_all" on members for all to authenticated using (true) with check (true);
create policy "authenticated_all" on sessoes for all to authenticated using (true) with check (true);
create policy "authenticated_all" on presenca_sessao for all to authenticated using (true) with check (true);
create policy "authenticated_all" on presenca_agape for all to authenticated using (true) with check (true);
create policy "authenticated_all" on produtos for all to authenticated using (true) with check (true);
create policy "authenticated_all" on consumo_produtos for all to authenticated using (true) with check (true);
create policy "authenticated_all" on lancamentos for all to authenticated using (true) with check (true);
```

- [ ] Run migration: `npx supabase db reset` (from `/Users/pabloalexandrino/Herd/loja-maconica`)
- [ ] Verify tables exist in Supabase Studio at http://127.0.0.1:54323
- [ ] Commit: `git add supabase/ && git commit -m "feat: add database schema and RLS policies"`

---

### Task 5: TypeScript types + Supabase clients + utilities

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/utils.ts`

- [ ] Create `src/lib/types.ts` with all DB types:

```typescript
export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  data_nascimento: string | null
  cargo: string | null
  ativo: boolean
  created_at: string
}

export type Sessao = {
  id: string
  data: string
  descricao: string | null
  custo_extra: number
  custo_extra_descricao: string | null
  tem_agape: boolean
  created_at: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  descricao: string | null
  ativo: boolean
  created_at: string
}

export type PresencaSessao = {
  id: string
  sessao_id: string
  member_id: string
}

export type PresencaAgape = {
  id: string
  sessao_id: string
  member_id: string
}

export type ConsumoProduto = {
  id: string
  sessao_id: string
  member_id: string
  produto_id: string
  quantidade: number
  created_at: string
}

export type Lancamento = {
  id: string
  sessao_id: string
  member_id: string
  tipo: 'sessao' | 'agape' | 'produto'
  descricao: string | null
  valor: number
  pago: boolean
  data_pagamento: string | null
  created_at: string
}
```

- [ ] Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge) and `formatCurrency(value: number)` returning `R$ X,XX`
- [ ] Commit: `git add src/lib && git commit -m "feat: add types, supabase clients and utils"`

---

### Task 6: Zod schemas

**File:** `src/lib/validations.ts`

- [ ] Create with schemas: `memberSchema`, `sessaoSchema`, `produtoSchema`

```typescript
import { z } from 'zod'

export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  nome_historico: z.string().optional(),
  data_nascimento: z.string().optional(),
  cargo: z.string().optional(),
  ativo: z.boolean().default(true),
})

export const sessaoSchema = z.object({
  data: z.string().min(1, 'Data obrigatória'),
  descricao: z.string().optional(),
  custo_extra: z.coerce.number().min(0).default(0),
  custo_extra_descricao: z.string().optional(),
  tem_agape: z.boolean().default(false),
})

export const produtoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  preco: z.coerce.number().min(0, 'Preço inválido'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})

export type MemberFormData = z.infer<typeof memberSchema>
export type SessaoFormData = z.infer<typeof sessaoSchema>
export type ProdutoFormData = z.infer<typeof produtoSchema>
```

- [ ] Commit: `git add src/lib/validations.ts && git commit -m "feat: add Zod validation schemas"`

---

### Task 7: Global CSS + dark theme

**File:** `src/app/globals.css`

- [ ] Update `globals.css` to set dark theme with gold accent. With Tailwind v4, use `@theme inline`:

```css
@import "tailwindcss";

:root {
  --background: #0f0f0f;
  --foreground: #f0ebe0;
  --card: #1a1a1a;
  --card-foreground: #f0ebe0;
  --popover: #1a1a1a;
  --popover-foreground: #f0ebe0;
  --primary: #c9a84c;
  --primary-foreground: #0f0f0f;
  --secondary: #2a2a2a;
  --secondary-foreground: #f0ebe0;
  --muted: #2a2a2a;
  --muted-foreground: #8a8a8a;
  --accent: #c9a84c;
  --accent-foreground: #0f0f0f;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2a2a;
  --input: #2a2a2a;
  --ring: #c9a84c;
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] Update `src/app/layout.tsx` — add `Toaster` from sonner, set `lang="pt-BR"`, title "Loja Maçônica"
- [ ] Commit: `git add src/app && git commit -m "feat: dark theme with gold accent"`

---

### Task 8: Middleware (route protection)

**File:** `src/middleware.ts`

- [ ] Create `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] Commit: `git add src/middleware.ts && git commit -m "feat: auth middleware for route protection"`

---

## PHASE 1: Auth

### Task 9: Login page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/actions/auth.ts`

- [ ] Create `src/app/actions/auth.ts`:

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] Create `src/app/(auth)/login/page.tsx` — centered card with:
  - Compass/triangle icon (Lucide `Triangle` or `Compass`) in gold
  - Title "Loja Maçônica"
  - Email + password fields using shadcn Form + Input
  - Submit button with loading state using `useFormStatus`
  - Error message display
  - Uses `login` server action

- [ ] Test: run `npm run dev`, visit `http://localhost:3000` → should redirect to `/login`
- [ ] Commit: `git add src/app/(auth) src/app/actions && git commit -m "feat: login page with Supabase auth"`

---

## PHASE 2: App Shell

### Task 10: Dashboard layout + navigation

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/mobile-nav.tsx`

**Sidebar links:**
- `/` → Dashboard (LayoutDashboard icon)
- `/members` → Membros (Users icon)
- `/sessoes` → Sessões (Calendar icon)
- `/financeiro` → Financeiro (DollarSign icon)
- `/produtos` → Produtos (Package icon)

- [ ] Create `src/components/layout/sidebar.tsx`:
  - Desktop only (`hidden md:flex`)
  - Collapsible (toggle state, saves to localStorage)
  - Gold accent for active links
  - Loja logo/name at top
  - Logout button at bottom

- [ ] Create `src/components/layout/header.tsx`:
  - Page title (derived from pathname)
  - Mobile: hamburger menu using Sheet from shadcn
  - User email display

- [ ] Create `src/components/layout/mobile-nav.tsx`:
  - `fixed bottom-0` bar, `md:hidden`
  - 5 icon links with labels
  - Active state with gold color

- [ ] Create `src/app/(dashboard)/layout.tsx`:
  ```typescript
  // Server Component - verify auth, render Sidebar + Header + children
  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'
  ```
  - Flex layout: sidebar on left, main content on right
  - Include `<Toaster />` (sonner)
  - Bottom padding `pb-20 md:pb-0` for mobile nav

- [ ] Commit: `git add src/app/(dashboard) src/components/layout && git commit -m "feat: dashboard layout with sidebar and mobile nav"`

---

## PHASE 3: Members

### Task 11: Members list page

**Files:**
- Create: `src/app/(dashboard)/members/page.tsx`
- Create: `src/components/members/members-table.tsx`
- Create: `src/app/actions/members.ts`

- [ ] Create `src/app/actions/members.ts` with Server Actions:
  - `createMember(data: MemberFormData)` → insert + revalidatePath('/members')
  - `updateMember(id: string, data: MemberFormData)` → update + revalidatePath
  - `deleteMember(id: string)` → delete + revalidatePath
  - All actions: verify auth with `supabase.auth.getUser()` first

- [ ] Create `src/components/members/member-form.tsx` (Client Component):
  - Uses React Hook Form + Zod resolver
  - Fields: nome, nome_historico, data_nascimento (date input), cargo, ativo (Switch)
  - Submit calls `createMember` or `updateMember` via transition
  - Shows toast on success/error

- [ ] Create `src/components/members/members-table.tsx` (Client Component):
  - shadcn Table
  - Columns: Nome, Cargo, Status badge (Ativo/Inativo), Data Nascimento, Actions (Edit, Delete)
  - Search filter by nome (client-side)
  - Filter toggle Ativo/Inativo
  - Delete: confirmation Dialog before calling `deleteMember`
  - Edit: opens Sheet with MemberForm

- [ ] Create `src/app/(dashboard)/members/page.tsx` (Server Component):
  - Fetch all members from Supabase
  - Pass to `MembersTable`
  - "Novo Membro" button that opens Sheet with MemberForm
  - Skeleton loading via `loading.tsx`

- [ ] Create `src/app/(dashboard)/members/loading.tsx` — skeleton rows

- [ ] Test: navigate to `/members`, create a member, edit it, delete it
- [ ] Commit: `git add src/app/(dashboard)/members src/components/members src/app/actions/members.ts && git commit -m "feat: members CRUD"`

---

## PHASE 4: Products

### Task 12: Products list + CRUD

**Files:**
- Create: `src/app/(dashboard)/produtos/page.tsx`
- Create: `src/components/produtos/produto-form.tsx`
- Create: `src/components/produtos/produtos-table.tsx`
- Create: `src/app/actions/produtos.ts`

- [ ] Create `src/app/actions/produtos.ts`:
  - `createProduto(data: ProdutoFormData)` → insert
  - `updateProduto(id: string, data: ProdutoFormData)` → update (note: no delete, only inactivate)
  - revalidatePath('/produtos') in each

- [ ] Create `src/components/produtos/produto-form.tsx`:
  - Fields: nome, preco (currency input), descricao, ativo (Switch)
  - Note in form: "Produtos não são excluídos, apenas inativados"

- [ ] Create `src/components/produtos/produtos-table.tsx`:
  - Columns: Nome, Preço (formatted R$), Descrição, Status, Actions (Edit)
  - No delete button — only edit (to inactivate)

- [ ] Create `src/app/(dashboard)/produtos/page.tsx` — fetch + render table + "Novo Produto" button

- [ ] Test: create/edit products, toggle ativo
- [ ] Commit: `git add src/app/(dashboard)/produtos src/components/produtos src/app/actions/produtos.ts && git commit -m "feat: products CRUD"`

---

## PHASE 5: Sessions

### Task 13: Sessions list page

**Files:**
- Create: `src/app/(dashboard)/sessoes/page.tsx`
- Create: `src/components/sessoes/sessoes-table.tsx`
- Create: `src/components/sessoes/sessao-form.tsx`
- Create: `src/app/actions/sessoes.ts`

- [ ] Create `src/app/actions/sessoes.ts`:
  - `createSessao(data: SessaoFormData)` → insert
  - `updateSessao(id: string, data: SessaoFormData)` → update
  - `deleteSessao(id: string)` → delete (cascade handles presencas/lancamentos)

- [ ] Create `src/components/sessoes/sessao-form.tsx`:
  - Fields: data (date), descricao, tem_agape (Switch), custo_extra (currency), custo_extra_descricao
  - custo_extra_descricao only shown when custo_extra > 0

- [ ] Create `src/components/sessoes/sessoes-table.tsx`:
  - Columns: Data (formatted), Descrição, Ágape badge, Custo Extra, Actions (Abrir, Edit, Delete)
  - "Abrir" → link to `/sessoes/[id]`

- [ ] Create `src/app/(dashboard)/sessoes/page.tsx` — fetch + table + "Nova Sessão" button
- [ ] Commit: `git add src/app/(dashboard)/sessoes/page.tsx src/components/sessoes/sessao-form.tsx src/components/sessoes/sessoes-table.tsx src/app/actions/sessoes.ts && git commit -m "feat: sessions list and CRUD"`

---

### Task 14: Session panel (presence + consumption)

**Files:**
- Create: `src/app/(dashboard)/sessoes/[id]/page.tsx`
- Create: `src/components/sessoes/presenca-list.tsx`
- Create: `src/components/sessoes/agape-list.tsx`
- Create: `src/components/sessoes/consumo-form.tsx`
- Create: `src/components/sessoes/resumo-financeiro.tsx`
- Create: `src/app/actions/presencas.ts`

- [ ] Create `src/app/actions/presencas.ts`:
  - `togglePresencaSessao(sessaoId: string, memberId: string, presente: boolean)` → upsert/delete presenca_sessao
  - `togglePresencaAgape(sessaoId: string, memberId: string, presente: boolean)` → upsert/delete presenca_agape
    - Only allow if member is present in sessao
    - On remove from sessão: also remove from ágape
  - `upsertConsumoProduto(sessaoId: string, memberId: string, produtoId: string, quantidade: number)` → upsert
  - `removeConsumoProduto(id: string)` → delete

- [ ] Create `src/components/sessoes/presenca-list.tsx` (Client):
  - List of all active members with checkbox
  - Checked = present in session
  - onChange calls `togglePresencaSessao`
  - Shows member name + cargo

- [ ] Create `src/components/sessoes/agape-list.tsx` (Client):
  - Only shown when `sessao.tem_agape = true`
  - Only members already present in sessão are shown
  - Checkbox to mark as present in ágape

- [ ] Create `src/components/sessoes/consumo-form.tsx` (Client):
  - Per member: dropdown to add product + quantity input + "Adicionar" button
  - Lists current consumptions for the session with ability to remove each
  - Groups by member

- [ ] Create `src/components/sessoes/resumo-financeiro.tsx` (Client):
  - Shows calculated preview of costs before generating lancamentos:
    - Custo extra por pessoa = custo_extra / total_presentes
    - Custo ágape por pessoa = soma_consumos_agape_presentes / total_agape (if tem_agape)
    - Consumo individual por membro
  - "Gerar Lançamentos" button (calls `gerarLancamentos` server action)
  - Shows warning if lancamentos already exist for this session

- [ ] Create `src/app/(dashboard)/sessoes/[id]/page.tsx` (Server Component):
  - Fetch: sessão, all active members, presença sessão, presença ágape, consumos, produtos ativos, lancamentos
  - Tabs: "Presença" | "Ágape" | "Consumo" | "Financeiro"
  - Pass data to each component

- [ ] Commit: `git add src/app/(dashboard)/sessoes/[id] src/components/sessoes/presenca-list.tsx src/components/sessoes/agape-list.tsx src/components/sessoes/consumo-form.tsx src/components/sessoes/resumo-financeiro.tsx src/app/actions/presencas.ts && git commit -m "feat: session panel with presence and consumption tracking"`

---

### Task 15: Generate lancamentos (financial logic)

**File:** `src/app/actions/financeiro.ts`

- [ ] Create `src/app/actions/financeiro.ts` with `gerarLancamentos(sessaoId: string)`:

```
LOGIC:
1. Delete existing lancamentos for this sessao (allow regeneration)
2. Fetch: sessao, presenca_sessao (members present), presenca_agape (members at agape), consumo_produtos with produto data
3. Generate lancamentos array:
   a) CUSTO EXTRA (tipo='sessao'):
      - If custo_extra > 0 and presentes.length > 0:
      - valor_por_pessoa = custo_extra / presentes.length
      - Create one lancamento per present member
      - descricao = sessao.custo_extra_descricao || 'Custo da sessão'
   b) CONSUMO INDIVIDUAL (tipo='produto'):
      - For each consumo_produto record:
      - valor = produto.preco * quantidade
      - Create lancamento for that member
      - descricao = `${produto.nome} (${quantidade}x)`
   c) AGAPE (tipo='agape') - only if sessao.tem_agape:
      - Sum all consumo_produtos of members IN agape_presentes
      - total_agape = sum(produto.preco * quantidade) for agape members' consumos
      - valor_por_agape = total_agape / agape_presentes.length
      - Create one lancamento per agape member
      - descricao = 'Ágape'
      NOTE: Individual product consumptions of agape members are SEPARATE (tipo='produto')
      The agape cost is the SHARED food cost divided equally.
      If custo_extra_descricao suggests agape (e.g. "almoço"), use custo_extra for agape division instead.
      SIMPLER IMPLEMENTATION: agape cost = custo_extra divided among agape members (not all present)
      if (sessao.tem_agape && agape_presentes.length > 0 && sessao.custo_extra > 0):
        valor_por_agape = sessao.custo_extra / agape_presentes.length
      → In this model: custo_extra is the agape cost when tem_agape=true
      → When tem_agape=false: custo_extra divided among all presentes (sessao cost)
      → When tem_agape=true: custo_extra divided among agape presentes only
4. Insert all lancamentos in batch
5. revalidatePath(`/sessoes/${sessaoId}`)
6. revalidatePath('/financeiro')
```

- [ ] Test: create a session, add members to presence, some to agape, add product consumptions, generate lancamentos, verify in `/financeiro`
- [ ] Commit: `git add src/app/actions/financeiro.ts && git commit -m "feat: auto-generate lancamentos from session data"`

---

## PHASE 6: Financial Control

### Task 16: Lancamentos list + mark as paid

**Files:**
- Create: `src/app/(dashboard)/financeiro/page.tsx`
- Create: `src/components/financeiro/lancamentos-table.tsx`
- Create: `src/components/financeiro/member-summary.tsx`

- [ ] Add to `src/app/actions/financeiro.ts`:
  - `marcarPago(lancamentoId: string, pago: boolean)` → update pago + data_pagamento
  - `marcarPagoLote(lancamentoIds: string[])` → update multiple

- [ ] Create `src/components/financeiro/lancamentos-table.tsx` (Client):
  - Columns: Membro, Tipo (badge), Descrição, Sessão (data), Valor, Status (Pago/Pendente badge), Data Pagamento, Actions
  - Filters: por membro (select), por tipo, por status, por sessão
  - Checkbox per row for bulk selection
  - "Marcar Pago" button for selected rows
  - Individual toggle button per row

- [ ] Create `src/components/financeiro/member-summary.tsx` (Client):
  - Grouped view by member: total pago, total pendente
  - Expandable rows to see individual lancamentos
  - "Marcar Tudo Pago" button per member

- [ ] Create `src/app/(dashboard)/financeiro/page.tsx` (Server):
  - Fetch all lancamentos with member + sessao joins
  - Tabs: "Lançamentos" | "Por Membro"
  - Pass data to components

- [ ] Commit: `git add src/app/(dashboard)/financeiro src/components/financeiro && git commit -m "feat: financial control with lancamentos management"`

---

## PHASE 7: Dashboard

### Task 17: Dashboard metrics + charts

**Files:**
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/components/dashboard/metrics-cards.tsx`
- Create: `src/components/dashboard/presenca-chart.tsx`
- Create: `src/components/dashboard/top-debtors.tsx`

- [ ] Create `src/components/dashboard/metrics-cards.tsx` (Server Component):
  Queries:
  - Total membros ativos: `count(*) from members where ativo=true`
  - Sessões no mês atual: `count(*) from sessoes where date_trunc('month', data) = date_trunc('month', now())`
  - Total inadimplentes: `count(distinct member_id) from lancamentos where pago=false`
  - Valor total pendente: `sum(valor) from lancamentos where pago=false`
  - Próxima sessão: `select min(data) from sessoes where data > now()::date`

  Render as 5 shadcn Cards in responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`)

- [ ] Create `src/components/dashboard/presenca-chart.tsx` (Client - needs recharts):
  - Fetch last 6 sessions with presence count
  - BarChart from recharts with gold color (#c9a84c)
  - X axis: session date, Y axis: member count
  - Dark background chart

- [ ] Create `src/components/dashboard/top-debtors.tsx` (Server Component):
  - Query: top 5 members by total pending amount
  ```sql
  select member_id, members.nome, sum(valor) as total
  from lancamentos
  join members on members.id = lancamentos.member_id
  where pago = false
  group by member_id, members.nome
  order by total desc
  limit 5
  ```
  - Render as a ranked list with avatar/initials, name, and amount in red

- [ ] Create `src/app/(dashboard)/page.tsx` (Server Component):
  - Render MetricsCards + PresencaChart + TopDebtors
  - Use Suspense with skeleton fallbacks for chart

- [ ] Commit: `git add src/app/(dashboard)/page.tsx src/components/dashboard && git commit -m "feat: dashboard with metrics, chart and top debtors"`

---

## PHASE 8: Final polish

### Task 18: Loading skeletons + error boundaries

- [ ] Add `loading.tsx` to each main route: `sessoes/`, `financeiro/`, `produtos/`, `members/`
  - Use shadcn Skeleton component
  - Match the layout of the actual content

- [ ] Add `error.tsx` to `(dashboard)/` layout with "Client Component" + refresh button

- [ ] Verify `npm run build` passes with no TypeScript errors
- [ ] Commit: `git add . && git commit -m "feat: loading states and error boundaries"`

---

### Task 19: README

**File:** `README.md`

- [ ] Create README.md with:
  - Project description
  - Prerequisites: Node 20+, Supabase CLI
  - Setup steps:
    1. `npm install`
    2. `npx supabase start` (from parent dir `/Users/pabloalexandrino/Herd/loja-maconica`)
    3. `npx supabase db reset` (applies migrations)
    4. Create first user: via Supabase Studio at http://127.0.0.1:54323 → Authentication → Users → "Add user"
    5. `npm run dev`
  - Environment variables explanation
  - Feature overview

- [ ] Final: `npm run build` must pass
- [ ] Commit: `git add README.md && git commit -m "docs: add README with setup instructions"`

---

## Summary

| Phase | Tasks | Key deliverables |
|-------|-------|-----------------|
| 0 - Bootstrap | 1-8 | Project files, deps, DB schema, Supabase clients, auth middleware |
| 1 - Auth | 9 | Login page |
| 2 - App Shell | 10 | Sidebar, header, mobile nav |
| 3 - Members | 11 | Members CRUD |
| 4 - Products | 12 | Products CRUD |
| 5 - Sessions | 13-15 | Sessions list, panel, lancamentos generation |
| 6 - Financial | 16 | Lancamentos list, mark as paid, member summary |
| 7 - Dashboard | 17 | Metrics, chart, top debtors |
| 8 - Polish | 18-19 | Loading states, README |

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
