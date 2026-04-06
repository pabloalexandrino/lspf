'use client'

import { useState } from 'react'
import { Member, Caixa, LancamentoWithSessao } from '@/lib/types'
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { DepositoSheet } from './deposito-sheet'
import { formatCurrency } from '@/lib/utils'
import { marcarPagoLote, usarCreditoWallet } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck, CreditCard, PlusCircle, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface MemberWalletsTableProps {
  members: MemberWithLancamentos[]
  caixas: Caixa[]
}

export function MemberWalletsTable({ members, caixas }: MemberWalletsTableProps) {
  const router = useRouter()
  const [sheetMember, setSheetMember] = useState<MemberWithLancamentos | null>(null)
  const [depositoMember, setDepositoMember] = useState<MemberWithLancamentos | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Pre-compute stats for all members (saldo is used for wallet credit check)
  const membersWithStats = members.map((m) => {
    const debitoPendente = m.lancamentos.filter((l) => !l.pago && !l.compensado).reduce((s, l) => s + l.valor, 0)
    // Exclude 'compensacao' entries (negative bookkeeping) so the display shows actual cash/deposits paid
    const totalPago = m.lancamentos.filter((l) => l.pago && l.tipo !== 'compensacao').reduce((s, l) => s + l.valor, 0)
    // Saldo uses full credit (includes negative compensacoes) minus pending debts
    // Wallet balance = only deposits and compensations (not cash payments like mensalidade)
    const totalCredito = m.lancamentos
      .filter((l) => l.pago && (l.tipo === 'deposito' || l.tipo === 'compensacao'))
      .reduce((s, l) => s + l.valor, 0)
    const saldo = totalCredito - debitoPendente
    return { ...m, debitoPendente, totalPago, totalCredito, saldo }
  })

  const pendentesReais = sheetMember?.lancamentos.filter((l) => !l.pago && !l.compensado) ?? []
  const compensados = sheetMember?.lancamentos.filter((l) => l.compensado) ?? []

  // Gross wallet balance (sum of all pago=true entries, including negative compensacoes).
  // We intentionally do NOT subtract pending debits here — pending debts haven't been
  // deducted from the wallet yet. The wallet has this much cash available to compensate.
  const creditoDisponivel = sheetMember
    ? (membersWithStats.find((m) => m.id === sheetMember.id)?.totalCredito ?? 0)
    : 0

  // Total value of currently selected lancamentos
  const valorSelecionado = pendentesReais
    .filter((l) => selected.has(l.id))
    .reduce((s, l) => s + l.valor, 0)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openSheet(member: MemberWithLancamentos) {
    setSheetMember(member)
    setSelected(new Set())
  }

  async function handleRegistrarPagamento() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarPagoLote(Array.from(selected), true)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamento(s) marcado(s) como pago(s)`)
      setSheetMember(null)
      router.refresh()
    }
    setLoading(false)
  }

  // Handler for wallet credit flow — calls the Postgres function via server action
  async function handleUsarCredito() {
    if (selected.size === 0 || !sheetMember) return
    setLoading(true)
    const result = await usarCreditoWallet(sheetMember.id, Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamento(s) compensado(s) pelo crédito da wallet`)
      setSheetMember(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead className="hidden sm:table-cell">Nome Histórico</TableHead>
              <TableHead>Débito Pendente</TableHead>
              <TableHead className="hidden md:table-cell">Total Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersWithStats.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-sm">{m.nome}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {m.nome_historico ?? '—'}
                </TableCell>
                <TableCell className="text-sm">
                  <span className={m.debitoPendente > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {formatCurrency(m.debitoPendente)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-green-500">
                  {formatCurrency(m.totalPago)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={m.saldo < 0 ? 'destructive' : 'default'}
                    className={cn('text-xs', m.saldo >= 0 && 'bg-green-500/20 text-green-600')}
                  >
                    {formatCurrency(m.saldo)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <WhatsAppButton
                    member={m}
                    lancamentos={m.lancamentos}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDepositoMember(m)}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Adicionar crédito
                    </Button>
                    {m.debitoPendente > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openSheet(m)}
                      >
                        <Wallet className="h-3 w-3 mr-1" />
                        Registrar pagamento
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Deposito sheet — opens from "Adicionar crédito" button */}
      {depositoMember && (
        <DepositoSheet
          member={depositoMember}
          caixas={caixas}
          depositos={depositoMember.lancamentos.filter((l) => l.tipo === 'deposito')}
          open={!!depositoMember}
          onOpenChange={(open) => { if (!open) setDepositoMember(null) }}
        />
      )}

      <Sheet open={!!sheetMember} onOpenChange={(open) => !open && setSheetMember(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lançamentos pendentes — {sheetMember?.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {pendentesReais.length === 0 && compensados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pendentesReais.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-3 p-2 rounded border border-border cursor-pointer hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggleSelect(l.id)}
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{l.descricao ?? l.tipo}</p>
                        <p className="text-muted-foreground text-xs capitalize">{l.tipo}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(l.valor)}</span>
                    </label>
                  ))}
                </div>

                {compensados.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Compensados por crédito</p>
                    {compensados.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted/30">
                        <div className="flex items-center gap-2 flex-1 text-sm">
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Compensado</Badge>
                          <span className="text-muted-foreground">{l.descricao ?? l.tipo}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatCurrency(l.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selecionado:</span>
                    <span className="font-medium">
                      {formatCurrency(valorSelecionado)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={selected.size === 0 || loading}
                      onClick={handleRegistrarPagamento}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      {loading ? 'Registrando...' : 'Pagar em dinheiro'}
                    </Button>

                    {creditoDisponivel > 0 && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={selected.size === 0 || loading || valorSelecionado > creditoDisponivel}
                          onClick={handleUsarCredito}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {loading ? 'Processando...' : 'Usar crédito da wallet'}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Crédito disponível: {formatCurrency(creditoDisponivel)}
                          {valorSelecionado > creditoDisponivel && (
                            <span className="text-destructive ml-1">— insuficiente para a seleção</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
