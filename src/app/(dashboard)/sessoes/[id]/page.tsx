import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PresencaList } from '@/components/sessoes/presenca-list'
import { AgapeList } from '@/components/sessoes/agape-list'
import { ConsumoForm } from '@/components/sessoes/consumo-form'
import { ResumoFinanceiro } from '@/components/sessoes/resumo-financeiro'
import { Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function SessaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: sessao },
    { data: members },
    { data: presencasSessao },
    { data: presencasAgape },
    { data: produtos },
    { data: consumosRaw },
    { data: lancamentosRaw },
  ] = await Promise.all([
    supabase.from('sessoes').select('*').eq('id', id).single(),
    supabase.from('members').select('*').order('nome'),
    supabase.from('presenca_sessao').select('*').eq('sessao_id', id),
    supabase.from('presenca_agape').select('*').eq('sessao_id', id),
    supabase.from('produtos').select('*').order('nome'),
    supabase.from('consumo_produtos').select('*').eq('sessao_id', id),
    supabase.from('lancamentos').select('*').eq('sessao_id', id),
  ])

  if (!sessao) notFound()

  // Enrich consumos with produto data
  const consumos = (consumosRaw ?? []).map((c) => ({
    ...c,
    produto: (produtos ?? []).find((p) => p.id === c.produto_id),
  }))

  // Enrich lancamentos with member data
  const lancamentos = (lancamentosRaw ?? []).map((l) => ({
    ...l,
    member: (members ?? []).find((m) => m.id === l.member_id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/sessoes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">{formatDate(sessao.data)}</h1>
        {sessao.tem_agape && (
          <Badge variant="secondary">Ágape</Badge>
        )}
        {sessao.descricao && (
          <span className="text-muted-foreground text-sm">{sessao.descricao}</span>
        )}
      </div>

      <Tabs defaultValue="presenca">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="presenca">Presença</TabsTrigger>
          <TabsTrigger value="agape" disabled={!sessao.tem_agape}>Ágape</TabsTrigger>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="presenca" className="mt-4">
          <PresencaList
            sessaoId={id}
            members={members ?? []}
            presencas={presencasSessao ?? []}
          />
        </TabsContent>

        <TabsContent value="agape" className="mt-4">
          <AgapeList
            sessaoId={id}
            members={members ?? []}
            presencasSessao={presencasSessao ?? []}
            presencasAgape={presencasAgape ?? []}
          />
        </TabsContent>

        <TabsContent value="consumo" className="mt-4">
          <ConsumoForm
            sessaoId={id}
            members={members ?? []}
            produtos={produtos ?? []}
            consumos={consumos}
            presencasSessao={presencasSessao ?? []}
          />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <ResumoFinanceiro
            sessao={sessao}
            members={members ?? []}
            presencasSessao={presencasSessao ?? []}
            presencasAgape={presencasAgape ?? []}
            consumos={consumos}
            lancamentos={lancamentos}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
