'use server'

import { createClient } from '@/lib/supabase/server'
import { memberSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function getMembers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('members')
    .select('*, cargo:cargos(id, nome, cor, ordem, ativo, created_at)')
    .order('numero', { ascending: true, nullsFirst: false })
  if (error) return { error: error.message }
  return { data }
}

export async function createMember(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('members').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/members')
  return { success: true }
}

export async function updateMember(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('members').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/members')
  return { success: true }
}

export async function deleteMember(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/members')
  return { success: true }
}
