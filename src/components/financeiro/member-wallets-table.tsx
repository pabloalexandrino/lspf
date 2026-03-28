'use client'

import { useState } from 'react'
import { Member, LancamentoWithSessao } from '@/lib/types'
import { WhatsAppButton } from '@/components/members/whatsapp-button'
import { formatCurrency } from '@/lib/utils'
import { marcarPagoLote } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MemberWithLancamentos extends Member {
  lancamentos: LancamentoWithSessao[]
}

interface MemberWalletsTableProps {
  members: MemberWithLancamentos[]
}

export function MemberWalletsTable({ members }: MemberWalletsTableProps) {
  const router = useRouter()
  const [sheetMember, setSheetMember] = useState<MemberWithLancamentos | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const pendentes = sheetMember?.lancamentos.filter((l) => !l.pago) ?? []

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

  const membersWithStats = members.map((m) => {
    const debitoPendente = m.lancamentos.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0)
    const totalPago = m.lancamentos.filter((l) => l.pago).reduce((s, l) => s + l.valor, 0)
    const totalLancado = m.lancamentos.reduce((s, l) => s + l.valor, 0)
    const saldo = totalPago - totalLancado
    return { ...m, debitoPendente, totalPago, saldo }
  })

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
                  {m.debitoPendente > 0
                    ? <span className="text-destructive">{formatCurrency(m.debitoPendente)}</span>
                    : '—'}
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
                    lancamentos={m.lancamentos.filter((l) => !l.pago)}
                  />
                </TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!sheetMember} onOpenChange={(open) => !open && setSheetMember(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Lançamentos pendentes — {sheetMember?.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {pendentes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento pendente.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pendentes.map((l) => (
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

                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selecionado:</span>
                    <span className="font-medium">
                      {formatCurrency(pendentes.filter((l) => selected.has(l.id)).reduce((s, l) => s + l.valor, 0))}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={selected.size === 0 || loading}
                    onClick={handleRegistrarPagamento}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {loading ? 'Registrando...' : `Confirmar ${selected.size} pagamento(s)`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
