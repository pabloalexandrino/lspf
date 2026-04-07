'use client'

import { useState } from 'react'
import { Member } from '@/lib/types'
import { criarCobranca } from '@/app/actions/cobranca'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CobrancaSheetProps {
  members: Member[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CobrancaSheet({ members, open, onOpenChange }: CobrancaSheetProps) {
  const router = useRouter()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setDescricao('')
    setValor('')
    setSelected(new Set())
  }

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === members.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(members.map((m) => m.id)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (selected.size === 0) {
      toast.error('Selecione ao menos um membro')
      return
    }

    setLoading(true)
    const result = await criarCobranca(descricao, valorNum, Array.from(selected))
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(`Cobrança criada para ${result.count} membro(s)`)
      onOpenChange(false)
      resetForm()
      router.refresh()
    }
    setLoading(false)
  }

  const allSelected = members.length > 0 && selected.size === members.length

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Cobrança</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cob-descricao">Descrição</Label>
            <Input
              id="cob-descricao"
              placeholder="Ex: Rateio aluguel ônibus — Iniciação 2026"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cob-valor">Valor por membro (R$)</Label>
            <Input
              id="cob-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Membros ({selected.size}/{members.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={toggleAll}
              >
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-md p-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-secondary/50 text-sm"
                >
                  <Checkbox
                    checked={selected.has(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  <span>{m.nome}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || selected.size === 0}
          >
            {loading
              ? 'Criando...'
              : `Criar Cobrança${selected.size > 0 ? ` (${selected.size} membros)` : ''}`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
