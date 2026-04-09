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
              type="button"
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
              type="button"
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
