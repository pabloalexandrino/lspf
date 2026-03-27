import { Cargo } from '@/lib/types'

interface CargoBadgeProps {
  cargo: Cargo
}

export function CargoBadge({ cargo }: CargoBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${cargo.cor}20`,
        color: cargo.cor,
        border: `1px solid ${cargo.cor}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cargo.cor }}
      />
      {cargo.nome}
    </span>
  )
}
