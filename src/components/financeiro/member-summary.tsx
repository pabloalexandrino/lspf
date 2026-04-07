'use client'

import { useState } from 'react'
import { Lancamento, Member } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { marcarPagoLote } from '@/app/actions/financeiro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type LancamentoEnriched = Lancamento & { member?: Member }

interface MemberSummaryProps {
  lancamentos: LancamentoEnriched[]
  members: Member[]
}

export function MemberSummary({ lancamentos, members }: MemberSummaryProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)

  const byMember = members.map((member) => {
    const memberLancamentos = lancamentos.filter((l) => l.member_id === member.id)
    const totalPago = memberLancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const totalPendente = memberLancamentos.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    return { member, lancamentos: memberLancamentos, totalPago, totalPendente }
  }).filter((g) => g.lancamentos.length > 0)

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMarcarTudoPago(memberId: string, ids: string[]) {
    setLoading(memberId)
    const result = await marcarPagoLote(ids, true)
    if (result?.error) toast.error(result.error)
    else toast.success('Todos os lançamentos marcados como pagos')
    setLoading(null)
  }

  if (byMember.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum lançamento encontrado.</p>
  }

  return (
    <div className="space-y-2">
      {byMember.map(({ member, lancamentos: mLancamentos, totalPago, totalPendente }) => {
        const isExpanded = expanded.has(member.id)
        const pendingIds = mLancamentos.filter((l) => !l.pago && !l.compensado).map((l) => l.id)

        return (
          <div key={member.id} className="rounded-xl border border-border/60 bg-card overflow-hidden hover:border-border transition-colors duration-200">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleExpand(member.id)}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                  {member.nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{member.nome}</span>
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                }
              </div>
              <div className="flex items-center gap-3">
                {totalPago > 0 && (
                  <span className="text-[11px] text-emerald-400 font-medium">+{formatCurrency(totalPago)}</span>
                )}
                {totalPendente > 0 && (
                  <span className="text-[11px] text-destructive font-medium">{formatCurrency(totalPendente)} pend.</span>
                )}
                {pendingIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2 border-border/60"
                    disabled={loading === member.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarcarTudoPago(member.id, pendingIds)
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Quitar
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border/40 px-4 py-3 space-y-1.5 bg-secondary/20">
                {mLancamentos.map((l) => {
                  const settled = l.pago || l.compensado
                  const statusLabel = l.pago ? 'Pago' : l.compensado ? 'Compensado' : 'Pendente'
                  const statusClass = settled
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                    : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500'
                  const valorClass = (['deposito', 'oferta', 'compensacao'].includes(l.tipo) || settled)
                    ? (l.tipo === 'compensacao' ? 'text-muted-foreground' : 'text-emerald-400')
                    : 'text-destructive'
                  return (
                    <div key={l.id} className="flex items-center justify-between text-sm py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{l.tipo}</Badge>
                        <span className="text-muted-foreground text-xs truncate">{l.descricao}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-xs font-medium', valorClass)}>{formatCurrency(l.valor)}</span>
                        <Badge variant="outline" className={cn('text-[10px]', statusClass)}>
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
