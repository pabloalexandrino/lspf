'use client'

import { useState } from 'react'
import { Caixa, Member, Sessao } from '@/lib/types'
import { registrarSaida } from '@/app/actions/saidas-caixa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { TrendingDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SaidaCaixaSheetProps {
  caixa: Caixa
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
  members: Pick<Member, 'id' | 'nome'>[]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function SaidaCaixaSheet({ caixa, sessoes, members }: SaidaCaixaSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataPagamento, setDataPagamento] = useState(today())
  const [sessaoId, setSessaoId] = useState('')
  const [memberId, setMemberId] = useState('')

  function resetForm() {
    setDescricao('')
    setValor('')
    setDataPagamento(today())
    setSessaoId('')
    setMemberId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await registrarSaida({
      caixa_id: caixa.id,
      descricao,
      valor,
      data_pagamento: dataPagamento,
      sessao_id: sessaoId || undefined,
      member_id: memberId || undefined,
    })

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Saída registrada!')
      resetForm()
      setOpen(false)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <TrendingDown className="h-4 w-4 mr-2" />
        Registrar Saída
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nova Saída — {caixa.nome}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Compra de bebidas ágape"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data *</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessao_id">Sessão relacionada (opcional)</Label>
              <select
                id="sessao_id"
                value={sessaoId}
                onChange={(e) => setSessaoId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Nenhuma —</option>
                {sessoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data} {s.descricao ? `— ${s.descricao}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_id">Membro relacionado (opcional)</Label>
              <select
                id="member_id"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Nenhum —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Saída'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
