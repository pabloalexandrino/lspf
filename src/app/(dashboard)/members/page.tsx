import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/members/members-table'
import { Users } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Membros</h1>
      </div>
      <MembersTable members={members ?? []} />
    </div>
  )
}
