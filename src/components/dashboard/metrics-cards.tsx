import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Calendar, AlertTriangle, DollarSign, Clock } from 'lucide-react'

export async function MetricsCards() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    { count: totalAtivos },
    { count: sessoesNoMes },
    { data: inadimplentes },
    { data: valorPendente },
    { data: proximaSessao },
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('sessoes').select('id', { count: 'exact', head: true })
      .gte('data', firstOfMonth).lte('data', lastOfMonth),
    supabase.from('lancamentos').select('member_id').eq('pago', false),
    supabase.from('lancamentos').select('valor').eq('pago', false),
    supabase.from('sessoes').select('data').gt('data', today).order('data').limit(1),
  ])

  const totalInadimplentes = new Set((inadimplentes ?? []).map((l) => l.member_id)).size
  const totalValorPendente = (valorPendente ?? []).reduce((s, l) => s + Number(l.valor), 0)

  const cards = [
    {
      title: 'Membros Ativos',
      value: String(totalAtivos ?? 0),
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Sessões no Mês',
      value: String(sessoesNoMes ?? 0),
      icon: Calendar,
      color: 'text-blue-400',
    },
    {
      title: 'Inadimplentes',
      value: String(totalInadimplentes),
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
    {
      title: 'Valor Pendente',
      value: formatCurrency(totalValorPendente),
      icon: DollarSign,
      color: 'text-destructive',
    },
    {
      title: 'Próxima Sessão',
      value: proximaSessao?.[0]?.data ? formatDate(proximaSessao[0].data) : '—',
      icon: Clock,
      color: 'text-green-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.title} className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-xs text-muted-foreground">{card.title}</span>
          </div>
          <p className="text-xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
