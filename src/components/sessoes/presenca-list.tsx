'use client'

import { MemberWithCargos, PresencaSessao } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { togglePresencaSessao } from '@/app/actions/presencas'
import { toast } from 'sonner'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PresencaListProps {
  sessaoId: string
  members: MemberWithCargos[]
  presencas: PresencaSessao[]
}

export function PresencaList({ sessaoId, members, presencas }: PresencaListProps) {
  const router = useRouter()
  const presenteIds = new Set(presencas.map((p) => p.member_id))
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggle(memberId: string, checked: boolean) {
    setLoading(memberId)
    const result = await togglePresencaSessao(sessaoId, memberId, checked)
    if (result?.error) {
      toast.error(result.error)
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  const ativos = members.filter((m) => m.ativo)
  const total = ativos.length
  const presentes = ativos.filter((m) => presenteIds.has(m.id)).length

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {presentes} de {total} membros ativos presentes
      </p>
      <div className="space-y-2">
        {ativos.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50">
            <Checkbox
              id={`presenca-${member.id}`}
              checked={presenteIds.has(member.id)}
              disabled={loading === member.id}
              onCheckedChange={(checked) => handleToggle(member.id, !!checked)}
            />
            <Label htmlFor={`presenca-${member.id}`} className="cursor-pointer flex-1">
              <div className="flex flex-col">
                <span
                  className="font-medium"
                  style={{
                    color: [...member.member_cargos]
                      .sort((a, b) => a.cargos.ordem - b.cargos.ordem)[0]?.cargos.cor,
                  }}
                >
                  {member.nome}
                </span>
                {member.nome_historico && (
                  <span className="text-xs text-muted-foreground/70">{member.nome_historico}</span>
                )}
              </div>
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
