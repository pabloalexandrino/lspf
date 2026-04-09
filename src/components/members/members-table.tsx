'use client'

import { Member, Grau, LancamentoWithSessao } from '@/lib/types'
import { CargoBadge } from './cargo-badge'
import { ProgressionTimeline } from './progression-timeline'
import { WhatsAppButton } from './whatsapp-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2 } from 'lucide-react'

const GRAU_COLORS: Record<Grau, string> = {
  MI: '#7c3aed',
  MM: '#1e3a5f',
  CM: '#16a34a',
  AM: '#ea580c',
  C:  '#6b7280',
}

interface MembersTableProps {
  members: Member[]
  lancamentos: LancamentoWithSessao[]
  onEdit: (member: Member) => void
  onDelete: (id: string) => void
}

export function MembersTable({ members, lancamentos, onEdit, onDelete }: MembersTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-md border border-border">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                Nenhum membro encontrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Irmão</TableHead>
            <TableHead className="hidden md:table-cell w-16">Grau</TableHead>
            <TableHead className="hidden lg:table-cell">Cargo</TableHead>
            <TableHead className="hidden xl:table-cell">Função</TableHead>
            <TableHead className="hidden xl:table-cell">Cidade</TableHead>
            <TableHead className="hidden lg:table-cell w-20">CIM</TableHead>
            <TableHead className="hidden md:table-cell w-24">Progressão</TableHead>
            <TableHead className="w-20">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const grauColor = member.grau ? GRAU_COLORS[member.grau] : null
            const memberLancamentos = lancamentos.filter(l => l.member_id === member.id)

            return (
              <TableRow key={member.id}>
                {/* Irmão */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground text-sm">{member.nome}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {member.nome_historico && (
                        <span className="text-xs text-muted-foreground/60 italic">
                          {member.nome_historico}
                        </span>
                      )}
                      {member.fundador && (
                        <span
                          className="text-[9px] font-bold tracking-widest px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: '#d4a83430',
                            color: '#d4a834',
                            border: '1px solid #d4a83460',
                          }}
                        >
                          FUND.
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Grau */}
                <TableCell className="hidden md:table-cell">
                  {member.grau && grauColor ? (
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
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Cargo */}
                <TableCell className="hidden lg:table-cell">
                  {member.cargo
                    ? <CargoBadge cargo={member.cargo} />
                    : <span className="text-muted-foreground text-sm">—</span>
                  }
                </TableCell>

                {/* Função */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {member.funcao ?? '—'}
                  </span>
                </TableCell>

                {/* Cidade */}
                <TableCell className="hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {member.cidade ?? '—'}
                  </span>
                </TableCell>

                {/* CIM */}
                <TableCell className="hidden lg:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">
                    {member.cim ?? '—'}
                  </span>
                </TableCell>

                {/* Progressão */}
                <TableCell className="hidden md:table-cell">
                  <ProgressionTimeline
                    data_am={member.data_am}
                    data_cm={member.data_cm}
                    data_mm={member.data_mm}
                    data_cm_prev={member.data_cm_prev}
                    data_mm_prev={member.data_mm_prev}
                  />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={member.ativo ? 'default' : 'secondary'} className="text-xs">
                    {member.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1">
                    <WhatsAppButton
                      member={member}
                      lancamentos={memberLancamentos}
                    />
                    <Button variant="ghost" size="sm" onClick={() => onEdit(member)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(member.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
