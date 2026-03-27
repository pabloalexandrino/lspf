'use client'

import { useState, useMemo } from 'react'
import { Lancamento, Member, Sessao } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { marcarPago, marcarPagoLote } from '@/app/actions/financeiro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

type LancamentoEnriched = Lancamento & {
  member?: Member
  sessao?: Sessao
}

interface LancamentosTableProps {
  lancamentos: LancamentoEnriched[]
  members: Member[]
  sessoes: Sessao[]
}

export function LancamentosTable({ lancamentos, members, sessoes }: LancamentosTableProps) {
  const router = useRouter()
  const [filterMember, setFilterMember] = useState('all')
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSessao, setFilterSessao] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filterMember !== 'all' && l.member_id !== filterMember) return false
      if (filterTipo !== 'all' && l.tipo !== filterTipo) return false
      if (filterStatus === 'pago' && !l.pago) return false
      if (filterStatus === 'pendente' && l.pago) return false
      if (filterSessao !== 'all' && l.sessao_id !== filterSessao) return false
      return true
    })
  }, [lancamentos, filterMember, filterTipo, filterStatus, filterSessao])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((l) => l.id)))
    }
  }

  async function handleMarcarPagoLote() {
    if (selected.size === 0) return
    setLoading(true)
    const result = await marcarPagoLote(Array.from(selected), true)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selected.size} lançamentos marcados como pagos`)
      setSelected(new Set())
      router.refresh()
    }
    setLoading(false)
  }

  async function handleTogglePago(id: string, pago: boolean) {
    const result = await marcarPago(id, !pago)
    if (result?.error) {
      toast.error(result.error)
    } else {
      router.refresh()
    }
  }

  const tipoBadgeVariant = (tipo: string) => {
    if (tipo === 'sessao') return 'secondary'
    if (tipo === 'agape') return 'default'
    return 'outline'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterMember} onValueChange={(v) => setFilterMember(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Membro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os membros</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="sessao">Sessão</SelectItem>
            <SelectItem value="agape">Ágape</SelectItem>
            <SelectItem value="produto">Produto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSessao} onValueChange={(v) => setFilterSessao(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sessão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as sessões</SelectItem>
            {sessoes.map((s) => (
              <SelectItem key={s.id} value={s.id}>{formatDate(s.data)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <Button size="sm" onClick={handleMarcarPagoLote} disabled={loading}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Marcar {selected.size} como pago
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Membro</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Sessão</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum lançamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id} className={l.pago ? 'opacity-60' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(l.id)}
                      onCheckedChange={() => toggleSelect(l.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.member?.nome ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={tipoBadgeVariant(l.tipo) as 'secondary' | 'default' | 'outline'} className="text-xs capitalize">
                      {l.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {l.descricao ?? '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {l.sessao ? formatDate(l.sessao.data) : '—'}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(l.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                      {l.pago ? 'Pago' : 'Pendente'}
                    </Badge>
                    {l.pago && l.data_pagamento && (
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(l.data_pagamento)}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePago(l.id, l.pago)}
                      className="text-xs"
                    >
                      {l.pago ? 'Desfazer' : 'Pagar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} lançamento(s) — Total: {formatCurrency(filtered.reduce((s, l) => s + l.valor, 0))} — Pendente: {formatCurrency(filtered.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0))}
      </p>
    </div>
  )
}
