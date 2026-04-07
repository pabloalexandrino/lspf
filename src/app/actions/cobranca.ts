'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarCobranca(
  descricao: string,
  valor: number,
  memberIds: string[]
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  if (!descricao.trim()) return { error: 'Descrição é obrigatória' }
  if (!valor || valor <= 0) return { error: 'Valor deve ser maior que zero' }
  if (memberIds.length === 0) return { error: 'Selecione ao menos um membro' }

  const lancamentos = memberIds.map((memberId) => ({
    member_id: memberId,
    sessao_id: null,
    tipo: 'outro' as const,
    descricao: descricao.trim(),
    valor: Math.round(valor * 100) / 100,
    pago: false,
    compensado: false,
    caixa_id: null,
    data_pagamento: null,
  }))

  const { error } = await supabase.from('lancamentos').insert(lancamentos)
  if (error) return { error: error.message }

  revalidatePath('/financeiro/membros')
  revalidatePath('/financeiro')
  revalidatePath('/')
  return { success: true, count: memberIds.length }
}
