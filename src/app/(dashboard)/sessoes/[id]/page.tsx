import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { MemberWithCargos, LancamentoWithSessao } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PresencaList } from '@/components/sessoes/presenca-list'
import { AgapeList } from '@/components/sessoes/agape-list'
import { ConsumoForm } from '@/components/sessoes/consumo-form'
import { ResumoFinanceiro } from '@/components/sessoes/resumo-financeiro'
import { TroncoForm } from '@/components/sessoes/tronco-form'
import { formatDate } from '@/lib/utils'
import { Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SessaoDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: sessao },
    { data: members },
    { data: produtos },
    { data: presencasSessao },
    { data: presencasAgape },
    { data: consumosRaw },
    { data: lancamentosRaw },
    { data: tronco },
    { data: allLancamentosRaw },
  ] = await Promise.all([
    supabase.from('sessoes').select('*').eq('id', id).single(),
    supabase.from('members').select('*, member_cargos(id, cargo_id, cargos(*))').order('nome').eq('ativo', true),
    supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    supabase.from('presenca_sessao').select('*').eq('sessao_id', id),
    supabase.from('presenca_agape').select('*').eq('sessao_id', id),
    supabase.from('consumo_produtos').select('*, produto:produtos(*)').eq('sessao_id', id),
    supabase.from('lancamentos').select('*, member:members(*)').eq('sessao_id', id),
    supabase.from('tronco_solidariedade').select('*').eq('sessao_id', id).maybeSingle(),
    supabase.from('lancamentos').select('*, sessao:sessoes(data, descricao)'),
  ])

  if (!sessao) notFound()

  const consumos = (consumosRaw ?? []).map((c) => ({
    ...c,
    produto: c.produto as { id: string; nome: string; preco: number; descricao: string | null; ativo: boolean; created_at: string } | undefined,
  }))

  const lancamentos = (lancamentosRaw ?? []).map((l) => ({
    ...l,
    member: l.member as { id: string; nome: string } | undefined,
  }))

  const allLancamentos = (allLancamentosRaw ?? []) as LancamentoWithSessao[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessoes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">
          Sessão — {formatDate(sessao.data)}
        </h1>
      </div>

      {sessao.descricao && (
        <p className="text-muted-foreground text-sm">{sessao.descricao}</p>
      )}

      <Tabs defaultValue="presenca">
        <TabsList className={`grid w-full ${sessao.tem_agape ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
          {sessao.tem_agape && <TabsTrigger value="agape">Ágape</TabsTrigger>}
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="tronco">Tronco</TabsTrigger>
        </TabsList>

        <TabsContent value="presenca" className="mt-4">
          <PresencaList sessaoId={id} members={(members ?? []) as MemberWithCargos[]} presencas={presencasSessao ?? []} />
        </TabsContent>

        {sessao.tem_agape && (
          <TabsContent value="agape" className="mt-4">
            <AgapeList sessaoId={id} members={(members ?? []) as MemberWithCargos[]} presencasSessao={presencasSessao ?? []} presencasAgape={presencasAgape ?? []} />
          </TabsContent>
        )}

        <TabsContent value="consumo" className="mt-4">
          <ConsumoForm sessaoId={id} members={members ?? []} produtos={produtos ?? []} consumos={consumos} presencasSessao={presencasSessao ?? []} />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <ResumoFinanceiro sessao={sessao} members={(members ?? []) as MemberWithCargos[]} presencasSessao={presencasSessao ?? []} presencasAgape={presencasAgape ?? []} consumos={consumos} lancamentos={lancamentos} allLancamentos={allLancamentos} />
        </TabsContent>

        <TabsContent value="tronco" className="mt-4">
          <TroncoForm sessaoId={id} tronco={tronco ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
