'use client'

import { useState, useMemo } from 'react'
import { Caixa, Lancamento, Member, Sessao } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { SaidaCaixaSheet } from './saida-caixa-sheet'
import { excluirSaida } from '@/app/actions/saidas-caixa'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CaixaComLancamentos extends Caixa {
  lancamentos: Lancamento[]
}

interface CaixasCardsProps {
  caixas: CaixaComLancamentos[]
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
  members: Pick<Member, 'id' | 'nome'>[]
}

export function CaixasCards({ caixas, sessoes, members }: CaixasCardsProps) {
  const router = useRouter()
  const [extratoCaixaId, setExtratoCaixaId] = useState<string | null>(null)
  const [filterDe, setFilterDe] = useState('')
  const [filterAte, setFilterAte] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const caixaExtrato = caixas.find((c) => c.id === extratoCaixaId)

  const lancamentosFiltrados = useMemo(() => {
    if (!caixaExtrato) return []
    return caixaExtrato.lancamentos.filter((l) => {
      const dateKey = l.data_pagamento ?? l.created_at.substring(0, 10)
      if (filterDe && dateKey < filterDe) return false
      if (filterAte && dateKey > filterAte) return false
      return true
    })
  }, [caixaExtrato, filterDe, filterAte])

  async function handleExcluirSaida(id: string) {
    if (!window.confirm('Excluir esta saída de caixa? Esta ação não pode ser desfeita.')) return
    setDeletingId(id)
    const result = await excluirSaida(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Saída excluída')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caixas.map((caixa) => {
          const entradas = caixa.lancamentos
            .filter((l) => l.pago && l.tipo !== 'saida_caixa' && l.member_id === null)
            .reduce((s, l) => s + l.valor, 0)
          const saidas = caixa.lancamentos
            .filter((l) => l.tipo === 'saida_caixa')
            .reduce((s, l) => s + l.valor, 0)
          const saldo = entradas - saidas
          const pendente = caixa.lancamentos
            .filter((l) => !l.pago && l.tipo !== 'saida_caixa' && l.member_id === null)
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
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(pendente)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <SaidaCaixaSheet caixa={caixa} sessoes={sessoes} members={members} />
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((l) => {
                    const isSaida = l.tipo === 'saida_caixa'
                    const dateDisplay = l.data_pagamento ?? l.created_at.substring(0, 10)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{formatDate(dateDisplay)}</TableCell>
                        <TableCell className="text-sm">{l.descricao ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs capitalize ${isSaida ? 'border-destructive/50 text-destructive' : ''}`}
                          >
                            {isSaida ? 'saída' : l.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${isSaida ? 'text-destructive' : l.pago ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {isSaida ? '— ' : '+ '}
                          {formatCurrency(l.valor)}
                        </TableCell>
                        <TableCell>
                          {isSaida ? (
                            <Badge variant="secondary" className="text-xs">Realizada</Badge>
                          ) : (
                            <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                              {l.pago ? 'Pago' : 'Pendente'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSaida && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === l.id}
                              onClick={() => handleExcluirSaida(l.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lancamentosFiltrados.length} lançamento(s)</span>
            <span>
              Entradas: {formatCurrency(lancamentosFiltrados.filter(l => l.pago && l.tipo !== 'saida_caixa' && l.member_id === null).reduce((s, l) => s + l.valor, 0))}
              {' | '}
              Saídas: {formatCurrency(lancamentosFiltrados.filter(l => l.tipo === 'saida_caixa').reduce((s, l) => s + l.valor, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
