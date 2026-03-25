'use client'

import { useState } from 'react'
import { Produto } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProdutoForm } from './produto-form'
import { Pencil, PackagePlus } from 'lucide-react'

interface ProdutosTableProps {
  produtos: Produto[]
}

export function ProdutosTable({ produtos }: ProdutosTableProps) {
  const [editProduto, setEditProduto] = useState<Produto | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PackagePlus className="h-4 w-4 mr-1" />
          Novo Produto
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((produto) => (
                <TableRow key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>{formatCurrency(produto.preco)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {produto.descricao || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditProduto(produto)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
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
            <SheetTitle>Novo Produto</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ProdutoForm onSuccess={() => setShowCreate(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editProduto} onOpenChange={(open) => !open && setEditProduto(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Produto</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {editProduto && <ProdutoForm produto={editProduto} onSuccess={() => setEditProduto(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
