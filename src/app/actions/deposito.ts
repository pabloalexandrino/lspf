'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  // 1. Insert deposit lancamento
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

  // 2. Fetch credits (includes new deposit + previous compensacoes) and pending debits
  const [{ data: credits }, { data: pendingDebits }] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('valor')
      .eq('member_id', memberId)
      .eq('pago', true),
    supabase
      .from('lancamentos')
      .select('id, valor')
      .eq('member_id', memberId)
      .eq('pago', false)
      .eq('compensado', false)
      .order('created_at', { ascending: true }),
  ])

  // 3. Calculate available credit
  const totalCredito = (credits ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const totalPendente = (pendingDebits ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const availableCredit = totalCredito - totalPendente

  if (availableCredit > 0 && pendingDebits && pendingDebits.length > 0) {
    // 4. Compensate oldest debits first until credit exhausted
    let remaining = availableCredit
    const toCompensate: string[] = []

    for (const debit of pendingDebits) {
      const debitValor = Number(debit.valor)
      if (remaining >= debitValor) {
        toCompensate.push(debit.id)
        remaining -= debitValor
      }
    }

    if (toCompensate.length > 0) {
      const totalCompensado = Math.round(
        pendingDebits
          .filter((d) => toCompensate.includes(d.id))
          .reduce((s, d) => s + Number(d.valor), 0) * 100
      ) / 100

      // 5. Mark debits as compensated
      const { error: updateError } = await supabase
        .from('lancamentos')
        .update({ compensado: true })
        .in('id', toCompensate)

      if (!updateError) {
        // 6. Insert compensacao lancamento (internal bookkeeping, caixa_id = null)
        await supabase.from('lancamentos').insert({
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
      }
    }
  }

  // 7. Revalidate all relevant pages
  revalidatePath('/financeiro/membros')
  revalidatePath(`/financeiro/membros/${memberId}`)
  revalidatePath('/financeiro')
  revalidatePath('/')

  return { success: true }
}
