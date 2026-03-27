'use server'

import { createClient } from '@/lib/supabase/server'
import { memberSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createMember(data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { cargo_ids, ...memberData } = parsed.data

  const { data: newMember, error } = await supabase
    .from('members')
    .insert(memberData)
    .select('id')
    .single()
  if (error) return { error: error.message }

  if (cargo_ids.length > 0) {
    const { error: cargosError } = await supabase.from('member_cargos').insert(
      cargo_ids.map(cargo_id => ({ member_id: newMember.id, cargo_id }))
    )
    if (cargosError) return { error: cargosError.message }
  }

  revalidatePath('/members')
  return { success: true }
}

export async function updateMember(id: string, data: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { cargo_ids, ...memberData } = parsed.data

  const { error } = await supabase.from('members').update(memberData).eq('id', id)
  if (error) return { error: error.message }

  const { error: deleteError } = await supabase.from('member_cargos').delete().eq('member_id', id)
  if (deleteError) return { error: deleteError.message }

  if (cargo_ids.length > 0) {
    const { error: insertError } = await supabase.from('member_cargos').insert(
      cargo_ids.map(cargo_id => ({ member_id: id, cargo_id }))
    )
    if (insertError) return { error: insertError.message }
  }

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
