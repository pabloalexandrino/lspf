import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/members/members-table'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MemberWithCargos, Cargo, LancamentoWithSessao } from '@/lib/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: members }, { data: cargos }, { data: lancamentosRaw }] = await Promise.all([
    supabase
      .from('members')
      .select('*, member_cargos(id, cargo_id, cargos(*))')
      .order('nome'),
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
      <MembersTable
        members={(members ?? []) as MemberWithCargos[]}
        allCargos={(cargos ?? []) as Cargo[]}
        lancamentos={(lancamentosRaw ?? []) as LancamentoWithSessao[]}
      />
    </div>
  )
}
