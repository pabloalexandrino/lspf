import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LancamentosTable } from '@/components/financeiro/lancamentos-table'
import { MemberSummary } from '@/components/financeiro/member-summary'
import { DollarSign, TrendingDown, TrendingUp, Wallet, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: lancamentosRaw },
    { data: members },
    { data: sessoes },
    { data: caixas },
  ] = await Promise.all([
    supabase.from('lancamentos').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('members').select('*').order('nome'),
    supabase.from('sessoes').select('*').order('data', { ascending: false }),
    supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
  ])

  // Enrich lancamentos
  const lancamentos = (lancamentosRaw ?? []).map((l) => ({
    ...l,
    member: (members ?? []).find((m) => m.id === l.member_id),
    sessao: (sessoes ?? []).find((s) => s.id === l.sessao_id),
  }))

  const totalPendente = lancamentos
    .filter((l) => !l.pago && !l.compensado)
    .reduce((s, l) => s + l.valor, 0)

  const totalPago = lancamentos
    .filter((l) => l.pago && l.tipo !== 'compensacao')
    .reduce((s, l) => s + l.valor, 0)

  // Per-member saldo for dashboard breakdown
  const memberSaldos = (members ?? []).map((m) => {
    const mLanc = lancamentos.filter((l) => l.member_id === m.id)
    const creditos = mLanc
      .filter((l) => l.pago && (l.tipo === 'deposito' || l.tipo === 'compensacao'))
      .reduce((s, l) => s + l.valor, 0)
    const debitos = mLanc.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    return creditos - debitos
  })

  const membrosComCredito = memberSaldos.filter((s) => s > 0)
  const membrosDevedores = memberSaldos.filter((s) => s < 0)
  const totalCreditoDisponivel = membrosComCredito.reduce((s, v) => s + v, 0)
  const totalDevidoReal = membrosDevedores.reduce((s, v) => s + Math.abs(v), 0)

  const summaryCards = [
    {
      label: 'Pendente Real',
      value: formatCurrency(totalPendente),
      sub: `${membrosDevedores.length} membros devedores`,
      icon: AlertCircle,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
      valueColor: 'text-destructive',
    },
    {
      label: 'Total Pago',
      value: formatCurrency(totalPago),
      sub: null,
      icon: TrendingUp,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      valueColor: 'text-emerald-400',
    },
    {
      label: 'Créditos em Carteira',
      value: formatCurrency(totalCreditoDisponivel),
      sub: `${membrosComCredito.length} membros c/ crédito`,
      icon: Wallet,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      valueColor: 'text-blue-400',
    },
    {
      label: 'Total Devido',
      value: formatCurrency(totalDevidoReal),
      sub: `${membrosDevedores.length} devedores`,
      icon: TrendingDown,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      valueColor: 'text-amber-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Financeiro</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-colors duration-200">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[11px] text-muted-foreground font-medium leading-tight">{card.label}</p>
              <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', card.iconBg)}>
                <card.icon className={cn('h-3.5 w-3.5', card.iconColor)} />
              </div>
            </div>
            <p className={cn('text-xl font-bold tracking-tight', card.valueColor)}>{card.value}</p>
            {card.sub && (
              <p className="text-[11px] text-muted-foreground mt-1.5">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="lancamentos" className="text-xs">Lançamentos</TabsTrigger>
          <TabsTrigger value="por-membro" className="text-xs">Por Membro</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-4">
          <LancamentosTable
            lancamentos={lancamentos}
            members={members ?? []}
            sessoes={sessoes ?? []}
            caixas={caixas ?? []}
          />
        </TabsContent>

        <TabsContent value="por-membro" className="mt-4">
          <MemberSummary lancamentos={lancamentos} members={members ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
