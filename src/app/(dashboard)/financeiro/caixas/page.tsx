import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CaixasCards } from '@/components/financeiro/caixas-cards'
import { Landmark } from 'lucide-react'

export default async function CaixasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: caixas }, { data: lancamentos }] = await Promise.all([
    supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
    supabase.from('lancamentos').select('*').not('caixa_id', 'is', null),
  ])

  const caixasComLancamentos = (caixas ?? []).map((caixa) => ({
    ...caixa,
    lancamentos: (lancamentos ?? []).filter((l) => l.caixa_id === caixa.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Caixas</h1>
      </div>
      <CaixasCards caixas={caixasComLancamentos} />
    </div>
  )
}
