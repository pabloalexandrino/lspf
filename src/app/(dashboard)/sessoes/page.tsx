import { createClient } from '@/lib/supabase/server'
import { SessoesTable } from '@/components/sessoes/sessoes-table'
import { Calendar } from 'lucide-react'

export default async function SessoesPage() {
  const supabase = await createClient()
  const { data: sessoes } = await supabase
    .from('sessoes')
    .select('*')
    .order('data', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Sessões</h1>
      </div>
      <SessoesTable sessoes={sessoes ?? []} />
    </div>
  )
}
