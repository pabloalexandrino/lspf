'use client'

import { useState } from 'react'
import { Lancamento, Member } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { marcarPagoLote } from '@/app/actions/financeiro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, CheckCheck } from 'lucide-react'

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
    const totalPendente = memberLancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
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
        const pendingIds = mLancamentos.filter((l) => !l.pago).map((l) => l.id)

        return (
          <div key={member.id} className="rounded-lg border border-border">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30"
              onClick={() => toggleExpand(member.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">{member.nome}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {totalPago > 0 && (
                  <span className="text-green-500">+{formatCurrency(totalPago)} pago</span>
                )}
                {totalPendente > 0 && (
                  <span className="text-destructive">{formatCurrency(totalPendente)} pendente</span>
                )}
                {pendingIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={loading === member.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarcarTudoPago(member.id, pendingIds)
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Quitar tudo
                  </Button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-3 space-y-1">
                {mLancamentos.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{l.tipo}</Badge>
                      <span className="text-muted-foreground">{l.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(l.valor)}</span>
                      <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                        {l.pago ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
