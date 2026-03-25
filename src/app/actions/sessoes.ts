'use server'

import { createClient } from '@/lib/supabase/server'
import { sessaoSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createSessao(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = sessaoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('sessoes').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/sessoes')
  return { success: true }
}

export async function updateSessao(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = sessaoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('sessoes').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/sessoes')
  revalidatePath(`/sessoes/${id}`)
  return { success: true }
}

export async function deleteSessao(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('sessoes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/sessoes')
  return { success: true }
}
