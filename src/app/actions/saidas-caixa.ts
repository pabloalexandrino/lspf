'use server'

import { createClient } from '@/lib/supabase/server'
import { saidaCaixaSchema, entradaCaixaSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function registrarSaida(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = saidaCaixaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('lancamentos').insert({
    tipo: 'saida_caixa' as const,
    caixa_id: parsed.data.caixa_id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data_pagamento: parsed.data.data_pagamento,
    pago: true,
    sessao_id: parsed.data.sessao_id ?? null,
    member_id: parsed.data.member_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}

export async function excluirSaida(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Only delete if it's actually a saida_caixa — safety guard
  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id)
    .eq('tipo', 'saida_caixa')

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}

export async function registrarEntrada(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = entradaCaixaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('lancamentos').insert({
    tipo: parsed.data.tipo,
    caixa_id: parsed.data.caixa_id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data_pagamento: parsed.data.data_pagamento,
    pago: true,
    member_id: null,
    sessao_id: parsed.data.sessao_id ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}

export async function excluirEntrada(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id)
    .in('tipo', ['deposito', 'oferta', 'outro'])

  if (error) return { error: error.message }

  revalidatePath('/financeiro/caixas')
  revalidatePath('/')
  return { success: true }
}
