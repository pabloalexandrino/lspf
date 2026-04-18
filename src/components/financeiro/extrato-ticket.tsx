'use client'

import { forwardRef, useState } from 'react'
import Image from 'next/image'
import { LancamentoWithSessao, Member } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'

const PIX_KEY = 'bardasabedoria@gmail.com'

/**
 * ExtratoTicket — pure visual ticket/comprovante for a member's wallet statement.
 *
 * Stateless, no Sheet, no buttons. Accepts a forwarded ref so the parent
 * (ExtratoSheet) can target this element for html-to-image capture.
 *
 * Props:
 *   member      — nome + nome_historico
 *   lancamentos — all lancamentos, pre-sorted oldest→newest
 *   saldo       — pre-computed balance (totalCredito − debitoPendente)
 *   emissao     — display date string; defaults to today in pt-BR
 */
export interface ExtratoTicketProps {
  member: Pick<Member, 'nome' | 'nome_historico'>
  lancamentos: LancamentoWithSessao[]
  saldo: number
  emissao?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves the best available date string for a lancamento */
function resolveDate(l: LancamentoWithSessao): string {
  const raw = l.data_pagamento ?? l.sessao?.data ?? l.created_at
  const normalized = raw.includes('T') ? raw : `${raw}T12:00:00`
  return new Date(normalized).toLocaleDateString('pt-BR')
}

/** Returns true for credit-type lancamentos (increase balance) */
function isCredit(tipo: LancamentoWithSessao['tipo'], valor: number): boolean {
  if (tipo === 'deposito') return valor > 0
  return tipo === 'compensacao'
}

/** Badge per lancamento type */
function TipoBadge({ tipo, valor }: { tipo: LancamentoWithSessao['tipo']; valor: number }) {
  if (tipo === 'deposito') {
    if (valor < 0) {
      return (
        <Badge className="text-xs bg-red-500/15 text-red-700 border border-red-300 hover:bg-red-500/15">
          Débito
        </Badge>
      )
    }
    return (
      <Badge className="text-xs bg-green-500/15 text-green-700 border border-green-300 hover:bg-green-500/15">
        Crédito
      </Badge>
    )
  }
  if (tipo === 'compensacao') {
    return (
      <Badge className="text-xs bg-blue-500/15 text-blue-700 border border-blue-300 hover:bg-blue-500/15">
        Compensação
      </Badge>
    )
  }
  return (
    <Badge className="text-xs bg-yellow-500/15 text-yellow-700 border border-yellow-300 hover:bg-yellow-500/15">
      Débito
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExtratoTicket = forwardRef<HTMLDivElement, ExtratoTicketProps>(
  function ExtratoTicket({ member, lancamentos, saldo, emissao }, ref) {
    const [pixCopied, setPixCopied] = useState(false)

    async function handleCopyPix() {
      await navigator.clipboard.writeText(PIX_KEY)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 2000)
    }

    const emissaoStr =
      emissao ??
      new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

    return (
      <div
        ref={ref}
        className="border border-dashed border-neutral-300 rounded-sm bg-white text-neutral-900"
      >
        {/* Ticket header */}
        <div className="px-4 pt-5 pb-4 text-center space-y-1 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={64}
            height={64}
            className="object-contain"
          />
          <p className="text-xs text-neutral-500">Extrato de Movimentações</p>
          <div className="pt-0.5">
            <p className="font-semibold text-sm">{member.nome}</p>
            {member.nome_historico && (
              <p className="text-xs text-neutral-500">{member.nome_historico}</p>
            )}
          </div>
          <p className="text-xs text-neutral-400">Emissão: {emissaoStr}</p>
        </div>

        {/* Dashed separator */}
        <div className="border-t border-dashed border-neutral-300 mx-3" />

        {/* Movimentações */}
        <div className="px-4 py-3">
          {lancamentos.length === 0 ? (
            <p className="text-center text-neutral-400 text-xs py-6">
              Sem movimentações registradas
            </p>
          ) : (
            <div className="space-y-0">
              {lancamentos.map((l, idx) => {
                const credit = isCredit(l.tipo, Number(l.valor))
                const dateStr = resolveDate(l)
                const isLast = idx === lancamentos.length - 1

                return (
                  <div
                    key={l.id}
                    className={cn(
                      'py-2',
                      !isLast && 'border-b border-dashed border-neutral-200'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: date + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-neutral-400 font-mono leading-tight">
                          {dateStr}
                        </p>
                        <p className="text-xs font-medium truncate leading-snug mt-0.5 text-neutral-800">
                          {l.descricao ?? l.tipo}
                        </p>
                      </div>

                      {/* Right: badge + value */}
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <TipoBadge tipo={l.tipo} valor={Number(l.valor)} />
                        <span
                          className={cn(
                            'text-xs font-bold tabular-nums font-mono',
                            credit ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {credit ? '+' : '−'}{formatCurrency(Math.abs(Number(l.valor)))}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dashed separator */}
        <div className="border-t border-dashed border-neutral-300 mx-3" />

        {/* PIX section */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 text-center">
            Pagamento via PIX
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xs text-neutral-700">{PIX_KEY}</span>
            <button
              type="button"
              onClick={handleCopyPix}
              aria-label="Copiar chave PIX"
              className="text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              {pixCopied
                ? <Check className="h-3.5 w-3.5 text-green-600" />
                : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {pixCopied && (
            <p className="text-[10px] text-green-600 text-center">Copiado!</p>
          )}
          <p className="text-[10px] text-neutral-400 text-center">
            Use esta chave para quitar débitos ou adicionar crédito
          </p>
        </div>

        {/* Dashed separator */}
        <div className="border-t border-dashed border-neutral-300 mx-3" />

        {/* Footer — saldo atual */}
        <div className="px-4 py-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Saldo atual
          </span>
          <span
            className={cn(
              'text-lg font-bold tabular-nums font-mono',
              saldo >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>
    )
  }
)
