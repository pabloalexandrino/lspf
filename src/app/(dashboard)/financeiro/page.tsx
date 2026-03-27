import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LancamentosTable } from '@/components/financeiro/lancamentos-table'
import { MemberSummary } from '@/components/financeiro/member-summary'
import { DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'

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

  const totalPendente = lancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
  const totalPago = lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Pendente</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-xl font-bold text-green-500">{formatCurrency(totalPago)}</p>
        </div>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="por-membro">Por Membro</TabsTrigger>
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
