'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sessao } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { deleteSessao } from '@/app/actions/sessoes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SessaoForm } from './sessao-form'
import { Pencil, Trash2, ExternalLink, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

interface SessoesTableProps {
  sessoes: Sessao[]
}

export function SessoesTable({ sessoes }: SessoesTableProps) {
  const [editSessao, setEditSessao] = useState<Sessao | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  async function handleDelete(id: string) {
    const result = await deleteSessao(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Sessão excluída')
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <CalendarPlus className="h-4 w-4 mr-1" />
          Nova Sessão
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead>Ágape</TableHead>
              <TableHead className="hidden sm:table-cell">Custo Extra</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma sessão cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sessoes.map((sessao) => (
                <TableRow key={sessao.id}>
                  <TableCell className="font-medium">{formatDate(sessao.data)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {sessao.descricao || '—'}
                  </TableCell>
                  <TableCell>
                    {sessao.tem_agape ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Ágape</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {sessao.custo_extra > 0 ? formatCurrency(sessao.custo_extra) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/sessoes/${sessao.id}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-[min(var(--radius-md),12px)] hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setEditSessao(sessao)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingId(sessao.id)}>
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

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader><SheetTitle>Nova Sessão</SheetTitle></SheetHeader>
          <div className="mt-6">
            <SessaoForm onSuccess={() => setShowCreate(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editSessao} onOpenChange={(open) => !open && setEditSessao(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Editar Sessão</SheetTitle></SheetHeader>
          <div className="mt-6">
            {editSessao && <SessaoForm sessao={editSessao} onSuccess={() => setEditSessao(null)} />}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Excluir a sessão irá remover também todas as presenças, consumos e lançamentos relacionados.
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
