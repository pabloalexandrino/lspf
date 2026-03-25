'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function gerarLancamentos(sessaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

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
  }> = []

  // 3a. Custo extra
  const custoExtra = Number(sessao.custo_extra) || 0
  if (custoExtra > 0) {
    if (sessao.tem_agape) {
      // Divide among ágape members
      const agapeMembers = presencasAgape ?? []
      if (agapeMembers.length > 0) {
        const valorPorPessoa = Math.round((custoExtra / agapeMembers.length) * 100) / 100
        for (const p of agapeMembers) {
          lancamentos.push({
            sessao_id: sessaoId,
            member_id: p.member_id,
            tipo: 'agape',
            descricao: sessao.custo_extra_descricao || 'Ágape',
            valor: valorPorPessoa,
            pago: false,
          })
        }
      }
    } else {
      // Divide among all session presentes
      const sessionMembers = presencasSessao ?? []
      if (sessionMembers.length > 0) {
        const valorPorPessoa = Math.round((custoExtra / sessionMembers.length) * 100) / 100
        for (const p of sessionMembers) {
          lancamentos.push({
            sessao_id: sessaoId,
            member_id: p.member_id,
            tipo: 'sessao',
            descricao: sessao.custo_extra_descricao || 'Custo da sessão',
            valor: valorPorPessoa,
            pago: false,
          })
        }
      }
    }
  }

  // 3b. Individual product consumptions
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

  const { error } = await supabase
    .from('lancamentos')
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
    })
    .in('id', lancamentoIds)

  if (error) return { error: error.message }

  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}
