'use client'

import { useState } from 'react'
import { Caixa, Member, Sessao } from '@/lib/types'
import { registrarEntrada } from '@/app/actions/saidas-caixa'
import { registrarDeposito } from '@/app/actions/deposito'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EntradaCaixaSheetProps {
  caixa: Caixa
  sessoes: Pick<Sessao, 'id' | 'data' | 'descricao'>[]
  members?: Pick<Member, 'id' | 'nome'>[]
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EntradaCaixaSheet({ caixa, sessoes, members }: EntradaCaixaSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<'deposito' | 'oferta' | 'outro'>('deposito')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataPagamento, setDataPagamento] = useState(today())
  const [sessaoId, setSessaoId] = useState('')
  const [memberId, setMemberId] = useState('')

  function resetForm() {
    setTipo('deposito')
    setDescricao('')
    setValor('')
    setDataPagamento(today())
    setSessaoId('')
    setMemberId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // When tipo is 'deposito' and a member is selected, register as wallet deposit
    let result
    if (tipo === 'deposito' && memberId) {
      result = await registrarDeposito(
        memberId,
        parseFloat(valor),
        dataPagamento,
        descricao || 'Depósito antecipado',
        caixa.id
      )
    } else {
      result = await registrarEntrada({
        caixa_id: caixa.id,
        tipo,
        descricao,
        valor,
        data_pagamento: dataPagamento,
        sessao_id: sessaoId || undefined,
      })
    }

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Entrada registrada!')
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
        className="w-full border-green-600 text-green-600 hover:bg-green-600/10"
        onClick={() => setOpen(true)}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Registrar Entrada
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nova Entrada — {caixa.nome}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'deposito' | 'oferta' | 'outro')}
                className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm"
              >
                <option value="deposito">Depósito</option>
                <option value="oferta">Oferta</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Optional member selector — only shown when tipo is 'deposito' */}
            {tipo === 'deposito' && members && members.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="member_id">Membro (opcional)</Label>
                <select
                  id="member_id"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm"
                >
                  <option value="">— Nenhum —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Rendimento mensal"
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
                className="w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm"
              >
                <option value="">— Nenhuma —</option>
                {sessoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data} {s.descricao ? `— ${s.descricao}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
