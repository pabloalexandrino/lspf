import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export async function TopDebtors() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lancamentos')
    .select('member_id, valor, members!inner(nome)')
    .eq('pago', false)
    .eq('compensado', false)

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum débito pendente
      </p>
    )
  }

  // Group by member and sum
  const byMember = data.reduce<Record<string, { nome: string; total: number }>>((acc, l) => {
    const memberId = l.member_id
    const membersData = l.members as { nome: string }[] | { nome: string } | null
    const memberName = Array.isArray(membersData)
      ? (membersData[0]?.nome ?? 'Desconhecido')
      : (membersData?.nome ?? 'Desconhecido')
    if (!acc[memberId]) {
      acc[memberId] = { nome: memberName, total: 0 }
    }
    acc[memberId].total += Number(l.valor)
    return acc
  }, {})

  const sorted = Object.entries(byMember)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5)

  const maxTotal = sorted[0]?.[1]?.total ?? 1

  return (
    <div className="space-y-1">
      {sorted.map(([memberId, { nome, total }], index) => (
        <div key={memberId} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
          <span className="text-[11px] font-bold text-muted-foreground/50 w-4 text-center shrink-0">
            {index + 1}
          </span>
          <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium truncate leading-none">{nome}</p>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-destructive/60"
                style={{ width: `${(total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold text-destructive shrink-0">{formatCurrency(total)}</span>
        </div>
      ))}
    </div>
  )
}
