'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getBarSabedoriaId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase
    .from('caixas')
    .select('id')
    .eq('nome', 'Bar da Sabedoria')
    .single()
  return data?.id ?? null
}

export async function gerarLancamentos(sessaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const barId = await getBarSabedoriaId(supabase)

  // 1. Delete existing lancamentos for this session
  await supabase.from('lancamentos').delete().eq('sessao_id', sessaoId)

  // 2. Fetch all data
  const [
    { data: sessao },
    { data: presencasSessao },
    { data: presencasAgape },
    { data: consumos },
  ] = await Promise.all([
    supabase.from('sessoes').select('*').eq('id', sessaoId).single(),
    supabase.from('presenca_sessao').select('member_id').eq('sessao_id', sessaoId),
    supabase.from('presenca_agape').select('member_id').eq('sessao_id', sessaoId),
    supabase
      .from('consumo_produtos')
      .select('*, produto:produtos(*)')
      .eq('sessao_id', sessaoId),
  ])

  if (!sessao) return { error: 'Sessão não encontrada' }

  const lancamentos: Array<{
    sessao_id: string
    member_id: string
    tipo: 'sessao' | 'agape' | 'produto'
    descricao: string
    valor: number
    pago: boolean
    caixa_id: string | null
  }> = []

  // 3a. Custo da sessão — divide among session presentes
  const custoSessao = Number(sessao.custo_sessao) || 0
  if (custoSessao > 0) {
    const sessionMembers = presencasSessao ?? []
    if (sessionMembers.length > 0) {
      const baseValue = Math.floor((custoSessao / sessionMembers.length) * 100) / 100
      const remainder = Math.round((custoSessao - baseValue * sessionMembers.length) * 100) / 100
      sessionMembers.forEach((p, index) => {
        const valor = index === sessionMembers.length - 1 ? baseValue + remainder : baseValue
        lancamentos.push({
          sessao_id: sessaoId,
          member_id: p.member_id,
          tipo: 'sessao',
          descricao: 'Bar da Sabedoria',
          valor: Math.round(valor * 100) / 100,
          pago: false,
          caixa_id: barId,
        })
      })
    }
  }

  // 3b. Custo do ágape — divide among ágape presentes
  const custoAgape = Number(sessao.custo_agape) || 0
  if (custoAgape > 0) {
    const agapeMembers = presencasAgape ?? []
    if (agapeMembers.length > 0) {
      const baseValue = Math.floor((custoAgape / agapeMembers.length) * 100) / 100
      const remainder = Math.round((custoAgape - agapeMembers.length * baseValue) * 100) / 100
      agapeMembers.forEach((p, index) => {
        const valor = index === agapeMembers.length - 1 ? baseValue + remainder : baseValue
        lancamentos.push({
          sessao_id: sessaoId,
          member_id: p.member_id,
          tipo: 'agape',
          descricao: 'Bar da Sabedoria',
          valor: Math.round(valor * 100) / 100,
          pago: false,
          caixa_id: barId,
        })
      })
    }
  }

  // 3c. Individual product consumptions
  for (const consumo of consumos ?? []) {
    const produto = consumo.produto as { nome: string; preco: number } | null
    if (!produto) continue
    const valor = Math.round(produto.preco * consumo.quantidade * 100) / 100
    lancamentos.push({
      sessao_id: sessaoId,
      member_id: consumo.member_id,
      tipo: 'produto',
      descricao: `${produto.nome} (${consumo.quantidade}x)`,
      valor,
      pago: false,
      caixa_id: barId,
    })
  }

  // 4. Insert all
  if (lancamentos.length > 0) {
    const { error } = await supabase.from('lancamentos').insert(lancamentos)
    if (error) return { error: error.message }
  }

  // 5. Revalidate
  revalidatePath(`/sessoes/${sessaoId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')

  return { success: true, count: lancamentos.length }
}

export async function marcarPago(lancamentoId: string, pago: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('lancamentos')
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', lancamentoId)

  if (error) return { error: error.message }

  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}

export async function marcarPagoLote(lancamentoIds: string[], pago: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (lancamentoIds.length === 0) return { success: true }

  const { error } = await supabase
    .from('lancamentos')
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
    })
    .in('id', lancamentoIds)

  if (error) return { error: error.message }

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/membros')
  revalidatePath('/')
  return { success: true }
}

export async function salvarTronco(sessaoId: string, valor: number, observacao: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('tronco_solidariedade')
    .upsert(
      { sessao_id: sessaoId, valor, observacao: observacao || null },
      { onConflict: 'sessao_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/sessoes/${sessaoId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}
