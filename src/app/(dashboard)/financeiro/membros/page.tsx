import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemberWalletsTable } from '@/components/financeiro/member-wallets-table'
import { Wallet } from 'lucide-react'

export default async function MembrosWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('members').select('*').eq('ativo', true).order('nome')

  const memberIds = (members ?? []).map((m) => m.id)

  const { data: lancamentos } = memberIds.length > 0
    ? await supabase.from('lancamentos').select('*').in('member_id', memberIds).order('created_at', { ascending: false })
    : { data: [] }

  const membersWithLancamentos = (members ?? []).map((m) => ({
    ...m,
    lancamentos: (lancamentos ?? []).filter((l) => l.member_id === m.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Wallets dos Membros</h1>
      </div>
      <MemberWalletsTable members={membersWithLancamentos} />
    </div>
  )
}
