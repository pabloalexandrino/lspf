'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function togglePresencaSessao(
  sessaoId: string,
  memberId: string,
  presente: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (presente) {
    const { error } = await supabase
      .from('presenca_sessao')
      .insert({ sessao_id: sessaoId, member_id: memberId })
    if (error && error.code !== '23505') return { error: error.message } // 23505 = unique violation (already present)
  } else {
    // Remove from sessao AND agape
    await supabase
      .from('presenca_agape')
      .delete()
      .eq('sessao_id', sessaoId)
      .eq('member_id', memberId)
    const { error } = await supabase
      .from('presenca_sessao')
      .delete()
      .eq('sessao_id', sessaoId)
      .eq('member_id', memberId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/sessoes/${sessaoId}`)
  return { success: true }
}

export async function togglePresencaAgape(
  sessaoId: string,
  memberId: string,
  presente: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (presente) {
    const { error } = await supabase
      .from('presenca_agape')
      .insert({ sessao_id: sessaoId, member_id: memberId })
    if (error && error.code !== '23505') return { error: error.message }
  } else {
    const { error } = await supabase
      .from('presenca_agape')
      .delete()
      .eq('sessao_id', sessaoId)
      .eq('member_id', memberId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/sessoes/${sessaoId}`)
  return { success: true }
}

export async function upsertConsumoProduto(
  sessaoId: string,
  memberId: string,
  produtoId: string,
  quantidade: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (quantidade <= 0) {
    // Remove if quantity is 0
    await supabase
      .from('consumo_produtos')
      .delete()
      .eq('sessao_id', sessaoId)
      .eq('member_id', memberId)
      .eq('produto_id', produtoId)
    revalidatePath(`/sessoes/${sessaoId}`)
    return { success: true }
  }

  // Check if exists
  const { data: existing } = await supabase
    .from('consumo_produtos')
    .select('id')
    .eq('sessao_id', sessaoId)
    .eq('member_id', memberId)
    .eq('produto_id', produtoId)
    .single()

  if (existing) {
    await supabase
      .from('consumo_produtos')
      .update({ quantidade })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('consumo_produtos')
      .insert({ sessao_id: sessaoId, member_id: memberId, produto_id: produtoId, quantidade })
  }

  revalidatePath(`/sessoes/${sessaoId}`)
  return { success: true }
}

export async function removeConsumoProduto(id: string, sessaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('consumo_produtos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/sessoes/${sessaoId}`)
  return { success: true }
}
