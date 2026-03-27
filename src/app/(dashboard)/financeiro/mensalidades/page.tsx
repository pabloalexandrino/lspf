import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MensalidadesTable } from '@/components/financeiro/mensalidades-table'
import { CalendarDays } from 'lucide-react'

export default async function MensalidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [{ data: mensalidades }, { data: members }] = await Promise.all([
    supabase.from('mensalidades').select('*').order('mes_referencia', { ascending: false }),
    supabase.from('members').select('*').eq('ativo', true).order('nome'),
  ])

  const mensalidadesEnriched = (mensalidades ?? []).map((m) => ({
    ...m,
    member: (members ?? []).find((mb) => mb.id === m.member_id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Mensalidades</h1>
      </div>
      <MensalidadesTable mensalidades={mensalidadesEnriched} mesAtual={mesAtual} />
    </div>
  )
}
