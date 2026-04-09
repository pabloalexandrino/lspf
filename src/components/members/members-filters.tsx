'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Cargo, Grau } from '@/lib/types'
import { X, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export interface MembersFilterState {
  q: string
  graus: Grau[]
  turma: string
  cargo_id: string
  cidade: string
  status: 'ativo' | 'inativo' | 'todos'
}

interface MembersFiltersProps {
  filters: MembersFilterState
  allCargos: Cargo[]
  onChange: (filters: MembersFilterState) => void
}

const GRAU_OPTIONS: { value: Grau; label: string; cor: string }[] = [
  { value: 'MI', label: 'MI', cor: '#7c3aed' },
  { value: 'MM', label: 'MM', cor: '#1e3a5f' },
  { value: 'CM', label: 'CM', cor: '#16a34a' },
  { value: 'AM', label: 'AM', cor: '#ea580c' },
  { value: 'C',  label: 'C',  cor: '#6b7280' },
]

const TURMA_OPTIONS: { value: string; label: string }[] = [
  { value: '',         label: 'Todas' },
  { value: 'fundador', label: 'Fundadores' },
  { value: '1',        label: '1ª Turma' },
  { value: '2',        label: '2ª Turma' },
  { value: '3',        label: '3ª Turma' },
  { value: '4',        label: '4ª Turma' },
  { value: '5',        label: '5ª Turma' },
]

function hasActiveFilters(f: MembersFilterState): boolean {
  return (
    f.q !== '' ||
    f.graus.length > 0 ||
    f.turma !== '' ||
    f.cargo_id !== '' ||
    f.cidade !== '' ||
    f.status !== 'ativo'
  )
}

export function MembersFilters({ filters, allCargos, onChange }: MembersFiltersProps) {
  const [expanded, setExpanded] = useState(false)

  function update(partial: Partial<MembersFilterState>) {
    onChange({ ...filters, ...partial })
  }

  function toggleGrau(grau: Grau) {
    const current = filters.graus
    update({
      graus: current.includes(grau)
        ? current.filter(g => g !== grau)
        : [...current, grau],
    })
  }

  function reset() {
    onChange({ q: '', graus: [], turma: '', cargo_id: '', cidade: '', status: 'ativo' })
  }

  return (
    <div className="space-y-3">
      {/* Primary row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nome ou CIM..."
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          className="max-w-xs h-9"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={expanded ? 'border-primary text-primary' : ''}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Filtros
          {hasActiveFilters(filters) && (
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>

        {/* Status toggle */}
        <div className="flex border border-border rounded-md overflow-hidden">
          {(['ativo', 'todos', 'inativo'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ status: s })}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                filters.status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              {s === 'ativo' ? 'Ativos' : s === 'inativo' ? 'Inativos' : 'Todos'}
            </button>
          ))}
        </div>

        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground h-9">
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="rounded-md border border-border p-4 space-y-4 bg-card">

          {/* Grau checkboxes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grau</p>
            <div className="flex flex-wrap gap-2">
              {GRAU_OPTIONS.map((opt) => {
                const active = filters.graus.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleGrau(opt.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: active ? `${opt.cor}30` : 'transparent',
                      borderColor: active ? opt.cor : 'hsl(var(--border))',
                      color: active ? opt.cor : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Turma */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Turma</p>
            <div className="flex flex-wrap gap-2">
              {TURMA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ turma: filters.turma === opt.value ? '' : opt.value })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.turma === opt.value
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cargo */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cargo</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => update({ cargo_id: '' })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filters.cargo_id === ''
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                Todos
              </button>
              {allCargos.map((cargo) => (
                <button
                  key={cargo.id}
                  type="button"
                  onClick={() => update({ cargo_id: filters.cargo_id === cargo.id ? '' : cargo.id })}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: filters.cargo_id === cargo.id ? `${cargo.cor ?? '#6b7280'}30` : 'transparent',
                    borderColor: filters.cargo_id === cargo.id ? (cargo.cor ?? '#6b7280') : 'hsl(var(--border))',
                    color: filters.cargo_id === cargo.id ? (cargo.cor ?? '#6b7280') : 'hsl(var(--muted-foreground))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cargo.cor ?? '#6b7280' }} />
                  {cargo.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade</p>
            <Input
              placeholder="Filtrar por cidade..."
              value={filters.cidade}
              onChange={(e) => update({ cidade: e.target.value })}
              className="max-w-xs h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
