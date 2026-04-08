# Members Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar completamente a tela de membros com dois modos de visualização (lista/cards), filtros por URL, formulário expandido com 3 seções e mini-timeline de progressão maçônica.

**Architecture:** Server Component (page.tsx) carrega dados e passa para MembersClient (client), que orquestra filtros via URL searchParams + filtragem local com useMemo. Dois modos de visualização (MembersTable e MembersCards) são controlados por toggle com preferência em localStorage.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Tailwind CSS v4, shadcn/ui, react-hook-form, Zod, date-fns, lucide-react

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/types.ts` | Modificar | Adicionar Grau, reescrever Member, remover MemberWithCargos |
| `src/lib/validations.ts` | Modificar | Expandir memberSchema com todos os novos campos |
| `src/app/actions/members.ts` | Modificar | Remover lógica member_cargos, adicionar novos campos |
| `src/components/members/progression-timeline.tsx` | Criar | Mini-timeline AM→CM→MM com tooltip |
| `src/components/members/member-form.tsx` | Reescrever | 3 seções: Maçônicos, Progressão, Pessoais |
| `src/components/members/members-filters.tsx` | Criar | Barra de filtros colapsável, sync com URL |
| `src/components/members/members-cards.tsx` | Criar | Grid responsivo de cards |
| `src/components/members/members-table.tsx` | Reescrever | Novas colunas com grau, cargo, progressão |
| `src/components/members/members-client.tsx` | Criar | Orquestrador: filtros, toggle, sheets |
| `src/app/(dashboard)/members/page.tsx` | Reescrever | Nova query com cargo FK, passa para MembersClient |

---

## Task 1: Atualizar tipos (types.ts)

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Substituir Member e remover MemberWithCargos**

Abrir `src/lib/types.ts` e substituir o bloco de `Member`, `Cargo` e `MemberWithCargos` pelo seguinte (manter todos os outros tipos intactos — Sessao, Produto, Lancamento, etc.):

```typescript
export type Grau = 'MI' | 'MM' | 'CM' | 'AM' | 'C'

export type Cargo = {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
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

// MemberWithCargos removido — cargo agora é FK única em members.cargo_id
```

- [ ] **Verificar que os outros tipos não quebram**

Garantir que `LancamentoWithSessao` e os outros types abaixo permanecem inalterados no arquivo.

- [ ] **Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor(types): rewrite Member with masonic fields, add Grau type, remove MemberWithCargos"
```

---

## Task 2: Atualizar validações (validations.ts)

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Substituir memberSchema**

No arquivo `src/lib/validations.ts`, substituir o `memberSchema` atual pelo seguinte (manter sessaoSchema, produtoSchema, cargoSchema e os outros intactos):

```typescript
export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_historico: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  funcao: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  cargo_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
  grau: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.enum(['MI', 'MM', 'CM', 'AM', 'C']).nullable().optional()
  ),
  numero: z.preprocess(
    v => (v === '' || v === undefined || v === null ? null : Number(v)),
    z.number().int().positive().nullable().optional()
  ),
  cidade: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  profissao: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  cim: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  turma: z.preprocess(
    v => (v === '' || v === undefined || v === null ? null : Number(v)),
    z.number().int().nullable().optional()
  ),
  fundador: z.boolean().default(false),
  ativo: z.boolean().default(true),
  data_nascimento: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  data_am: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  data_cm: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  data_mm: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  data_cm_prev: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  data_mm_prev: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  indicado_por: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  whatsapp: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().regex(/^\d{10,11}$/, 'WhatsApp deve ter 10 ou 11 dígitos').nullable().optional()
  ),
})

export type MemberFormData = z.infer<typeof memberSchema>
```

- [ ] **Commit**

```bash
git add src/lib/validations.ts
git commit -m "refactor(validations): expand memberSchema with all masonic fields"
```

---

## Task 3: Atualizar Server Actions (members.ts)

**Files:**
- Modify: `src/app/actions/members.ts`

- [ ] **Reescrever o arquivo completo**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { memberSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function getMembers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('members')
    .select('*, cargo:cargos(id, nome, cor, ordem, ativo, created_at)')
    .order('numero', { ascending: true, nullsFirst: false })
  if (error) return { error: error.message }
  return { data }
}

export async function createMember(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('members').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/members')
  return { success: true }
}

export async function updateMember(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('members').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

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

- [ ] **Commit**

```bash
git add src/app/actions/members.ts
git commit -m "refactor(actions): remove member_cargos logic, use cargo_id FK directly"
```

---

## Task 4: Criar ProgressionTimeline

**Files:**
- Create: `src/components/members/progression-timeline.tsx`

- [ ] **Criar o componente**

```typescript
'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ProgressionTimelineProps {
  data_am: string | null
  data_cm: string | null
  data_mm: string | null
  data_cm_prev: string | null
  data_mm_prev: string | null
}

type NodeState = 'confirmed' | 'predicted' | 'empty'

interface TimelineNode {
  label: string
  date: string | null
  state: NodeState
}

function formatDate(date: string | null): string {
  if (!date) return ''
  try {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return date
  }
}

function NodeDot({ state, date, label }: { state: NodeState; date: string | null; label: string }) {
  const dot = (
    <div className={`
      w-3 h-3 rounded-full flex-shrink-0 transition-colors
      ${state === 'confirmed'
        ? 'bg-primary border-2 border-primary'
        : state === 'predicted'
          ? 'bg-transparent border-2 border-primary border-dashed'
          : 'bg-transparent border-2 border-muted-foreground/30'
      }
    `} />
  )

  if (!date) return dot

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dot}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <p>{formatDate(date)}</p>
          {state === 'predicted' && (
            <p className="text-muted-foreground">(previsão)</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ProgressionTimeline({
  data_am,
  data_cm,
  data_mm,
  data_cm_prev,
  data_mm_prev,
}: ProgressionTimelineProps) {
  // If no dates at all, don't render (foundador without dates)
  const hasAnyDate = data_am || data_cm || data_mm || data_cm_prev || data_mm_prev
  if (!hasAnyDate) return null

  const nodes: TimelineNode[] = [
    {
      label: 'AM',
      date: data_am,
      state: data_am ? 'confirmed' : 'empty',
    },
    {
      label: 'CM',
      // Never overlap confirmed + predicted
      date: data_cm ?? data_cm_prev,
      state: data_cm ? 'confirmed' : data_cm_prev ? 'predicted' : 'empty',
    },
    {
      label: 'MM',
      date: data_mm ?? data_mm_prev,
      state: data_mm ? 'confirmed' : data_mm_prev ? 'predicted' : 'empty',
    },
  ]

  return (
    <div className="flex items-center gap-1">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <NodeDot state={node.state} date={node.date} label={node.label} />
            <span className="text-[10px] text-muted-foreground leading-none">{node.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="w-4 h-px bg-muted-foreground/20 mb-3" />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/members/progression-timeline.tsx
git commit -m "feat(members): add ProgressionTimeline component with AM→CM→MM nodes and tooltips"
```

---

## Task 5: Reescrever MemberForm

**Files:**
- Modify: `src/components/members/member-form.tsx`

O form atual usa `MemberWithCargos` e `cargo_ids` (array). Reescrever completamente com 3 seções e `cargo_id` único.

- [ ] **Reescrever o arquivo completo**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberSchema } from '@/lib/validations'
import { Member, Cargo, Grau } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CargoBadge } from './cargo-badge'
import { toast } from 'sonner'
import { createMember, updateMember } from '@/app/actions/members'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type MemberFormValues = z.input<typeof memberSchema>
type MemberFormOutput = z.output<typeof memberSchema>

interface MemberFormProps {
  member?: Member
  allCargos: Cargo[]
  onSuccess: () => void
}

const GRAU_OPTIONS: { value: Grau; label: string }[] = [
  { value: 'MI', label: 'MI — Mestre Instalado' },
  { value: 'MM', label: 'MM — Mestre Maçom' },
  { value: 'CM', label: 'CM — Companheiro Maçom' },
  { value: 'AM', label: 'AM — Aprendiz Maçom' },
  { value: 'C',  label: 'C  — Candidato' },
]

const TURMA_OPTIONS = [
  { value: '', label: 'Fundador' },
  { value: '1', label: '1ª Turma' },
  { value: '2', label: '2ª Turma' },
  { value: '3', label: '3ª Turma' },
  { value: '4', label: '4ª Turma' },
  { value: '5', label: '5ª Turma' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2 pb-1 border-b border-border">
      {children}
    </p>
  )
}

export function MemberForm({ member, allCargos, onSuccess }: MemberFormProps) {
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<MemberFormValues, unknown, MemberFormOutput>({
      resolver: zodResolver(memberSchema),
      defaultValues: {
        nome: member?.nome ?? '',
        nome_historico: member?.nome_historico ?? '',
        funcao: member?.funcao ?? '',
        cargo_id: member?.cargo_id ?? '',
        grau: member?.grau ?? '',
        numero: member?.numero ?? undefined,
        cidade: member?.cidade ?? '',
        profissao: member?.profissao ?? '',
        cim: member?.cim ?? '',
        turma: member?.turma ?? undefined,
        fundador: member?.fundador ?? false,
        ativo: member?.ativo ?? true,
        data_nascimento: member?.data_nascimento ?? '',
        data_am: member?.data_am ?? '',
        data_cm: member?.data_cm ?? '',
        data_mm: member?.data_mm ?? '',
        data_cm_prev: member?.data_cm_prev ?? '',
        data_mm_prev: member?.data_mm_prev ?? '',
        indicado_por: member?.indicado_por ?? '',
        whatsapp: member?.whatsapp ?? '',
      },
    })

  const ativo = watch('ativo')
  const fundador = watch('fundador')
  const grau = watch('grau')
  const data_cm = watch('data_cm')
  const data_mm = watch('data_mm')
  const showIndicadoPor = grau === 'AM' || grau === 'C'
  const showDataCmPrev = !data_cm
  const showDataMmPrev = !data_mm

  function formatWhatsapp(value: string): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(100vh-8rem)]">

      {/* ── SEÇÃO 1: DADOS MAÇÔNICOS ── */}
      <SectionTitle>Dados Maçônicos</SectionTitle>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            type="number"
            min={1}
            placeholder="Ex: 20"
            {...register('numero')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cim">CIM</Label>
          <Input id="cim" placeholder="351211" {...register('cim')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Grau</Label>
        <Select
          value={(watch('grau') as string) ?? ''}
          onValueChange={(v) => setValue('grau', v as Grau)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o grau" />
          </SelectTrigger>
          <SelectContent>
            {GRAU_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cargo</Label>
        <Select
          value={(watch('cargo_id') as string) ?? ''}
          onValueChange={(v) => setValue('cargo_id', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Sem cargo —</SelectItem>
            {allCargos.map((cargo) => (
              <SelectItem key={cargo.id} value={cargo.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cargo.cor }}
                  />
                  {cargo.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="funcao">Função Ritual</Label>
        <Input id="funcao" placeholder="Ex: Mestre de Harmonia" {...register('funcao')} />
      </div>

      <div className="space-y-2">
        <Label>Turma</Label>
        <Select
          value={watch('turma') != null ? String(watch('turma')) : ''}
          onValueChange={(v) => setValue('turma', v === '' ? null : Number(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a turma" />
          </SelectTrigger>
          <SelectContent>
            {TURMA_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="fundador">Fundador</Label>
        <Switch
          id="fundador"
          checked={!!fundador}
          onCheckedChange={(v) => setValue('fundador', v)}
        />
      </div>

      {showIndicadoPor && (
        <div className="space-y-2">
          <Label htmlFor="indicado_por">Indicado por</Label>
          <Input id="indicado_por" placeholder="Nome do padrinho" {...register('indicado_por')} />
        </div>
      )}

      {/* ── SEÇÃO 2: PROGRESSÃO ── */}
      <SectionTitle>Progressão</SectionTitle>

      <div className="space-y-2">
        <Label htmlFor="data_am">Data AM (Iniciação)</Label>
        <Input id="data_am" type="date" {...register('data_am')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_cm">Data CM (Elevação)</Label>
        <Input id="data_cm" type="date" {...register('data_cm')} />
      </div>

      {showDataCmPrev && (
        <div className="space-y-2">
          <Label htmlFor="data_cm_prev">Previsão CM</Label>
          <Input id="data_cm_prev" type="date" {...register('data_cm_prev')} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="data_mm">Data MM (Exaltação)</Label>
        <Input id="data_mm" type="date" {...register('data_mm')} />
      </div>

      {showDataMmPrev && (
        <div className="space-y-2">
          <Label htmlFor="data_mm_prev">Previsão MM</Label>
          <Input id="data_mm_prev" type="date" {...register('data_mm_prev')} />
        </div>
      )}

      {/* ── SEÇÃO 3: DADOS PESSOAIS ── */}
      <SectionTitle>Dados Pessoais</SectionTitle>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome completo" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_historico">Nome Histórico</Label>
        <Input id="nome_historico" {...register('nome_historico')} placeholder="Ex: Alberto Santos Dumont" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
        <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profissao">Profissão</Label>
        <Input id="profissao" placeholder="Ex: Engenheiro" {...register('profissao')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Input id="cidade" placeholder="Ex: Birigui" {...register('cidade')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          placeholder="(44) 99999-8888"
          value={formatWhatsapp((watch('whatsapp') as string) ?? '')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
            setValue('whatsapp', digits)
          }}
        />
        {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch
          id="ativo"
          checked={!!ativo}
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

- [ ] **Commit**

```bash
git add src/components/members/member-form.tsx
git commit -m "feat(members): rewrite MemberForm with 3 sections — masonic, progression, personal"
```

---

## Task 6: Criar MembersFilters

**Files:**
- Create: `src/components/members/members-filters.tsx`

- [ ] **Criar o componente**

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cargo, Grau } from '@/lib/types'
import { X, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export interface MembersFilterState {
  q: string
  graus: Grau[]
  turma: string
  cargo_id: string
  cidade: string
  status: 'ativo' | 'inativo' | 'todos'
}

interface MembersFiltersProps {
  filters: MembersFilterState
  allCargos: Cargo[]
  onChange: (filters: MembersFilterState) => void
}

const GRAU_OPTIONS: { value: Grau; label: string; cor: string }[] = [
  { value: 'MI', label: 'MI', cor: '#7c3aed' },
  { value: 'MM', label: 'MM', cor: '#1e3a5f' },
  { value: 'CM', label: 'CM', cor: '#16a34a' },
  { value: 'AM', label: 'AM', cor: '#ea580c' },
  { value: 'C',  label: 'C',  cor: '#6b7280' },
]

const TURMA_OPTIONS = [
  { value: '',         label: 'Todas' },
  { value: 'fundador', label: 'Fundadores' },
  { value: '1',        label: '1ª Turma' },
  { value: '2',        label: '2ª Turma' },
  { value: '3',        label: '3ª Turma' },
  { value: '4',        label: '4ª Turma' },
  { value: '5',        label: '5ª Turma' },
]

function hasActiveFilters(f: MembersFilterState): boolean {
  return (
    f.q !== '' ||
    f.graus.length > 0 ||
    f.turma !== '' ||
    f.cargo_id !== '' ||
    f.cidade !== '' ||
    f.status !== 'ativo'
  )
}

export function MembersFilters({ filters, allCargos, onChange }: MembersFiltersProps) {
  const [expanded, setExpanded] = useState(false)

  function update(partial: Partial<MembersFilterState>) {
    onChange({ ...filters, ...partial })
  }

  function toggleGrau(grau: Grau) {
    const current = filters.graus
    update({
      graus: current.includes(grau)
        ? current.filter(g => g !== grau)
        : [...current, grau],
    })
  }

  function reset() {
    onChange({ q: '', graus: [], turma: '', cargo_id: '', cidade: '', status: 'ativo' })
  }

  return (
    <div className="space-y-3">
      {/* Primary row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nome ou CIM..."
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          className="max-w-xs h-9"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={expanded ? 'border-primary text-primary' : ''}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Filtros
          {hasActiveFilters(filters) && (
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>

        {/* Status toggle */}
        <div className="flex border border-border rounded-md overflow-hidden">
          {(['ativo', 'todos', 'inativo'] as const).map((s) => (
            <button
              key={s}
              onClick={() => update({ status: s })}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                filters.status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              {s === 'ativo' ? 'Ativos' : s === 'inativo' ? 'Inativos' : 'Todos'}
            </button>
          ))}
        </div>

        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground h-9">
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="rounded-md border border-border p-4 space-y-4 bg-card">

          {/* Grau checkboxes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grau</p>
            <div className="flex flex-wrap gap-2">
              {GRAU_OPTIONS.map((opt) => {
                const active = filters.graus.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleGrau(opt.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: active ? `${opt.cor}30` : 'transparent',
                      borderColor: active ? opt.cor : 'hsl(var(--border))',
                      color: active ? opt.cor : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Turma */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Turma</p>
            <div className="flex flex-wrap gap-2">
              {TURMA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ turma: filters.turma === opt.value ? '' : opt.value })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.turma === opt.value
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cargo */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cargo</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => update({ cargo_id: '' })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.cargo_id === ''
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                Todos
              </button>
              {allCargos.map((cargo) => (
                <button
                  key={cargo.id}
                  onClick={() => update({ cargo_id: filters.cargo_id === cargo.id ? '' : cargo.id })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: filters.cargo_id === cargo.id ? `${cargo.cor}30` : 'transparent',
                    borderColor: filters.cargo_id === cargo.id ? cargo.cor : 'hsl(var(--border))',
                    color: filters.cargo_id === cargo.id ? cargo.cor : 'hsl(var(--muted-foreground))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cargo.cor }} />
                  {cargo.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade</p>
            <Input
              placeholder="Filtrar por cidade..."
              value={filters.cidade}
              onChange={(e) => update({ cidade: e.target.value })}
              className="max-w-xs h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/members/members-filters.tsx
git commit -m "feat(members): add MembersFilters component with grau/turma/cargo/cidade/status filters"
```

---

## Task 7: Criar MembersCards

**Files:**
- Create: `src/components/members/members-cards.tsx`

- [ ] **Criar o componente**

```typescript
import { Member, Grau } from '@/lib/types'
import { CargoBadge } from './cargo-badge'
import { ProgressionTimeline } from './progression-timeline'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'

const GRAU_COLORS: Record<Grau, string> = {
  MI: '#7c3aed',
  MM: '#1e3a5f',
  CM: '#16a34a',
  AM: '#ea580c',
  C:  '#6b7280',
}

interface MembersCardsProps {
  members: Member[]
  onEdit: (member: Member) => void
}

export function MembersCards({ members, onEdit }: MembersCardsProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Nenhum membro encontrado
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => {
        const borderColor = member.cargo?.cor ?? '#6b7280'
        const grauColor = member.grau ? GRAU_COLORS[member.grau] : '#6b7280'

        return (
          <div
            key={member.id}
            className="relative rounded-lg border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors"
            style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}
          >
            {/* Estrela de Fundador */}
            {member.fundador && (
              <span
                className="absolute top-3 right-3 text-base leading-none"
                style={{ color: '#d4a834' }}
                title="Fundador"
              >
                ★
              </span>
            )}

            {/* Header: Nº + badges */}
            <div className="flex items-center gap-2 flex-wrap pr-6">
              {member.numero && (
                <span className="text-xs font-mono text-muted-foreground font-medium">
                  #{member.numero}
                </span>
              )}
              {member.grau && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${grauColor}25`,
                    color: grauColor,
                    border: `1px solid ${grauColor}50`,
                  }}
                >
                  {member.grau}
                </span>
              )}
              {member.cargo && <CargoBadge cargo={member.cargo} />}
            </div>

            {/* Nome */}
            <div>
              <p className="font-semibold text-foreground leading-snug">{member.nome}</p>
              {member.nome_historico && (
                <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                  {member.nome_historico}
                </p>
              )}
            </div>

            {/* Detalhes */}
            <div className="space-y-0.5">
              {member.funcao && (
                <p className="text-xs text-muted-foreground">{member.funcao}</p>
              )}
              {(member.cidade || member.profissao) && (
                <p className="text-xs text-muted-foreground">
                  {[member.cidade, member.profissao].filter(Boolean).join(' · ')}
                </p>
              )}
              {member.cim && (
                <p className="text-xs font-mono text-muted-foreground">
                  CIM: {member.cim}
                </p>
              )}
            </div>

            {/* Progressão */}
            <ProgressionTimeline
              data_am={member.data_am}
              data_cm={member.data_cm}
              data_mm={member.data_mm}
              data_cm_prev={member.data_cm_prev}
              data_mm_prev={member.data_mm_prev}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {member.fundador
                  ? 'Fundador'
                  : member.turma != null
                    ? `Turma ${member.turma}`
                    : ''}
                {member.grau === 'C' && member.indicado_por && (
                  <span className="block text-muted-foreground/60">
                    Indicado por: {member.indicado_por}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    member.ativo ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.ativo ? 'bg-green-500' : 'bg-muted-foreground'
                    }`}
                  />
                  {member.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onEdit(member)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/members/members-cards.tsx
git commit -m "feat(members): add MembersCards grid with colored left border, progression timeline and badges"
```

---

## Task 8: Reescrever MembersTable

**Files:**
- Modify: `src/components/members/members-table.tsx`

- [ ] **Reescrever o arquivo completo**

```typescript
'use client'

import { Member, Grau, LancamentoWithSessao } from '@/lib/types'
import { CargoBadge } from './cargo-badge'
import { ProgressionTimeline } from './progression-timeline'
import { WhatsAppButton } from './whatsapp-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2 } from 'lucide-react'

const GRAU_COLORS: Record<Grau, string> = {
  MI: '#7c3aed',
  MM: '#1e3a5f',
  CM: '#16a34a',
  AM: '#ea580c',
  C:  '#6b7280',
}

interface MembersTableProps {
  members: Member[]
  lancamentos: LancamentoWithSessao[]
  onEdit: (member: Member) => void
  onDelete: (id: string) => void
}

export function MembersTable({ members, lancamentos, onEdit, onDelete }: MembersTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-md border border-border">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                Nenhum membro encontrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Nº</TableHead>
            <TableHead>Irmão</TableHead>
            <TableHead className="hidden md:table-cell w-16">Grau</TableHead>
            <TableHead className="hidden lg:table-cell">Cargo</TableHead>
            <TableHead className="hidden xl:table-cell">Função</TableHead>
            <TableHead className="hidden xl:table-cell">Cidade</TableHead>
            <TableHead className="hidden lg:table-cell w-20">CIM</TableHead>
            <TableHead className="hidden md:table-cell w-24">Progressão</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const grauColor = member.grau ? GRAU_COLORS[member.grau] : null
            const memberLancamentos = lancamentos.filter(l => l.member_id === member.id)

            return (
              <TableRow key={member.id}>
                {/* Nº */}
                <TableCell>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-mono text-sm text-muted-foreground">
                      {member.numero ?? '—'}
                    </span>
                    {member.fundador && (
                      <span
                        className="text-[9px] font-bold tracking-widest px-1 py-0.5 rounded"
                        style={{
                          backgroundColor: '#d4a83430',
                          color: '#d4a834',
                          border: '1px solid #d4a83460',
                        }}
                      >
                        FUND.
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Irmão */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground text-sm">{member.nome}</span>
                    {member.nome_historico && (
                      <span className="text-xs text-muted-foreground/60 italic">
                        {member.nome_historico}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Grau */}
                <TableCell className="hidden md:table-cell">
                  {member.grau && grauColor ? (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: `${grauColor}25`,
                        color: grauColor,
                        border: `1px solid ${grauColor}50`,
                      }}
                    >
                      {member.grau}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Cargo */}
                <TableCell className="hidden lg:table-cell">
                  {member.cargo
                    ? <CargoBadge cargo={member.cargo} />
                    : <span className="text-muted-foreground text-sm">—</span>
                  }
                </TableCell>

                {/* Função */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {member.funcao ?? '—'}
                  </span>
                </TableCell>

                {/* Cidade */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {member.cidade ?? '—'}
                  </span>
                </TableCell>

                {/* CIM */}
                <TableCell className="hidden lg:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">
                    {member.cim ?? '—'}
                  </span>
                </TableCell>

                {/* Progressão */}
                <TableCell className="hidden md:table-cell">
                  <ProgressionTimeline
                    data_am={member.data_am}
                    data_cm={member.data_cm}
                    data_mm={member.data_mm}
                    data_cm_prev={member.data_cm_prev}
                    data_mm_prev={member.data_mm_prev}
                  />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={member.ativo ? 'default' : 'secondary'} className="text-xs">
                    {member.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <WhatsAppButton
                      member={member}
                      lancamentos={memberLancamentos}
                    />
                    <Button variant="ghost" size="sm" onClick={() => onEdit(member)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(member.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/members/members-table.tsx
git commit -m "feat(members): rewrite MembersTable with grau/cargo/funcao/cidade/CIM/progression columns"
```

---

## Task 9: Criar MembersClient

**Files:**
- Create: `src/components/members/members-client.tsx`

Este é o orquestrador client-side. Gerencia: filtros via URL, toggle lista/cards, abertura de sheets de criação/edição, diálogo de exclusão.

- [ ] **Criar o componente**

```typescript
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Member, Cargo, LancamentoWithSessao, Grau } from '@/lib/types'
import { MembersFilters, MembersFilterState } from './members-filters'
import { MembersTable } from './members-table'
import { MembersCards } from './members-cards'
import { MemberForm } from './member-form'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LayoutList, LayoutGrid, UserPlus } from 'lucide-react'
import { deleteMember } from '@/app/actions/members'
import { toast } from 'sonner'

const VIEW_KEY = 'members_view'

interface MembersClientProps {
  members: Member[]
  allCargos: Cargo[]
  lancamentos: LancamentoWithSessao[]
}

function readFiltersFromParams(params: URLSearchParams): MembersFilterState {
  const grausRaw = params.get('grau')
  const graus = grausRaw
    ? (grausRaw.split(',').filter(g => ['MI','MM','CM','AM','C'].includes(g)) as Grau[])
    : []
  return {
    q: params.get('q') ?? '',
    graus,
    turma: params.get('turma') ?? '',
    cargo_id: params.get('cargo_id') ?? '',
    cidade: params.get('cidade') ?? '',
    status: (params.get('status') as MembersFilterState['status']) ?? 'ativo',
  }
}

function filtersToParams(f: MembersFilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.graus.length > 0) p.set('grau', f.graus.join(','))
  if (f.turma) p.set('turma', f.turma)
  if (f.cargo_id) p.set('cargo_id', f.cargo_id)
  if (f.cidade) p.set('cidade', f.cidade)
  if (f.status !== 'ativo') p.set('status', f.status)
  return p
}

export function MembersClient({ members, allCargos, lancamentos }: MembersClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [view, setView] = useState<'list' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VIEW_KEY) as 'list' | 'cards') ?? 'list'
    }
    return 'list'
  })

  const [filters, setFilters] = useState<MembersFilterState>(() =>
    readFiltersFromParams(searchParams)
  )

  const [editMember, setEditMember] = useState<Member | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sync filters → URL
  useEffect(() => {
    const params = filtersToParams(filters)
    const qs = params.toString()
    const current = searchParams.toString()
    if (qs !== current) {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    }
  }, [filters])

  // Persist view preference
  function changeView(v: 'list' | 'cards') {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase()
    return members.filter((m) => {
      if (q && !m.nome.toLowerCase().includes(q) && !(m.cim ?? '').toLowerCase().includes(q)) return false
      if (filters.graus.length > 0 && (!m.grau || !filters.graus.includes(m.grau))) return false
      if (filters.turma === 'fundador' && !m.fundador) return false
      if (filters.turma && filters.turma !== 'fundador' && String(m.turma) !== filters.turma) return false
      if (filters.cargo_id && m.cargo_id !== filters.cargo_id) return false
      if (filters.cidade && !(m.cidade ?? '').toLowerCase().includes(filters.cidade.toLowerCase())) return false
      if (filters.status === 'ativo' && !m.ativo) return false
      if (filters.status === 'inativo' && m.ativo) return false
      return true
    })
  }, [members, filters])

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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <MembersFilters
          filters={filters}
          allCargos={allCargos}
          onChange={setFilters}
        />

        <div className="flex items-center gap-2 ml-auto">
          {/* View toggle */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => changeView('list')}
              className={`px-2.5 py-1.5 transition-colors ${
                view === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
              title="Modo lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeView('cards')}
              className={`px-2.5 py-1.5 transition-colors ${
                view === 'cards'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
              title="Modo cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Novo
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'membro' : 'membros'}
        {filtered.length !== members.length && ` de ${members.length}`}
      </p>

      {/* View */}
      {view === 'list' ? (
        <MembersTable
          members={filtered}
          lancamentos={lancamentos}
          onEdit={setEditMember}
          onDelete={setDeletingId}
        />
      ) : (
        <MembersCards
          members={filtered}
          onEdit={setEditMember}
        />
      )}

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Novo Membro</SheetTitle>
          </SheetHeader>
          <MemberForm
            allCargos={allCargos}
            onSuccess={() => setShowCreate(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Editar Membro</SheetTitle>
          </SheetHeader>
          {editMember && (
            <MemberForm
              member={editMember}
              allCargos={allCargos}
              onSuccess={() => setEditMember(null)}
            />
          )}
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
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/members/members-client.tsx
git commit -m "feat(members): add MembersClient orchestrator with URL-synced filters, toggle and sheets"
```

---

## Task 10: Atualizar page.tsx

**Files:**
- Modify: `src/app/(dashboard)/members/page.tsx`

- [ ] **Reescrever o arquivo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { MembersClient } from '@/components/members/members-client'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Member, Cargo, LancamentoWithSessao } from '@/lib/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: cargos }, { data: lancamentosRaw }] = await Promise.all([
    supabase
      .from('members')
      .select('*, cargo:cargos(id, nome, cor, ordem, ativo, created_at)')
      .order('numero', { ascending: true, nullsFirst: false }),
    supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('lancamentos')
      .select('*, sessao:sessoes(data, descricao)')
      .eq('pago', false)
      .not('member_id', 'is', null),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Membros</h1>
      </div>
      <MembersClient
        members={(members ?? []) as Member[]}
        allCargos={(cargos ?? []) as Cargo[]}
        lancamentos={(lancamentosRaw ?? []) as LancamentoWithSessao[]}
      />
    </div>
  )
}
```

- [ ] **Verificar se o app compila**

```bash
cd /Users/pabloalexandrino/Herd/loja-maconica && bun run build 2>&1 | tail -30
```

Esperado: build sem erros de tipo. Se houver erros de tipo, corrigi-los antes de continuar.

- [ ] **Commit final**

```bash
git add src/app/(dashboard)/members/page.tsx
git commit -m "feat(members): update page with new query (cargo FK) and MembersClient"
```

---

## Checklist Final de Verificação

Após todas as tasks, verificar manualmente na UI:

- [ ] Modo lista exibe: Nº (com badge FUND.), Irmão (2 linhas), Grau (badge colorido), Cargo (badge), Função, Cidade, CIM, Progressão, Status
- [ ] Modo cards exibe: borda esquerda colorida, estrela ★ em fundadores, todos os campos, timeline
- [ ] Filtros por nome/CIM funcionam
- [ ] Filtros por grau, turma, cargo, cidade e status funcionam combinados
- [ ] URL reflete os filtros ativos (compartilhável)
- [ ] Toggle lista/cards persiste após refresh (localStorage)
- [ ] Form de criação: 3 seções visíveis, `indicado_por` aparece só para AM/C
- [ ] Form de edição: campos pré-preenchidos corretamente
- [ ] `data_cm_prev` / `data_mm_prev` somem quando data confirmada é preenchida
- [ ] ProgressionTimeline: tooltip aparece no hover com data formatada
- [ ] Fundadores sem datas: timeline não renderiza
