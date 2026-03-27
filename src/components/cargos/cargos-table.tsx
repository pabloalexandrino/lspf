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
      </Dialog>
    </div>
  )
}
