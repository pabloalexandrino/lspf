import { Member, Grau } from '@/lib/types'
import { CargoBadge } from './cargo-badge'
import { ProgressionTimeline } from './progression-timeline'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

const GRAU_COLORS: Record<Grau, string> = {
  MI: '#7c3aed',
  MM: '#1e3a5f',
  CM: '#16a34a',
  AM: '#ea580c',
  C:  '#6b7280',
}

interface MembersCardsProps {
  members: Member[]
  onEdit: (member: Member) => void
}

export function MembersCards({ members, onEdit }: MembersCardsProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Nenhum membro encontrado
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => {
        const borderColor = member.cargo?.cor ?? '#6b7280'
        const grauColor = member.grau ? GRAU_COLORS[member.grau] : '#6b7280'

        return (
          <div
            key={member.id}
            className="relative rounded-lg border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors"
            style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}
          >
            {/* Estrela de Fundador */}
            {member.fundador && (
              <span
                className="absolute top-3 right-3 text-base leading-none"
                style={{ color: '#d4a834' }}
                title="Fundador"
              >
                ★
              </span>
            )}

            {/* Header: Nº + badges */}
            <div className="flex items-center gap-2 flex-wrap pr-6">
              {member.numero && (
                <span className="text-xs font-mono text-muted-foreground font-medium">
                  #{member.numero}
                </span>
              )}
              {member.grau && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${grauColor}25`,
                    color: grauColor,
                    border: `1px solid ${grauColor}50`,
                  }}
                >
                  {member.grau}
                </span>
              )}
              {member.cargo && <CargoBadge cargo={member.cargo} />}
            </div>

            {/* Nome */}
            <div>
              <p className="font-semibold text-foreground leading-snug">{member.nome}</p>
              {member.nome_historico && (
                <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                  {member.nome_historico}
                </p>
              )}
            </div>

            {/* Detalhes */}
            <div className="space-y-0.5">
              {member.funcao && (
                <p className="text-xs text-muted-foreground">{member.funcao}</p>
              )}
              {(member.cidade || member.profissao) && (
                <p className="text-xs text-muted-foreground">
                  {[member.cidade, member.profissao].filter(Boolean).join(' · ')}
                </p>
              )}
              {member.cim && (
                <p className="text-xs font-mono text-muted-foreground">
                  CIM: {member.cim}
                </p>
              )}
            </div>

            {/* Progressão */}
            <ProgressionTimeline
              data_am={member.data_am}
              data_cm={member.data_cm}
              data_mm={member.data_mm}
              data_cm_prev={member.data_cm_prev}
              data_mm_prev={member.data_mm_prev}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {member.fundador
                  ? 'Fundador'
                  : member.turma != null
                    ? `Turma ${member.turma}`
                    : ''}
                {member.grau === 'C' && member.indicado_por && (
                  <span className="block text-muted-foreground/60">
                    Indicado por: {member.indicado_por}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    member.ativo ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.ativo ? 'bg-green-500' : 'bg-muted-foreground'
                    }`}
                  />
                  {member.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onEdit(member)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
