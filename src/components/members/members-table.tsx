'use client'

import { useState } from 'react'
import { MemberWithCargos, Cargo, LancamentoWithSessao } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { deleteMember } from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemberForm } from './member-form'
import { WhatsAppButton } from './whatsapp-button'
import { MemberDisplay } from './member-display'
import { CargoBadge } from './cargo-badge'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface MembersTableProps {
  members: MemberWithCargos[]
  allCargos: Cargo[]
  lancamentos: LancamentoWithSessao[]
}

export function MembersTable({ members, allCargos, lancamentos }: MembersTableProps) {
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
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                  <TableCell>
                    <WhatsAppButton
                      member={member}
                      lancamentos={lancamentos.filter((l) => l.member_id === member.id && !l.pago)}
                    />
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
