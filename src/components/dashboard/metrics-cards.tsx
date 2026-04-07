import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Calendar, AlertTriangle, DollarSign, Clock, Landmark, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    { data: caixas },
    { data: lancamentosPagos },
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('sessoes').select('id', { count: 'exact', head: true })
      .gte('data', firstOfMonth).lte('data', lastOfMonth),
    supabase.from('lancamentos').select('member_id').eq('pago', false).eq('compensado', false),
    supabase.from('lancamentos').select('valor').eq('pago', false).eq('compensado', false),
    supabase.from('sessoes').select('data').gt('data', today).order('data').limit(1),
    supabase.from('caixas').select('id, nome').eq('ativo', true),
    supabase.from('lancamentos').select('valor, caixa_id, tipo, member_id, pago').not('caixa_id', 'is', null),
  ])

  const totalInadimplentes = new Set((inadimplentes ?? []).map((l) => l.member_id)).size
  const totalValorPendente = (valorPendente ?? []).reduce((s, l) => s + Number(l.valor), 0)

  const barId = (caixas ?? []).find((c) => c.nome === 'Bar da Sabedoria')?.id
  const lojaId = (caixas ?? []).find((c) => c.nome === 'Caixa da Loja')?.id

  function calcularSaldo(caixaId: string | undefined) {
    if (!caixaId) return 0
    const rows = (lancamentosPagos ?? []).filter((l) => l.caixa_id === caixaId)
    const entradas = rows
      .filter((l) => l.tipo !== 'saida_caixa' && l.pago && l.member_id === null)
      .reduce((s, l) => s + Number(l.valor), 0)
    const saidas = rows
      .filter((l) => l.tipo === 'saida_caixa')
      .reduce((s, l) => s + Number(l.valor), 0)
    return entradas - saidas
  }

  const saldoBar = calcularSaldo(barId)
  const saldoLoja = calcularSaldo(lojaId)

  const cards = [
    {
      title: 'Membros Ativos',
      value: String(totalAtivos ?? 0),
      icon: Users,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      title: 'Sessões no Mês',
      value: String(sessoesNoMes ?? 0),
      icon: Calendar,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
    },
    {
      title: 'Inadimplentes',
      value: String(totalInadimplentes),
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-500/10',
    },
    {
      title: 'Valor Pendente',
      value: formatCurrency(totalValorPendente),
      icon: DollarSign,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
    },
    {
      title: 'Próxima Sessão',
      value: proximaSessao?.[0]?.data ? formatDate(proximaSessao[0].data) : '—',
      icon: Clock,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      title: 'Bar da Sabedoria',
      value: formatCurrency(saldoBar),
      icon: Coins,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    {
      title: 'Caixa da Loja',
      value: formatCurrency(saldoLoja),
      icon: Landmark,
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-colors duration-200 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground font-medium leading-tight">{card.title}</span>
            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', card.iconBg)}>
              <card.icon className={cn('h-3.5 w-3.5', card.iconColor)} />
            </div>
          </div>
          <p className="text-xl font-bold tracking-tight leading-none">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
