'use client'

import { useState } from 'react'
import { Lancamento, Member, PresencaSessao, PresencaAgape, ConsumoProduto, Produto, Sessao } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { gerarLancamentos } from '@/app/actions/financeiro'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle } from 'lucide-react'

interface ResumoFinanceiroProps {
  sessao: Sessao
  members: Member[]
  presencasSessao: PresencaSessao[]
  presencasAgape: PresencaAgape[]
  consumos: (ConsumoProduto & { produto?: Produto })[]
  lancamentos: (Lancamento & { member?: Member })[]
}

export function ResumoFinanceiro({
  sessao,
  members,
  presencasSessao,
  presencasAgape,
  consumos,
  lancamentos,
}: ResumoFinanceiroProps) {
  const [loading, setLoading] = useState(false)

  const presentes = presencasSessao.length
  const agapeCount = presencasAgape.length
  const custoExtra = Number(sessao.custo_extra) || 0

  // Preview calculations
  const custoPorPessoa =
    custoExtra > 0 && presentes > 0
      ? sessao.tem_agape
        ? agapeCount > 0 ? custoExtra / agapeCount : 0
        : custoExtra / presentes
      : 0

  const totalConsumos = consumos.reduce(
    (sum, c) => sum + (c.produto?.preco ?? 0) * c.quantidade,
    0
  )

  const totalLancamentos = lancamentos.reduce((sum, l) => sum + l.valor, 0)
  const totalPago = lancamentos.filter((l) => l.pago).reduce((sum, l) => sum + l.valor, 0)
  const totalPendente = totalLancamentos - totalPago

  async function handleGerar() {
    setLoading(true)
    const result = await gerarLancamentos(sessao.id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.count} lançamentos gerados!`)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="p-4 rounded-lg border border-border space-y-2">
        <h3 className="font-medium text-sm">Prévia dos Custos</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Presentes na sessão:</span>
          <span>{presentes} membros</span>
          {sessao.tem_agape && (
            <>
              <span className="text-muted-foreground">Presentes no ágape:</span>
              <span>{agapeCount} membros</span>
            </>
          )}
          {custoExtra > 0 && (
            <>
              <span className="text-muted-foreground">Custo extra total:</span>
              <span>{formatCurrency(custoExtra)}</span>
              <span className="text-muted-foreground">Custo por pessoa:</span>
              <span>{formatCurrency(custoPorPessoa)}</span>
            </>
          )}
          <span className="text-muted-foreground">Total consumos individuais:</span>
          <span>{formatCurrency(totalConsumos)}</span>
        </div>
      </div>

      {/* Generate button */}
      <Button onClick={handleGerar} disabled={loading} className="w-full">
        {loading ? (
          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
        ) : lancamentos.length > 0 ? (
          <><RefreshCw className="h-4 w-4 mr-2" />Regenerar Lançamentos</>
        ) : (
          <><CheckCircle className="h-4 w-4 mr-2" />Gerar Lançamentos</>
        )}
      </Button>

      {lancamentos.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total lançado:</span>
            <span className="font-medium">{formatCurrency(totalLancamentos)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pago:</span>
            <span className="text-green-500">{formatCurrency(totalPago)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pendente:</span>
            <span className="text-destructive">{formatCurrency(totalPendente)}</span>
          </div>
        </div>
      )}

      {/* Lancamentos table */}
      {lancamentos.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.member?.nome ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{l.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.descricao}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(l.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={l.pago ? 'default' : 'secondary'} className="text-xs">
                      {l.pago ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
