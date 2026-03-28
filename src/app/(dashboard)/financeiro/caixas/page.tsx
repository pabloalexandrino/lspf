import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CaixasCards } from '@/components/financeiro/caixas-cards'
import { Landmark } from 'lucide-react'
import { Member, Sessao } from '@/lib/types'

export default async function CaixasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: caixas }, { data: lancamentos }, { data: sessoes }, { data: members }] =
    await Promise.all([
      supabase.from('caixas').select('*').eq('ativo', true).order('nome'),
      supabase.from('lancamentos').select('*').not('caixa_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('sessoes').select('id, data, descricao').order('data', { ascending: false }),
      supabase.from('members').select('id, nome').eq('ativo', true).order('nome'),
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
      <CaixasCards
        caixas={caixasComLancamentos}
        sessoes={(sessoes ?? []) as Pick<Sessao, 'id' | 'data' | 'descricao'>[]}
        members={(members ?? []) as Pick<Member, 'id' | 'nome'>[]}
      />
    </div>
  )
}
