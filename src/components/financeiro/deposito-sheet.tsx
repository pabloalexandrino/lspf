'use client'

import { useState } from 'react'
import { Member, Caixa, Lancamento } from '@/lib/types'
import { registrarDeposito, editarDeposito, excluirDeposito } from '@/app/actions/deposito'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DepositoSheetProps {
  member: Member
  caixas: Caixa[]
  depositos: Lancamento[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepositoSheet({ member, caixas, depositos, open, onOpenChange }: DepositoSheetProps) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [data, setData] = useState(today)
  const [descricao, setDescricao] = useState('Depósito antecipado')
  const [caixaId, setCaixaId] = useState<string | null>('none')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setEditingId(null)
    setValor('')
    setData(today)
    setDescricao('Depósito antecipado')
    setCaixaId('none')
  }

  function handleEditar(dep: Lancamento) {
    setEditingId(dep.id)
    setValor(String(dep.valor))
    setData(dep.data_pagamento ?? today)
    setDescricao(dep.descricao ?? '')
    setCaixaId(dep.caixa_id ?? 'none')
  }

  async function handleExcluir(dep: Lancamento) {
    setLoading(true)
    const result = await excluirDeposito(dep.id, member.id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Depósito excluído')
      if (editingId === dep.id) resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setLoading(true)

    if (editingId) {
      const result = await editarDeposito(
        editingId,
        member.id,
        valorNum,
        data,
        descricao || 'Depósito antecipado',
        caixaId === 'none' ? null : caixaId
      )
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Depósito atualizado')
        resetForm()
        router.refresh()
      }
    } else {
      const result = await registrarDeposito(
        member.id,
        valorNum,
        data,
        descricao || 'Depósito antecipado',
        caixaId === 'none' ? null : caixaId
      )
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Crédito de R$ ${valorNum.toFixed(2).replace('.', ',')} registrado para ${member.nome}`)
        onOpenChange(false)
        resetForm()
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Depósitos — {member.nome}</SheetTitle>
        </SheetHeader>

        {/* Histórico de depósitos */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Histórico</p>
          {depositos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum depósito registrado.</p>
          ) : (
            depositos.map((dep) => (
              <div
                key={dep.id}
                className={`flex items-center justify-between p-2 rounded border text-sm ${
                  editingId === dep.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-medium truncate">{dep.descricao ?? 'Depósito'}</p>
                  <p className="text-xs text-muted-foreground">
                    {dep.data_pagamento
                      ? new Date(dep.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs text-green-600 bg-green-500/10">
                    {formatCurrency(dep.valor)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={loading}
                    onClick={() => handleEditar(dep)}
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={loading}
                    onClick={() => handleExcluir(dep)}
                    title="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border mt-4 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            {editingId ? 'Editando depósito' : 'Novo depósito'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Membro</Label>
              <Input value={member.nome} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dep-valor">Valor (R$)</Label>
              <Input
                id="dep-valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dep-data">Data</Label>
              <Input
                id="dep-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dep-descricao">Descrição</Label>
              <Input
                id="dep-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dep-caixa">Caixa</Label>
              <select
                id="dep-caixa"
                value={caixaId ?? 'none'}
                onChange={(e) => setCaixaId(e.target.value === 'none' ? null : e.target.value)}
                className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm"
              >
                <option value="none">— Nenhum —</option>
                {caixas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={resetForm}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading
                  ? editingId ? 'Salvando...' : 'Registrando...'
                  : editingId ? 'Salvar Alterações' : 'Registrar Crédito'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
