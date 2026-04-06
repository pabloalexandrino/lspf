'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

// Internal helper: wipes all compensacoes for a member, resets all compensado=false,
// then re-runs the auto-compensation algorithm with whatever deposits remain.
async function _recomputarCompensacoes(supabase: SupabaseClient, memberId: string) {
  // 1. Delete all existing compensacao entries for this member
  await supabase
    .from('lancamentos')
    .delete()
    .eq('member_id', memberId)
    .eq('tipo', 'compensacao')

  // 2. Reset all debits back to compensado=false
  await supabase
    .from('lancamentos')
    .update({ compensado: false })
    .eq('member_id', memberId)
    .eq('compensado', true)

  // 3. Fetch remaining credit (deposits only) and pending debits
  const [{ data: credits }, { data: pendingDebits }] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('valor')
      .eq('member_id', memberId)
      .eq('pago', true)
      .eq('tipo', 'deposito'),
    supabase
      .from('lancamentos')
      .select('id, valor')
      .eq('member_id', memberId)
      .eq('pago', false)
      .eq('compensado', false)
      .order('created_at', { ascending: true }),
  ])

  const totalCredito = (credits ?? []).reduce((s: number, l: { valor: number }) => s + Number(l.valor), 0)

  if (totalCredito <= 0 || !pendingDebits || pendingDebits.length === 0) return

  // 4. Compensate oldest debits first until credit is exhausted
  let remainingCents = Math.round(totalCredito * 100)
  const toCompensate: string[] = []

  for (const debit of pendingDebits) {
    const debitCents = Math.round(Number(debit.valor) * 100)
    if (remainingCents >= debitCents) {
      toCompensate.push(debit.id)
      remainingCents -= debitCents
    }
  }

  if (toCompensate.length === 0) return

  const totalCompensado =
    Math.round(
      pendingDebits
        .filter((d: { id: string }) => toCompensate.includes(d.id))
        .reduce((s: number, d: { valor: number }) => s + Number(d.valor), 0) * 100
    ) / 100

  const { error: updateError } = await supabase
    .from('lancamentos')
    .update({ compensado: true })
    .in('id', toCompensate)

  if (!updateError) {
    const { error: compensacaoError } = await supabase.from('lancamentos').insert({
      member_id: memberId,
      sessao_id: null,
      tipo: 'compensacao',
      valor: -totalCompensado,
      pago: true,
      compensado: false,
      descricao: 'Compensação automática de crédito em carteira',
      caixa_id: null,
      data_pagamento: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    })
    if (compensacaoError) {
      console.error(`[deposito] compensacao insert failed for member ${memberId}:`, compensacaoError)
    }
  }
}

function _revalidar(memberId: string) {
  revalidatePath('/financeiro/membros')
  revalidatePath(`/financeiro/membros/${memberId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')
}

export async function registrarDeposito(
  memberId: string,
  valor: number,
  data: string,
  descricao: string,
  caixaId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (!valor || valor <= 0) return { error: 'Valor deve ser maior que zero' }

  const { error: depositError } = await supabase.from('lancamentos').insert({
    member_id: memberId,
    tipo: 'deposito',
    pago: true,
    compensado: false,
    valor,
    data_pagamento: data,
    descricao,
    caixa_id: caixaId,
    sessao_id: null,
  })

  if (depositError) return { error: depositError.message }

  await _recomputarCompensacoes(supabase, memberId)
  _revalidar(memberId)
  return { success: true }
}

export async function editarDeposito(
  depositoId: string,
  memberId: string,
  valor: number,
  data: string,
  descricao: string,
  caixaId: string | null
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (!valor || valor <= 0) return { error: 'Valor deve ser maior que zero' }

  const { error: updateError } = await supabase
    .from('lancamentos')
    .update({ valor, data_pagamento: data, descricao, caixa_id: caixaId })
    .eq('id', depositoId)
    .eq('member_id', memberId)
    .eq('tipo', 'deposito')

  if (updateError) return { error: updateError.message }

  await _recomputarCompensacoes(supabase, memberId)
  _revalidar(memberId)
  return { success: true }
}

export async function excluirDeposito(
  depositoId: string,
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error: deleteError } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', depositoId)
    .eq('member_id', memberId)
    .eq('tipo', 'deposito')

  if (deleteError) return { error: deleteError.message }

  await _recomputarCompensacoes(supabase, memberId)
  _revalidar(memberId)
  return { success: true }
}
