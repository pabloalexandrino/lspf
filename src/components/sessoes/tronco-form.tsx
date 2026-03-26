'use client'

import { useState } from 'react'
import { TroncoSolidariedade } from '@/lib/types'
import { salvarTronco } from '@/app/actions/financeiro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Save, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TroncoFormProps {
  sessaoId: string
  tronco: TroncoSolidariedade | null
}

export function TroncoForm({ sessaoId, tronco }: TroncoFormProps) {
  const router = useRouter()
  const [valor, setValor] = useState(tronco ? String(tronco.valor) : '')
  const [observacao, setObservacao] = useState(tronco?.observacao ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSalvar() {
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum < 0) {
      toast.error('Valor inválido')
      return
    }
    setLoading(true)
    const result = await salvarTronco(sessaoId, valorNum, observacao)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Tronco de solidariedade salvo!')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {tronco && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-600">
            Registrado: <strong>{formatCurrency(tronco.valor)}</strong>
            {tronco.observacao && ` — ${tronco.observacao}`}
          </span>
        </div>
      )}

      <div className="space-y-3 max-w-sm">
        <div className="space-y-1">
          <Label htmlFor="tronco-valor">Valor (R$)</Label>
          <Input
            id="tronco-valor"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="tronco-obs">Observação (opcional)</Label>
          <Input
            id="tronco-obs"
            placeholder="Ex: arrecadado na sessão ordinária"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <Button onClick={handleSalvar} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : tronco ? 'Atualizar' : 'Registrar'}
        </Button>
      </div>
    </div>
  )
}
