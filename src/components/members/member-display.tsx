import { Member } from '@/lib/types'

interface MemberDisplayProps {
  member: Pick<Member, 'nome' | 'nome_historico'>
}

export function MemberDisplay({ member }: MemberDisplayProps) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{member.nome}</span>
      {member.nome_historico && (
        <span className="text-xs text-muted-foreground/70 font-normal">
          {member.nome_historico}
        </span>
      )}
    </div>
  )
}
