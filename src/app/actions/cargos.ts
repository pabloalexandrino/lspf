'use server'

import { createClient } from '@/lib/supabase/server'
import { cargoSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function getCargos() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cargos')
    .select('*')
    .order('ordem')
  return data ?? []
}

export async function createCargo(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = cargoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('cargos').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  return { success: true }
}

export async function updateCargo(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = cargoSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('cargos').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  revalidatePath('/members')
  return { success: true }
}

export async function toggleCargo(id: string, ativo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('cargos').update({ ativo }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  revalidatePath('/members')
  return { success: true }
}

export async function deleteCargo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { count } = await supabase
    .from('member_cargos')
    .select('*', { count: 'exact', head: true })
    .eq('cargo_id', id)

  if (count && count > 0) {
    return { error: 'Cargo possui membros associados. Inative-o em vez de excluir.' }
  }

  const { error } = await supabase.from('cargos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/cargos')
  return { success: true }
}
