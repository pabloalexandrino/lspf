'use server'

import { createServiceClient } from '@/lib/supabase/service'

/**
 * Looks up a member by their CIM number without requiring authentication.
 * Uses the service role client to bypass RLS — this is intentional since
 * the CIM lookup is the first step of a public registration/payment flow.
 *
 * @param cim - The member's CIM number (will be trimmed before query)
 * @returns { memberId } on success or { error } on failure/not found
 */
export async function buscarMembroPorCim(
  cim: string
): Promise<{ memberId: string } | { error: string }> {
  const trimmedCim = cim.trim()

  if (!trimmedCim) {
    return { error: 'CIM não pode ser vazio.' }
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('cim', trimmedCim)
    .limit(1)
    .single()

  if (error) {
    // PGRST116 = no rows returned (PostgREST "not found" code)
    if (error.code === 'PGRST116') {
      return { error: 'CIM não encontrado. Verifique o número e tente novamente.' }
    }

    // Unexpected database error
    console.error('[buscarMembroPorCim] DB error:', error)
    return { error: 'Erro ao buscar membro. Tente novamente.' }
  }

  return { memberId: data.id }
}
