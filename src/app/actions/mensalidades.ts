'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCaixaLojaId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase
    .from('caixas')
    .select('id')
    .eq('nome', 'Caixa da Loja')
    .single()
  return data?.id ?? null
}

// mesReferencia: first day of month, e.g. "2026-03-01"
export async function gerarMensalidades(mesReferencia: string, valor: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id')
    .eq('ativo', true)

  if (membersError) return { error: membersError.message }
  if (!members || members.length === 0) return { error: 'Nenhum membro ativo encontrado' }

  const rows = members.map((m) => ({
    member_id: m.id,
    mes_referencia: mesReferencia,
    valor,
    pago: false,
  }))

  // upsert: ignore if already exists (unique constraint on member_id + mes_referencia)
  const { error } = await supabase
    .from('mensalidades')
    .upsert(rows, { onConflict: 'member_id,mes_referencia', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/mensalidades')
  return { success: true, count: members.length }
}

export async function marcarMensalidadePaga(mensalidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const today = new Date().toISOString().split('T')[0]

  const { data: mensalidade, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .single()

  if (fetchError || !mensalidade) return { error: 'Mensalidade não encontrada' }

  const caixaLojaId = await getCaixaLojaId(supabase)

  // Mark as paid
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: true, data_pagamento: today })
    .eq('id', mensalidadeId)

  if (updateError) return { error: updateError.message }

  // Create lancamento entry so it shows in caixa balance
  const { error: lancError } = await supabase.from('lancamentos').insert({
    sessao_id: null,
    member_id: mensalidade.member_id,
    tipo: 'mensalidade',
    descricao: `Mensalidade ${mensalidade.mes_referencia.substring(0, 7)}`,
    valor: mensalidade.valor,
    pago: true,
    data_pagamento: today,
    caixa_id: caixaLojaId,
  })

  if (lancError) return { error: lancError.message }

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}

export async function marcarMensalidadesPagasLote(mensalidadeIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (mensalidadeIds.length === 0) return { success: true }

  const today = new Date().toISOString().split('T')[0]
  const caixaLojaId = await getCaixaLojaId(supabase)

  const { data: mensalidades, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .in('id', mensalidadeIds)
    .eq('pago', false)

  if (fetchError) return { error: fetchError.message }
  if (!mensalidades || mensalidades.length === 0) return { success: true, count: 0 }

  // Mark all as paid
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: true, data_pagamento: today })
    .in('id', mensalidadeIds)

  if (updateError) return { error: updateError.message }

  // Create lancamentos for each
  const lancamentos = mensalidades.map((m) => ({
    sessao_id: null as string | null,
    member_id: m.member_id,
    tipo: 'mensalidade' as const,
    descricao: `Mensalidade ${m.mes_referencia.substring(0, 7)}`,
    valor: m.valor,
    pago: true,
    data_pagamento: today,
    caixa_id: caixaLojaId,
  }))

  const { error: lancError } = await supabase.from('lancamentos').insert(lancamentos)
  if (lancError) return { error: lancError.message }

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true, count: mensalidades.length }
}

export async function desfazerMensalidadePaga(mensalidadeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: mensalidade, error: fetchError } = await supabase
    .from('mensalidades')
    .select('*')
    .eq('id', mensalidadeId)
    .single()

  if (fetchError || !mensalidade) return { error: 'Mensalidade não encontrada' }

  // Revert mensalidade
  const { error: updateError } = await supabase
    .from('mensalidades')
    .update({ pago: false, data_pagamento: null })
    .eq('id', mensalidadeId)

  if (updateError) return { error: updateError.message }

  // Remove the related lancamento (match by member_id + tipo + mes_referencia in descricao)
  await supabase
    .from('lancamentos')
    .delete()
    .eq('member_id', mensalidade.member_id)
    .eq('tipo', 'mensalidade')
    .eq('descricao', `Mensalidade ${mensalidade.mes_referencia.substring(0, 7)}`)

  revalidatePath('/financeiro/mensalidades')
  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true }
}
