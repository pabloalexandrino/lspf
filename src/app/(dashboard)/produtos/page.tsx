import { createClient } from '@/lib/supabase/server'
import { ProdutosTable } from '@/components/produtos/produtos-table'
import { Package } from 'lucide-react'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Produtos</h1>
      </div>
      <ProdutosTable produtos={produtos ?? []} />
    </div>
  )
}
