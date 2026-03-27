import { createClient } from '@/lib/supabase/server'
import { SessoesTable } from '@/components/sessoes/sessoes-table'
import { Calendar } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function SessoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sessoes }, { data: presencas }, { count: totalMembros }] = await Promise.all([
    supabase.from('sessoes').select('*').order('data', { ascending: false }),
    supabase.from('presenca_sessao').select('sessao_id'),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('ativo', true),
  ])

  const total = totalMembros ?? 0
  const presencaMap: Record<string, { presentes: number; pct: number }> = {}
  for (const sessao of sessoes ?? []) {
    const presentes = (presencas ?? []).filter(p => p.sessao_id === sessao.id).length
    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0
    presencaMap[sessao.id] = { presentes, pct }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Sessões</h1>
      </div>
      <SessoesTable sessoes={sessoes ?? []} presencaMap={presencaMap} />
    </div>
  )
}
