'use server'

import { createClient } from '@/lib/supabase/server'
import { produtoSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createProduto(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = produtoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('produtos').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function updateProduto(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = produtoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('produtos').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}
// Note: NO deleteProduto — produtos are only inactivated via updateProduto with ativo=false
