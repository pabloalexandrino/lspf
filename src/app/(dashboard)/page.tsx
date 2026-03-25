import { Suspense } from 'react'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { PresencaChart } from '@/components/dashboard/presenca-chart'
import { TopDebtors } from '@/components/dashboard/top-debtors'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { LayoutDashboard } from 'lucide-react'

async function PresencaChartServer() {
  const supabase = await createClient()

  // Get last 6 sessions with presence count
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>}>
        <MetricsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium mb-4">Presença nas Últimas 6 Sessões</h2>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <PresencaChartServer />
          </Suspense>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium mb-4">Top 5 Maiores Devedores</h2>
          <Suspense fallback={<div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>}>
            <TopDebtors />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
