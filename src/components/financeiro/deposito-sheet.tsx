'use client'

import { useState } from 'react'
import { Member, Caixa } from '@/lib/types'
import { registrarDeposito } from '@/app/actions/deposito'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DepositoSheetProps {
  member: Member
  caixas: Caixa[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DepositoSheet({ member, caixas, open, onOpenChange }: DepositoSheetProps) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const [valor, setValor] = useState('')
  const [data, setData] = useState(today)
  const [descricao, setDescricao] = useState('Depósito antecipado')
  const [caixaId, setCaixaId] = useState<string | null>('none')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setValor('')
    setData(today)
    setDescricao('Depósito antecipado')
    setCaixaId('none')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setLoading(true)
    const result = await registrarDeposito(
      member.id,
      valorNum,
      data,
      descricao || 'Depósito antecipado',
      caixaId === 'none' ? null : caixaId
    )

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Crédito de R$ ${valorNum.toFixed(2).replace('.', ',')} registrado para ${member.nome}`)
      onOpenChange(false)
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Registrar Depósito</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label>Membro</Label>
            <Input value={member.nome} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-valor">Valor (R$)</Label>
            <Input
              id="dep-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-data">Data</Label>
            <Input
              id="dep-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dep-descricao">Descrição</Label>
            <Input
              id="dep-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Caixa</Label>
            <Select value={caixaId} onValueChange={setCaixaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar caixa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {caixas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Crédito'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
