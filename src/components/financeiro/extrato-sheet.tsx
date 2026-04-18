'use client'

import { useRef, useState } from 'react'
import { Member, LancamentoWithSessao } from '@/lib/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Share2, Link2, Check } from 'lucide-react'
import { ExtratoTicket } from './extrato-ticket'

/**
 * ExtratoSheet — Sheet wrapper around ExtratoTicket.
 *
 * Props:
 *   member        — the member whose statement is shown
 *   lancamentos   — all member lancamentos, pre-sorted oldest→newest
 *   saldo         — pre-computed balance (totalCredito − debitoPendente)
 *   open          — controls Sheet visibility
 *   onOpenChange  — Sheet open/close callback
 */
interface ExtratoSheetProps {
  member: Member
  lancamentos: LancamentoWithSessao[]
  saldo: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtratoSheet({
  member,
  lancamentos,
  saldo,
  open,
  onOpenChange,
}: ExtratoSheetProps) {
  const ticketRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const emissao = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // -------------------------------------------------------------------------
  // Share: capture ticket as PNG → Web Share API → fallback download
  // -------------------------------------------------------------------------
  async function handleShare() {
    if (!ticketRef.current) return

    // Dynamic import to avoid SSR issues.
    // html-to-image handles modern CSS color functions (oklch, lab) unlike html2canvas.
    const { toPng } = await import('html-to-image')

    const dataUrl = await toPng(ticketRef.current, { pixelRatio: 2, skipFonts: true })

    // Convert data URL → Blob → File
    const blob = await (await fetch(dataUrl)).blob()
    const fileName = `extrato-${member.nome.toLowerCase().replace(/\s+/g, '-')}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    // Try Web Share API first (works on mobile, opens WhatsApp/others)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Extrato — ${member.nome}`,
        })
        return
      } catch {
        // User cancelled or share failed — fall through to download
      }
    }

    // Fallback: download as PNG (desktop browsers)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  // -------------------------------------------------------------------------
  // Copy link: copies public extrato URL to clipboard, 2s feedback
  // -------------------------------------------------------------------------
  async function handleCopyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/extrato/${member.id}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        {/* ---------------------------------------------------------------- */}
        {/* Sheet header — title + action buttons (outside ticket, not exported) */}
        {/* ---------------------------------------------------------------- */}
        <SheetHeader className="flex flex-row items-center justify-between pr-10 pb-2">
          <SheetTitle className="text-base">Extrato — {member.nome}</SheetTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleCopyLink}
              title="Copiar link do extrato"
              aria-label="Copiar link do extrato"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  Copiar link
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleShare}
              title="Compartilhar extrato"
              aria-label="Compartilhar extrato"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar
            </Button>
          </div>
        </SheetHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Ticket — rendered via ExtratoTicket; ref used by html-to-image   */}
        {/* ---------------------------------------------------------------- */}
        <div className="mx-6 mt-2 mb-6">
          <ExtratoTicket
            ref={ticketRef}
            member={member}
            lancamentos={lancamentos}
            saldo={saldo}
            emissao={emissao}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
