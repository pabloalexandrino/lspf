# Cargos CRUD + Redesign de Membros — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar CRUD de cargos maçônicos com cores e associação many-to-many a membros, substituindo o campo de texto livre `cargo` por badges coloridas estilo Discord na listagem de membros.

**Architecture:** Nova tabela `cargos` + tabela associativa `member_cargos` (many-to-many). O campo `cargo text` na tabela `members` é mantido no banco por compatibilidade mas removido do formulário. A listagem de membros recebe componentes `MemberDisplay` e `CargoBadge` reutilizáveis. A página de cargos segue o padrão existente (Server Component → Client Table → Sheet lateral).

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), React Hook Form + Zod, shadcn/ui, Tailwind CSS, Lucide React

---

## File Map

**Criar:**
- `supabase/migrations/20260327000001_cargos.sql`
- `src/app/actions/cargos.ts`
- `src/components/members/member-display.tsx`
- `src/components/members/cargo-badge.tsx`
- `src/components/cargos/cargo-form.tsx`
- `src/components/cargos/cargos-table.tsx`
- `src/app/(dashboard)/cargos/page.tsx`
- `src/app/(dashboard)/cargos/loading.tsx`

**Modificar:**
- `src/lib/types.ts` — adicionar `Cargo`, `MemberWithCargos`
- `src/lib/validations.ts` — adicionar `cargoSchema`, atualizar `memberSchema`
- `src/app/actions/members.ts` — extrair e salvar `cargo_ids`
- `src/components/layout/sidebar.tsx` — adicionar item Cargos
- `src/app/(dashboard)/members/page.tsx` — fetch com join de cargos
- `src/components/members/members-table.tsx` — redesign com novos componentes
- `src/components/members/member-form.tsx` — trocar campo `cargo` por seção de cargos

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260327000001_cargos.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260327000001_cargos.sql

CREATE TABLE cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6b7280',
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO cargos (nome, cor, ordem) VALUES
  ('Venerável Mestre',     '#f59e0b', 1),
  ('1º Vigilante',         '#3b82f6', 2),
  ('2º Vigilante',         '#8b5cf6', 3),
  ('Orador',               '#10b981', 4),
  ('Secretário',           '#06b6d4', 5),
  ('Tesoureiro',           '#f97316', 6),
  ('Chanceler',            '#ec4899', 7),
  ('Mestre de Cerimônias', '#84cc16', 8),
  ('Hospitaleiro',         '#14b8a6', 9),
  ('Diácono',              '#a78bfa', 10),
  ('Guarda do Templo',     '#64748b', 11),
  ('Mestre',               '#eab308', 12),
  ('Companheiro',          '#22c55e', 13),
  ('Aprendiz',             '#94a3b8', 14);

CREATE TABLE member_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES cargos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, cargo_id)
);

-- Migrar cargo do Henrique se existir
INSERT INTO member_cargos (member_id, cargo_id)
SELECT m.id, c.id
FROM members m, cargos c
WHERE m.nome ILIKE '%Henrique de Holanda%'
  AND c.nome = 'Venerável Mestre'
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can do everything on cargos"
  ON cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE member_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can do everything on member_cargos"
  ON member_cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Aplicar a migration**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npx supabase db push
```

Expected: `Applying migration 20260327000001_cargos.sql... done`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000001_cargos.sql
git commit -m "feat: add cargos and member_cargos tables with seed data"
```

---

### Task 2: Types e Schemas de Validação

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Adicionar tipos em `src/lib/types.ts`**

Adicionar ao final do arquivo, após o tipo `Mensalidade`:

```ts
export type Cargo = {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
}

export type MemberWithCargos = Member & {
  member_cargos: Array<{
    id: string
    cargo_id: string
    cargos: Cargo
  }>
}
```

- [ ] **Step 2: Atualizar `src/lib/validations.ts`**

Substituir o conteúdo completo por:

```ts
import { z } from 'zod'

export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_historico: z.string().optional().or(z.literal('')),
  data_nascimento: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  ativo: z.boolean().default(true),
  cargo_ids: z.array(z.string()).default([]),
})

export const sessaoSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  descricao: z.string().optional().or(z.literal('')),
  custo_sessao: z.coerce.number().min(0).default(0),
  custo_sessao_descricao: z.string().optional().or(z.literal('')),
  custo_agape: z.coerce.number().min(0).default(0),
  custo_agape_descricao: z.string().optional().or(z.literal('')),
  tem_agape: z.boolean().default(false),
})

export const produtoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  preco: z.coerce.number().min(0.01, 'Preço deve ser maior que zero'),
  descricao: z.string().optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

export const cargoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#6b7280'),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
})

export type MemberFormData = z.infer<typeof memberSchema>
export type SessaoFormData = z.infer<typeof sessaoSchema>
export type ProdutoFormData = z.infer<typeof produtoSchema>
export type CargoFormData = z.infer<typeof cargoSchema>
```

- [ ] **Step 3: Verificar que TypeScript compila sem erro**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npx tsc --noEmit 2>&1 | head -30
```

Expected: sem erros relacionados a `types.ts` ou `validations.ts` (pode haver erros em outros arquivos que serão resolvidos nas próximas tasks).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/validations.ts
git commit -m "feat: add Cargo/MemberWithCargos types and cargoSchema validation"
```

---

### Task 3: Server Actions para Cargos

**Files:**
- Create: `src/app/actions/cargos.ts`

- [ ] **Step 1: Criar o arquivo de actions**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { cargoSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function getCargos() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cargos')
    .select('*')
    .order('ordem')
  return data ?? []
}

export async function createCargo(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = cargoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('cargos').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  return { success: true }
}

export async function updateCargo(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = cargoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('cargos').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  revalidatePath('/members')
  return { success: true }
}

export async function toggleCargo(id: string, ativo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('cargos').update({ ativo }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  revalidatePath('/members')
  return { success: true }
}

export async function deleteCargo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { count } = await supabase
    .from('member_cargos')
    .select('*', { count: 'exact', head: true })
    .eq('cargo_id', id)

  if (count && count > 0) {
    return { error: 'Cargo possui membros associados. Inative-o em vez de excluir.' }
  }

  const { error } = await supabase.from('cargos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/cargos.ts
git commit -m "feat: add server actions for cargos CRUD"
```

---

### Task 4: Atualizar Server Actions de Membros

**Files:**
- Modify: `src/app/actions/members.ts`

- [ ] **Step 1: Substituir o conteúdo de `src/app/actions/members.ts`**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { memberSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createMember(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { cargo_ids, ...memberData } = parsed.data

  const { data: newMember, error } = await supabase
    .from('members')
    .insert(memberData)
    .select('id')
    .single()
  if (error) return { error: error.message }

  if (cargo_ids.length > 0) {
    await supabase.from('member_cargos').insert(
      cargo_ids.map(cargo_id => ({ member_id: newMember.id, cargo_id }))
    )
  }

  revalidatePath('/members')
  return { success: true }
}

export async function updateMember(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { cargo_ids, ...memberData } = parsed.data

  const { error } = await supabase.from('members').update(memberData).eq('id', id)
  if (error) return { error: error.message }

  await supabase.from('member_cargos').delete().eq('member_id', id)

  if (cargo_ids.length > 0) {
    await supabase.from('member_cargos').insert(
      cargo_ids.map(cargo_id => ({ member_id: id, cargo_id }))
    )
  }

  revalidatePath('/members')
  return { success: true }
}

export async function deleteMember(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/members')
  return { success: true }
}
```

Nota: `member_cargos` tem `ON DELETE CASCADE` em `member_id`, então ao deletar o membro as associações são removidas automaticamente.

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/members.ts
git commit -m "feat: update member actions to handle cargo_ids many-to-many"
```

---

### Task 5: Componentes Compartilhados — MemberDisplay e CargoBadge

**Files:**
- Create: `src/components/members/member-display.tsx`
- Create: `src/components/members/cargo-badge.tsx`

- [ ] **Step 1: Criar `src/components/members/member-display.tsx`**

```tsx
import { Member } from '@/lib/types'

interface MemberDisplayProps {
  member: Pick<Member, 'nome' | 'nome_historico'>
}

export function MemberDisplay({ member }: MemberDisplayProps) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{member.nome}</span>
      {member.nome_historico && (
        <span className="text-xs text-muted-foreground/70 font-normal">
          {member.nome_historico}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/components/members/cargo-badge.tsx`**

```tsx
import { Cargo } from '@/lib/types'

interface CargoBadgeProps {
  cargo: Cargo
}

export function CargoBadge({ cargo }: CargoBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${cargo.cor}20`,
        color: cargo.cor,
        border: `1px solid ${cargo.cor}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cargo.cor }}
      />
      {cargo.nome}
    </span>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/members/member-display.tsx src/components/members/cargo-badge.tsx
git commit -m "feat: add MemberDisplay and CargoBadge reusable components"
```

---

### Task 6: Componente de Formulário de Cargo

**Files:**
- Create: `src/components/cargos/cargo-form.tsx`

- [ ] **Step 1: Criar `src/components/cargos/cargo-form.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cargoSchema } from '@/lib/validations'
import { Cargo } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createCargo, updateCargo } from '@/app/actions/cargos'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type CargoFormValues = z.input<typeof cargoSchema>
type CargoFormOutput = z.output<typeof cargoSchema>

interface CargoFormProps {
  cargo?: Cargo
  onSuccess: () => void
}

export function CargoForm({ cargo, onSuccess }: CargoFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<CargoFormValues, unknown, CargoFormOutput>({
      resolver: zodResolver(cargoSchema),
      defaultValues: {
        nome: cargo?.nome ?? '',
        cor: cargo?.cor ?? '#6b7280',
        ordem: cargo?.ordem ?? 0,
        ativo: cargo?.ativo ?? true,
      },
    })

  const cor = watch('cor')
  const ativo = watch('ativo')

  async function onSubmit(data: CargoFormOutput) {
    const result = cargo
      ? await updateCargo(cargo.id, data)
      : await createCargo(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(cargo ? 'Cargo atualizado!' : 'Cargo criado!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Ex: Venerável Mestre" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cor">Cor</Label>
        <div className="flex items-center gap-3">
          <input
            id="cor"
            type="color"
            {...register('cor')}
            className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent p-1"
          />
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
            style={{
              backgroundColor: `${cor}20`,
              color: cor,
              borderColor: `${cor}40`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cor }}
            />
            Preview
          </span>
        </div>
        {errors.cor && <p className="text-xs text-destructive">{errors.cor.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ordem">Ordem de exibição</Label>
        <Input
          id="ordem"
          type="number"
          min={0}
          {...register('ordem')}
          placeholder="0"
        />
        {errors.ordem && <p className="text-xs text-destructive">{errors.ordem.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch
          id="ativo"
          checked={ativo}
          onCheckedChange={(v) => setValue('ativo', v)}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : cargo ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cargos/cargo-form.tsx
git commit -m "feat: add CargoForm component with color picker preview"
```

---

### Task 7: Componente de Tabela de Cargos

**Files:**
- Create: `src/components/cargos/cargos-table.tsx`

- [ ] **Step 1: Criar `src/components/cargos/cargos-table.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Cargo } from '@/lib/types'
import { deleteCargo, toggleCargo } from '@/app/actions/cargos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CargoForm } from './cargo-form'
import { CargoBadge } from '@/components/members/cargo-badge'
import { Pencil, Trash2, Plus, PowerOff, Power } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CargosTableProps {
  cargos: Cargo[]
}

export function CargosTable({ cargos }: CargosTableProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editCargo, setEditCargo] = useState<Cargo | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleToggle(cargo: Cargo) {
    const result = await toggleCargo(cargo.id, !cargo.ativo)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(cargo.ativo ? 'Cargo inativado' : 'Cargo ativado')
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteCargo(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Cargo excluído')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Cargo
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo</TableHead>
              <TableHead className="hidden sm:table-cell w-20 text-center">Ordem</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum cargo cadastrado
                </TableCell>
              </TableRow>
            ) : (
              cargos.map((cargo) => (
                <TableRow key={cargo.id}>
                  <TableCell>
                    <CargoBadge cargo={cargo} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground">
                    {cargo.ordem}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cargo.ativo ? 'default' : 'secondary'}>
                      {cargo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={cargo.ativo ? 'Inativar' : 'Ativar'}
                        onClick={() => handleToggle(cargo)}
                      >
                        {cargo.ativo
                          ? <PowerOff className="h-3 w-3 text-muted-foreground" />
                          : <Power className="h-3 w-3 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditCargo(cargo)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingId(cargo.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Novo Cargo</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <CargoForm onSuccess={() => setShowCreate(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editCargo} onOpenChange={(open) => !open && setEditCargo(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Cargo</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editCargo && <CargoForm cargo={editCargo} onSuccess={() => setEditCargo(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Cargos com membros associados não podem ser excluídos — inative-os em vez disso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cargos/cargos-table.tsx
git commit -m "feat: add CargosTable component with toggle/edit/delete"
```

---

### Task 8: Página de Cargos e Sidebar

**Files:**
- Create: `src/app/(dashboard)/cargos/page.tsx`
- Create: `src/app/(dashboard)/cargos/loading.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Criar `src/app/(dashboard)/cargos/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { CargosTable } from '@/components/cargos/cargos-table'
import { Shield } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function CargosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cargos } = await supabase
    .from('cargos')
    .select('*')
    .order('ordem')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Cargos</h1>
      </div>
      <CargosTable cargos={cargos ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/app/(dashboard)/cargos/loading.tsx`**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Shield } from 'lucide-react'

export default function CargosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Cargos</h1>
      </div>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-md border border-border">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-40 rounded-full" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar "Cargos" ao sidebar em `src/components/layout/sidebar.tsx`**

Localizar a linha:
```ts
const topNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]
```

Substituir por:
```ts
const topNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/members', icon: Users, label: 'Membros' },
  { href: '/cargos', icon: Shield, label: 'Cargos' },
  { href: '/sessoes', icon: Calendar, label: 'Sessões' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
]
```

E adicionar `Shield` nos imports de `lucide-react`:
```ts
import {
  LayoutDashboard, Users, Calendar, DollarSign, Package,
  ChevronLeft, ChevronRight, Triangle, ChevronDown, Shield,
} from 'lucide-react'
```

- [ ] **Step 4: Verificar que a página compila**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npx tsc --noEmit 2>&1 | grep -E "cargos|sidebar" | head -20
```

Expected: sem erros relacionados a esses arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/cargos/ src/components/layout/sidebar.tsx
git commit -m "feat: add cargos page and sidebar navigation item"
```

---

### Task 9: Atualizar Página de Membros (fetch com cargos)

**Files:**
- Modify: `src/app/(dashboard)/members/page.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/app/(dashboard)/members/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/members/members-table'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MemberWithCargos, Cargo } from '@/lib/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: cargos }] = await Promise.all([
    supabase
      .from('members')
      .select('*, member_cargos(id, cargo_id, cargos(*))')
      .order('nome'),
    supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('ordem'),
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
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/members/page.tsx
git commit -m "feat: fetch members with cargos join and pass allCargos to table"
```

---

### Task 10: Redesign da Tabela de Membros

**Files:**
- Modify: `src/components/members/members-table.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de `src/components/members/members-table.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { MemberWithCargos, Cargo } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { deleteMember } from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemberForm } from './member-form'
import { MemberDisplay } from './member-display'
import { CargoBadge } from './cargo-badge'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface MembersTableProps {
  members: MemberWithCargos[]
  allCargos: Cargo[]
}

export function MembersTable({ members, allCargos }: MembersTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'active' | 'inactive'>('all')
  const [editMember, setEditMember] = useState<MemberWithCargos | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = members.filter((m) => {
    const matchSearch = m.nome.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filterAtivo === 'all' ||
      (filterAtivo === 'active' && m.ativo) ||
      (filterAtivo === 'inactive' && !m.ativo)
    return matchSearch && matchFilter
  })

  async function handleDelete(id: string) {
    const result = await deleteMember(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Membro excluído')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button
              key={f}
              variant={filterAtivo === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterAtivo(f)}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </Button>
          ))}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Cargos</TableHead>
              <TableHead className="hidden sm:table-cell">Nascimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum membro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <MemberDisplay member={member} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {member.member_cargos.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {member.member_cargos.slice(0, 2).map((mc) => (
                          <CargoBadge key={mc.cargo_id} cargo={mc.cargos} />
                        ))}
                        {member.member_cargos.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            +{member.member_cargos.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {member.data_nascimento ? formatDate(member.data_nascimento) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.ativo ? 'default' : 'secondary'}>
                      {member.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditMember(member)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingId(member.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Novo Membro</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <MemberForm allCargos={allCargos} onSuccess={() => setShowCreate(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Membro</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editMember && (
              <MemberForm
                member={editMember}
                allCargos={allCargos}
                onSuccess={() => setEditMember(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O membro será excluído permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/members/members-table.tsx
git commit -m "feat: redesign members table with MemberDisplay and CargoBadge"
```

---

### Task 11: Atualizar Formulário de Membro

**Files:**
- Modify: `src/components/members/member-form.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de `src/components/members/member-form.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberSchema } from '@/lib/validations'
import { MemberWithCargos, Cargo } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CargoBadge } from './cargo-badge'
import { toast } from 'sonner'
import { createMember, updateMember } from '@/app/actions/members'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type MemberFormValues = z.input<typeof memberSchema>
type MemberFormOutput = z.output<typeof memberSchema>

interface MemberFormProps {
  member?: MemberWithCargos
  allCargos: Cargo[]
  onSuccess: () => void
}

export function MemberForm({ member, allCargos, onSuccess }: MemberFormProps) {
  const router = useRouter()

  const currentCargoIds = member?.member_cargos.map(mc => mc.cargo_id) ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<MemberFormValues, unknown, MemberFormOutput>({
      resolver: zodResolver(memberSchema),
      defaultValues: {
        nome: member?.nome ?? '',
        nome_historico: member?.nome_historico ?? '',
        data_nascimento: member?.data_nascimento ?? '',
        ativo: member?.ativo ?? true,
        cargo_ids: currentCargoIds,
      },
    })

  const ativo = watch('ativo')
  const cargoIds = watch('cargo_ids') as string[]

  function toggleCargo(cargoId: string) {
    const current = cargoIds ?? []
    if (current.includes(cargoId)) {
      setValue('cargo_ids', current.filter(id => id !== cargoId))
    } else {
      setValue('cargo_ids', [...current, cargoId])
    }
  }

  async function onSubmit(data: MemberFormOutput) {
    const result = member
      ? await updateMember(member.id, data)
      : await createMember(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(member ? 'Membro atualizado!' : 'Membro criado!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome completo" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_historico">Nome Histórico</Label>
        <Input id="nome_historico" {...register('nome_historico')} placeholder="Nome na loja" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
        <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
      </div>

      <div className="space-y-3">
        <Label>Cargos</Label>
        {allCargos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum cargo ativo cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {allCargos.map((cargo) => {
              const isSelected = (cargoIds ?? []).includes(cargo.id)
              return (
                <button
                  key={cargo.id}
                  type="button"
                  onClick={() => toggleCargo(cargo.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <CargoBadge cargo={cargo} />
                  {isSelected && (
                    <span className="text-xs text-primary font-medium">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch
          id="ativo"
          checked={ativo}
          onCheckedChange={(v) => setValue('ativo', v)}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : member ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verificar TypeScript sem erros**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 erros.

- [ ] **Step 3: Build de verificação**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` ou similar sem erros críticos.

- [ ] **Step 4: Commit final**

```bash
git add src/components/members/member-form.tsx
git commit -m "feat: replace cargo text field with cargos multi-select in member form"
```

---

## Self-Review

### Spec Coverage

| Requisito | Task |
|-----------|------|
| Tabela `cargos` com cor, ordem, ativo | Task 1 |
| Seed com 14 cargos maçônicos | Task 1 |
| Tabela `member_cargos` many-to-many | Task 1 |
| Migrar cargo do Henrique | Task 1 |
| RLS policies | Task 1 |
| Listagem de cargos (tabela com badge de cor, ordem, status) | Task 7 + 8 |
| Botão "Novo Cargo" | Task 7 |
| Ação de editar | Task 7 |
| Inativar (não deletar se tiver membros) | Task 3 + 7 |
| Formulário: nome, cor (input color + preview), ordem, toggle ativo | Task 6 |
| "Cargos" no menu lateral abaixo de "Membros" | Task 8 |
| Componente `MemberDisplay` (nome + nome_histórico) | Task 5 |
| Componente `CargoBadge` (estilo Discord, cor dinâmica) | Task 5 |
| Coluna "Nome" na tabela usa `MemberDisplay` | Task 10 |
| Coluna "Cargos" usa `CargoBadge` com overflow "+N" | Task 10 |
| Remover coluna "Cargo" (texto) | Task 10 |
| Remover campo texto "cargo" do formulário de membro | Task 11 |
| Seção "Cargos" no formulário de membro (checkboxes) | Task 11 |

Todos os requisitos cobertos.

### Placeholder Scan

Sem TBDs, TODOs, "similar to Task N", ou passos sem código.

### Type Consistency

- `MemberWithCargos` definido em Task 2, usado em Tasks 9, 10, 11
- `Cargo` definido em Task 2, usado em Tasks 5, 6, 7, 8, 10, 11
- `cargoSchema` / `CargoFormData` definidos em Task 2, usado em Task 6
- `memberSchema` com `cargo_ids: string[]` definido em Task 2, usado em Tasks 4 e 11
- `getCargos`, `createCargo`, `updateCargo`, `toggleCargo`, `deleteCargo` definidos em Task 3, usados em Tasks 6 e 7
- `createMember`, `updateMember` atualizados em Task 4, usados em Task 11
- `MemberDisplay` criado em Task 5, usado em Task 10
- `CargoBadge` criado em Task 5, usado em Tasks 7, 11
