import { createClient } from '@/lib/supabase/server'
import { MembersClient } from '@/components/members/members-client'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Member, Cargo, LancamentoWithSessao } from '@/lib/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: cargos }, { data: lancamentosRaw }] = await Promise.all([
    supabase
      .from('members')
      .select('*, cargo:cargos(id, nome, cor, ordem, ativo, created_at)')
      .order('numero', { ascending: true, nullsFirst: false }),
    supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('lancamentos')
      .select('*, sessao:sessoes(data, descricao)')
      .eq('pago', false)
      .not('member_id', 'is', null),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Membros</h1>
      </div>
      <MembersClient
        members={(members ?? []) as Member[]}
        allCargos={(cargos ?? []) as Cargo[]}
        lancamentos={(lancamentosRaw ?? []) as LancamentoWithSessao[]}
      />
    </div>
  )
}
