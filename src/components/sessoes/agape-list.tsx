'use client'

import { Member, PresencaSessao, PresencaAgape } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { togglePresencaAgape } from '@/app/actions/presencas'
import { toast } from 'sonner'
import { useState } from 'react'

interface AgapeListProps {
  sessaoId: string
  members: Member[]
  presencasSessao: PresencaSessao[]
  presencasAgape: PresencaAgape[]
}

export function AgapeList({ sessaoId, members, presencasSessao, presencasAgape }: AgapeListProps) {
  const presenteIds = new Set(presencasSessao.map((p) => p.member_id))
  const agapeIds = new Set(presencasAgape.map((p) => p.member_id))
  const [loading, setLoading] = useState<string | null>(null)

  const membersPresentes = members.filter((m) => presenteIds.has(m.id))

  async function handleToggle(memberId: string, checked: boolean) {
    setLoading(memberId)
    const result = await togglePresencaAgape(sessaoId, memberId, checked)
    if (result?.error) toast.error(result.error)
    setLoading(null)
  }

  if (membersPresentes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro marcado como presente na sessão ainda.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {agapeIds.size} de {membersPresentes.length} presentes participarão do ágape
      </p>
      <div className="space-y-2">
        {membersPresentes.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50">
            <Checkbox
              id={`agape-${member.id}`}
              checked={agapeIds.has(member.id)}
              disabled={loading === member.id}
              onCheckedChange={(checked) => handleToggle(member.id, !!checked)}
            />
            <Label htmlFor={`agape-${member.id}`} className="cursor-pointer">
              {member.nome}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
