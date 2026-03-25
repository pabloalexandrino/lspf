import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export async function TopDebtors() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lancamentos')
    .select('member_id, valor, members!inner(nome)')
    .eq('pago', false)

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum débito pendente
      </p>
    )
  }

  // Group by member and sum
  const byMember = data.reduce<Record<string, { nome: string; total: number }>>((acc, l) => {
    const memberId = l.member_id
    const member = l.members as unknown as { nome: string }
    if (!acc[memberId]) {
      acc[memberId] = { nome: member.nome, total: 0 }
    }
    acc[memberId].total += Number(l.valor)
    return acc
  }, {})

  const sorted = Object.entries(byMember)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5)

  return (
    <div className="space-y-2">
      {sorted.map(([memberId, { nome, total }], index) => (
        <div key={memberId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
              {nome.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{nome}</span>
          </div>
          <span className="text-sm font-bold text-destructive">{formatCurrency(total)}</span>
        </div>
      ))}
    </div>
  )
}
