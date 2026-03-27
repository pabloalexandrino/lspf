'use client'

import { useState, useMemo } from 'react'
import { Mensalidade, Member } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  gerarMensalidades,
  marcarMensalidadePaga,
  marcarMensalidadesPagasLote,
  desfazerMensalidadePaga,
} from '@/app/actions/mensalidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MensalidadeEnriched = Mensalidade & { member?: Member }

interface MensalidadesTableProps {
  mensalidades: MensalidadeEnriched[]
  mesAtual: string  // "2026-03"
}

export function MensalidadesTable({ mensalidades, mesAtual }: MensalidadesTableProps) {
  const router = useRouter()
  const [mes, setMes] = useState(mesAtual)
  const [valorGerar, setValorGerar] = useState('100')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Filter mensalidades for selected month
  const filtered = useMemo(() => {
    return mensalidades.filter((m) => m.mes_referencia.startsWith(mes))
  }, [mensalidades, mes])

  const pendentes = filtered.filter((m) => !m.pago)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const pendentesIds = pendentes.map((m) => m.id)
    if (selected.size === pendentesIds.length && pendentesIds.every((id) => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendentesIds))
    }
  }

  async function handleGerar() {
    const valorNum = parseFloat(valorGerar.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error('Valor inválido')
      return
    }
    setLoading(true)
    const mesReferencia = `${mes}-01`
    const result = await gerarMensalidades(mesReferencia, valorNum)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Mensalidades geradas para ${result.count} membros`)
      router.refresh()
    }
    setLoading(false)
  }

  async function handlePagarLote() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarMensalidadesPagasLote(Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.count} mensalidade(s) marcada(s) como paga(s)`)
      setSelected(new Set())
      router.refresh()
    }
    setLoading(false)
  }

  async function handleTogglePago(mensalidade: MensalidadeEnriched) {
    if (mensalidade.pago) {
      const result = await desfazerMensalidadePaga(mensalidade.id)
      if (result?.error) toast.error(result.error)
      else router.refresh()
    } else {
      const result = await marcarMensalidadePaga(mensalidade.id)
      if (result?.error) toast.error(result.error)
      else router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Mês de referência</label>
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valor padrão (R$)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={valorGerar}
            onChange={(e) => setValorGerar(e.target.value)}
            className="w-32"
          />
        </div>

        <Button variant="outline" onClick={handleGerar} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Gerar mensalidades
        </Button>

        {selected.size > 0 && (
          <Button onClick={handlePagarLote} disabled={loading}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar {selected.size} como pago
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{filtered.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Pagos</p>
          <p className="text-lg font-bold text-green-500">{filtered.filter((m) => m.pago).length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-lg font-bold text-destructive">{pendentes.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={pendentes.length > 0 && pendentes.every((m) => selected.has(m.id))}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Membro</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Data Pagamento</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma mensalidade para {mes}. Clique em &quot;Gerar mensalidades&quot; para criar.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className={m.pago ? 'opacity-60' : ''}>
                  <TableCell>
                    {!m.pago && (
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggleSelect(m.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.member?.nome ?? '—'}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(m.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={m.pago ? 'default' : 'secondary'} className="text-xs">
                      {m.pago ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {m.data_pagamento ? formatDate(m.data_pagamento) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleTogglePago(m)}
                    >
                      {m.pago ? 'Desfazer' : 'Pagar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
