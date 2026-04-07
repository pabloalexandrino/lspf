import { Suspense } from 'react'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { PresencaChart } from '@/components/dashboard/presenca-chart'
import { TopDebtors } from '@/components/dashboard/top-debtors'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { LayoutDashboard } from 'lucide-react'
import { redirect } from 'next/navigation'

async function PresencaChartServer() {
  const supabase = await createClient()

  const { data: sessoes } = await supabase
    .from('sessoes')
    .select('id, data')
    .order('data', { ascending: false })
    .limit(6)

  if (!sessoes || sessoes.length === 0) {
    return <PresencaChart data={[]} />
  }

  const sessaoIds = sessoes.map((s) => s.id)
  const { data: presencas } = await supabase
    .from('presenca_sessao')
    .select('sessao_id')
    .in('sessao_id', sessaoIds)

  const countBySessao = (presencas ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.sessao_id] = (acc[p.sessao_id] || 0) + 1
    return acc
  }, {})

  const chartData = sessoes
    .reverse()
    .map((s) => ({
      data: formatDate(s.data),
      presentes: countBySessao[s.id] || 0,
    }))

  return <PresencaChart data={chartData} />
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Dashboard</h1>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}
        </div>
      }>
        <MetricsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-colors">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Presença — Últimas 6 Sessões
          </h2>
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
            <PresencaChartServer />
          </Suspense>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-colors">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Top 5 Maiores Devedores
          </h2>
          <Suspense fallback={
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          }>
            <TopDebtors />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
