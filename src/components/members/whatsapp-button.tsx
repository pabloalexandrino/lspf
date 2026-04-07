'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Member, LancamentoWithSessao, Sessao } from '@/lib/types'
import { format } from 'date-fns'

interface WhatsAppButtonProps {
  member: Member
  lancamentos: LancamentoWithSessao[]   // todos os lançamentos do membro (pago e pendentes)
  sessao?: Sessao                        // opcional: sessão de referência
}

function gerarMensagemCobranca(
  member: Member,
  lancamentos: LancamentoWithSessao[],
  sessao?: Sessao
): string {
  const primeiroNome = member.nome.split(' ')[0]
  const pendentes = lancamentos.filter((l) => !l.pago && !l.compensado)

  const agapes = pendentes.filter((l) => l.tipo === 'agape')
  const sessoesLanc = pendentes.filter((l) => l.tipo === 'sessao')
  const produtos = pendentes.filter((l) => l.tipo === 'produto')

  // Wallet balance = only deposits and compensations (not cash payments like mensalidade)
  const creditos = lancamentos
    .filter((l) => l.pago && (l.tipo === 'deposito' || l.tipo === 'compensacao'))
    .reduce((s, l) => s + l.valor, 0)
  const debitos = pendentes.reduce((s, l) => s + l.valor, 0)
  const saldoLiquido = creditos - debitos

  function formatarData(lancamento: LancamentoWithSessao): string {
    const dataStr = sessao?.data ?? lancamento.sessao?.data
    if (!dataStr) return '?'
    return format(new Date(dataStr + 'T00:00:00'), 'dd/MM')
  }

  function formatarValor(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const linhas: string[] = [`Boa tarde Ir:. ${primeiroNome}, tudo bem?`]

  if (agapes.length > 0) {
    const totalAgape = agapes.reduce((s, l) => s + l.valor, 0)
    const dataRef = formatarData(agapes[0])
    linhas.push(`\nSeu ágape referente à sessão do dia ${dataRef}, ficou:`)
    linhas.push(`R$ ${formatarValor(totalAgape)} rateio do jantar`)
  }

  if (sessoesLanc.length > 0) {
    sessoesLanc.forEach((l) => {
      const dataRef = formatarData(l)
      const desc = l.descricao ?? `sessão de ${dataRef}`
      linhas.push(`\nCusto da sessão ${dataRef}: R$ ${formatarValor(l.valor)} (${desc})`)
      linhas.push(`Dividido entre os presentes na sessão.`)
    })
  }

  if (produtos.length > 0) {
    linhas.push(`\nConsumo individual:`)
    produtos.forEach((l) => {
      linhas.push(`- ${l.descricao ?? 'Produto'}: R$ ${formatarValor(l.valor)}`)
    })
  }

  if (saldoLiquido >= 0) {
    linhas.push(`\nComo você tem saldo positivo de R$ ${formatarValor(creditos)} em carteira,`)
    linhas.push(`o valor das cobranças (R$ ${formatarValor(debitos)}) será abatido do saldo.`)
    linhas.push(`Saldo restante: R$ ${formatarValor(saldoLiquido)}`)
  } else {
    linhas.push(`\nSaldo na carteira: - R$ ${formatarValor(Math.abs(saldoLiquido))} (incluindo esta cobrança)`)
    linhas.push(`\nSegue chave pix: bardasabedoria@gmail.com`)
    linhas.push(`\nAguardo comprovante de pagamento para dar baixa. TFA`)
  }

  return linhas.join('\n')
}

export function WhatsAppButton({ member, lancamentos, sessao }: WhatsAppButtonProps) {
  const pendentes = lancamentos.filter((l) => !l.pago && !l.compensado)
  const temWhatsapp = Boolean(member.whatsapp)
  const temDebitos = pendentes.length > 0

  const disabled = !temWhatsapp || !temDebitos

  const tooltipText = !temWhatsapp
    ? 'WhatsApp não cadastrado'
    : !temDebitos
      ? 'Membro sem débitos pendentes'
      : null

  function handleClick() {
    if (!member.whatsapp) return
    const numero = `55${member.whatsapp}`
    const mensagem = gerarMensagemCobranca(member, lancamentos, sessao)
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <Button
              size="sm"
              variant="outline"
              disabled
              className="opacity-40 cursor-not-allowed"
            >
              <FaWhatsapp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          {tooltipText && (
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-600 text-green-500 hover:bg-green-600/10"
      onClick={handleClick}
    >
      <FaWhatsapp className="h-4 w-4" />
    </Button>
  )
}
