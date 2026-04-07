'use client'

import { useState, useMemo } from 'react'
import { Caixa, Lancamento, Member, Sessao } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SaidaCaixaSheet } from './saida-caixa-sheet'
import { EntradaCaixaSheet } from './entrada-caixa-sheet'
import { excluirSaida, excluirEntrada } from '@/app/actions/saidas-caixa'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

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

  async function handleExcluirEntrada(id: string) {
    setDeletingId(id)
    const result = await excluirEntrada(id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Entrada excluída')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caixas.map((caixa) => {
          const entradas = caixa.lancamentos
            .filter((l) => l.pago && l.tipo !== 'saida_caixa' && l.tipo !== 'compensacao')
            .reduce((s, l) => s + l.valor, 0)
          const saidas = caixa.lancamentos
            .filter((l) => l.tipo === 'saida_caixa')
            .reduce((s, l) => s + l.valor, 0)
          const saldo = entradas - saidas
          const pendente = caixa.lancamentos
            .filter((l) => !l.pago && l.tipo !== 'saida_caixa')
            .reduce((s, l) => s + l.valor, 0)
          const isOpen = extratoCaixaId === caixa.id

          return (
            <div key={caixa.id} className="rounded-xl border border-border/60 bg-card overflow-hidden hover:border-border transition-colors duration-200">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-border/40">
                <h3 className="font-semibold text-sm">{caixa.nome}</h3>
                {caixa.descricao && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{caixa.descricao}</p>
                )}
              </div>

              {/* Balance */}
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('h-5 w-5 rounded flex items-center justify-center', saldo >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                      {saldo >= 0
                        ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                        : <TrendingDown className="h-3 w-3 text-red-400" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Saldo</p>
                  </div>
                  <p className={cn('text-xl font-bold tracking-tight', saldo >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded bg-yellow-500/10 flex items-center justify-center">
                      <Minus className="h-3 w-3 text-yellow-500" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Pendente</p>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-muted-foreground">{formatCurrency(pendente)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <EntradaCaixaSheet caixa={caixa} sessoes={sessoes} members={members} />
                  <SaidaCaixaSheet caixa={caixa} sessoes={sessoes} members={members} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-border/60 hover:border-border"
                  onClick={() => setExtratoCaixaId(isOpen ? null : caixa.id)}
                >
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
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
                className="border border-border/60 rounded-md px-2 py-1 text-xs bg-secondary text-foreground"
              />
              <span>Até:</span>
              <input
                type="date"
                value={filterAte}
                onChange={(e) => setFilterAte(e.target.value)}
                className="border border-border/60 rounded-md px-2 py-1 text-xs bg-secondary text-foreground"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[11px]">Data</TableHead>
                  <TableHead className="text-[11px]">Descrição</TableHead>
                  <TableHead className="text-[11px]">Tipo</TableHead>
                  <TableHead className="text-[11px]">Valor</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((l) => {
                    const isSaida = l.tipo === 'saida_caixa'
                    const dateDisplay = l.data_pagamento ?? l.created_at.substring(0, 10)
                    return (
                      <TableRow key={l.id} className="border-border/30 hover:bg-white/[0.02]">
                        <TableCell className="text-sm">{formatDate(dateDisplay)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.descricao ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs capitalize', isSaida && 'border-destructive/30 text-destructive bg-destructive/5')}
                          >
                            {isSaida ? 'saída' : l.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn('text-sm font-medium', isSaida ? 'text-destructive' : 'text-emerald-400')}>
                          {isSaida ? '−' : '+'} {formatCurrency(l.valor)}
                        </TableCell>
                        <TableCell>
                          {isSaida ? (
                            <Badge variant="outline" className="text-xs border-destructive/30 bg-destructive/5 text-destructive">Realizada</Badge>
                          ) : l.pago || l.compensado ? (
                            <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/5 text-emerald-500">
                              {l.compensado && !l.pago ? 'Compensado' : 'Pago'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-yellow-500/30 bg-yellow-500/5 text-yellow-500">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSaida && (
                            <Button variant="ghost" size="sm" disabled={deletingId === l.id} onClick={() => handleExcluirSaida(l.id)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                          {['deposito', 'oferta', 'outro'].includes(l.tipo) && (
                            <Button variant="ghost" size="sm" disabled={deletingId === l.id} onClick={() => handleExcluirEntrada(l.id)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
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
              Entradas: {formatCurrency(lancamentosFiltrados.filter(l => l.pago && l.tipo !== 'saida_caixa' && l.tipo !== 'compensacao').reduce((s, l) => s + l.valor, 0))}
              {' · '}
              Saídas: {formatCurrency(lancamentosFiltrados.filter(l => l.tipo === 'saida_caixa').reduce((s, l) => s + l.valor, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
