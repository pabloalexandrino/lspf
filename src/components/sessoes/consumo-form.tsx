'use client'

import { useState } from 'react'
import { Member, Produto, ConsumoProduto, PresencaSessao } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { upsertConsumoProduto, removeConsumoProduto } from '@/app/actions/presencas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

interface ConsumoFormProps {
  sessaoId: string
  members: Member[]
  produtos: Produto[]
  consumos: (ConsumoProduto & { produto?: Produto })[]
  presencasSessao: PresencaSessao[]
}

export function ConsumoForm({ sessaoId, members, produtos, consumos, presencasSessao }: ConsumoFormProps) {
  const presenteIds = new Set(presencasSessao.map((p) => p.member_id))
  const membersPresentes = members.filter((m) => presenteIds.has(m.id))
  const produtosAtivos = produtos.filter((p) => p.ativo)

  const [selectedMember, setSelectedMember] = useState('')
  const [selectedProduto, setSelectedProduto] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!selectedMember || !selectedProduto) {
      toast.error('Selecione membro e produto')
      return
    }
    setLoading(true)
    const result = await upsertConsumoProduto(sessaoId, selectedMember, selectedProduto, quantidade)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Consumo registrado')
      setSelectedMember('')
      setSelectedProduto('')
      setQuantidade(1)
    }
    setLoading(false)
  }

  async function handleRemove(id: string) {
    const result = await removeConsumoProduto(id, sessaoId)
    if (result?.error) toast.error(result.error)
  }

  // Group consumos by member
  const consumosByMember = membersPresentes.map((member) => ({
    member,
    consumos: consumos.filter((c) => c.member_id === member.id),
  })).filter((g) => g.consumos.length > 0)

  return (
    <div className="space-y-6">
      {/* Add consumption form */}
      <div className="p-4 rounded-lg border border-border space-y-3">
        <h3 className="text-sm font-medium">Registrar Consumo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={selectedMember} onValueChange={(v) => setSelectedMember(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Membro..." />
            </SelectTrigger>
            <SelectContent>
              {membersPresentes.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProduto} onValueChange={(v) => setSelectedProduto(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Produto..." />
            </SelectTrigger>
            <SelectContent>
              {produtosAtivos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome} — {formatCurrency(p.preco)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="w-20"
            />
            <Button onClick={handleAdd} disabled={loading} size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Consumos by member */}
      {consumosByMember.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum consumo registrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {consumosByMember.map(({ member, consumos: memberConsumos }) => (
            <div key={member.id} className="p-3 rounded-lg border border-border">
              <p className="font-medium text-sm mb-2">{member.nome}</p>
              <div className="space-y-1">
                {memberConsumos.map((consumo) => (
                  <div key={consumo.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {consumo.produto?.nome ?? 'Produto'} × {consumo.quantidade}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency((consumo.produto?.preco ?? 0) * consumo.quantidade)}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(consumo.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
