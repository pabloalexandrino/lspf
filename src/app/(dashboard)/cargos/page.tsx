import { createClient } from '@/lib/supabase/server'
import { CargosTable } from '@/components/cargos/cargos-table'
import { Shield } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function CargosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cargos } = await supabase
    .from('cargos')
    .select('*')
    .order('ordem')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Cargos</h1>
      </div>
      <CargosTable cargos={cargos ?? []} />
    </div>
  )
}
