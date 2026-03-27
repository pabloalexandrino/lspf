'use client'

import { useState, useMemo } from 'react'
import { Caixa, Lancamento } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CaixaComLancamentos extends Caixa {
  lancamentos: Lancamento[]
}

interface CaixasCardsProps {
  caixas: CaixaComLancamentos[]
}

export function CaixasCards({ caixas }: CaixasCardsProps) {
  const [extratoCaixaId, setExtratoCaixaId] = useState<string | null>(null)
  const [filterDe, setFilterDe] = useState('')
  const [filterAte, setFilterAte] = useState('')

  const caixaExtrato = caixas.find((c) => c.id === extratoCaixaId)

  const lancamentosFiltrados = useMemo(() => {
    if (!caixaExtrato) return []
    return caixaExtrato.lancamentos.filter((l) => {
      if (filterDe && l.created_at.substring(0, 10) < filterDe) return false
      if (filterAte && l.created_at.substring(0, 10) > filterAte) return false
      return true
    })
  }, [caixaExtrato, filterDe, filterAte])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caixas.map((caixa) => {
          const saldo = caixa.lancamentos
            .filter((l) => l.pago)
            .reduce((s, l) => s + l.valor, 0)
          const pendente = caixa.lancamentos
            .filter((l) => !l.pago)
            .reduce((s, l) => s + l.valor, 0)
          const isOpen = extratoCaixaId === caixa.id

          return (
            <div key={caixa.id} className="p-4 rounded-lg border border-border space-y-3">
              <div>
                <h3 className="font-semibold text-sm">{caixa.nome}</h3>
                {caixa.descricao && (
                  <p className="text-xs text-muted-foreground">{caixa.descricao}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo (pago)</p>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(saldo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(pendente)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setExtratoCaixaId(isOpen ? null : caixa.id)}
              >
                {isOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {isOpen ? 'Fechar extrato' : 'Ver extrato'}
              </Button>
            </div>
          )
        })}
      </div>

      {extratoCaixaId && caixaExtrato && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-medium text-sm">Extrato — {caixaExtrato.nome}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>De:</span>
              <input
                type="date"
                value={filterDe}
                onChange={(e) => setFilterDe(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background"
              />
              <span>Até:</span>
              <input
                type="date"
                value={filterAte}
                onChange={(e) => setFilterAte(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{formatDate(l.created_at.substring(0, 10))}</TableCell>
                      <TableCell className="text-sm">{l.descricao ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(l.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                          {l.pago ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {lancamentosFiltrados.length} lançamento(s) — Total pago: {formatCurrency(lancamentosFiltrados.filter(l => l.pago).reduce((s, l) => s + l.valor, 0))}
          </p>
        </div>
      )}
    </div>
  )
}
