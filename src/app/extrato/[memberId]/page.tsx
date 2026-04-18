import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { ExtratoTicket } from '@/components/financeiro/extrato-ticket'
import { LancamentoWithSessao } from '@/lib/types'

/**
 * Public extrato page — no authentication required.
 * Rendered outside the (dashboard) group, so no sidebar/header layout applies.
 *
 * Route: /extrato/[memberId]
 */
export default async function ExtratoPublicPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const supabase = createServiceClient()

  // Fetch member and lancamentos in parallel
  const [{ data: member }, { data: lancamentosRaw }] = await Promise.all([
    supabase
      .from('members')
      .select('id, nome, nome_historico')
      .eq('id', memberId)
      .single(),
    supabase
      .from('lancamentos')
      .select('*, sessao:sessoes(data, descricao)')
      .eq('member_id', memberId)
      .order('data_pagamento', { ascending: true }),
  ])

  if (!member) notFound()

  const lancamentos = (lancamentosRaw ?? []) as LancamentoWithSessao[]

  // Mirror the saldo logic from member-wallets-table.tsx
  const totalCredito = lancamentos
    .filter((l) => l.pago && (l.tipo === 'deposito' || l.tipo === 'compensacao'))
    .reduce((s, l) => s + l.valor, 0)
  const debitoPendente = lancamentos
    .filter((l) => !l.pago && !l.compensado)
    .reduce((s, l) => s + l.valor, 0)
  const saldo = totalCredito - debitoPendente

  const emissao = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-neutral-100 flex items-start justify-center p-6 sm:p-10">
      <div className="w-full max-w-sm">
        <ExtratoTicket
          member={member}
          lancamentos={lancamentos}
          saldo={saldo}
          emissao={emissao}
        />
      </div>
    </main>
  )
}
