'use client'

import { Star } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ProgressionTimelineProps {
  data_am: string | null
  data_cm: string | null
  data_mm: string | null
  data_cm_prev: string | null
  data_mm_prev: string | null
}

type NodeState = 'confirmed' | 'predicted' | 'empty'

interface TimelineNode {
  label: string
  date: string | null
  state: NodeState
}

function formatDate(date: string | null): string {
  if (!date) return ''
  try {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return date
  }
}

function getStarStyle(label: string, state: NodeState): React.CSSProperties {
  if (state === 'empty') {
    return { fill: 'none', stroke: 'rgba(107,114,128,0.3)' }
  }
  if (label === 'AM') {
    return { fill: 'none', stroke: '#ea580c' }
  }
  if (label === 'CM') {
    return { fill: '#9ca3af', stroke: '#9ca3af' }
  }
  if (label === 'MM' && state === 'confirmed') {
    return { fill: '#f59e0b', stroke: '#f59e0b' }
  }
  if (label === 'MM' && state === 'predicted') {
    return { fill: 'none', stroke: '#d4a834' }
  }
  return { fill: 'none', stroke: 'rgba(107,114,128,0.3)' }
}

function NodeStar({ state, date, label }: { state: NodeState; date: string | null; label: string }) {
  const style = getStarStyle(label, state)
  const star = (
    <Star className="w-4 h-4 flex-shrink-0 transition-colors" style={style} />
  )

  if (!date) return star

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {star}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <p>{formatDate(date)}</p>
          {state === 'predicted' && (
            <p className="text-muted-foreground">(previsão)</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ProgressionTimeline({
  data_am,
  data_cm,
  data_mm,
  data_cm_prev,
  data_mm_prev,
}: ProgressionTimelineProps) {
  const hasAnyDate = data_am || data_cm || data_mm || data_cm_prev || data_mm_prev
  if (!hasAnyDate) return null

  const nodes: TimelineNode[] = [
    {
      label: 'AM',
      date: data_am,
      state: data_am ? 'confirmed' : 'empty',
    },
    {
      label: 'CM',
      date: data_cm ?? data_cm_prev,
      state: data_cm ? 'confirmed' : data_cm_prev ? 'predicted' : 'empty',
    },
    {
      label: 'MM',
      date: data_mm ?? data_mm_prev,
      state: data_mm ? 'confirmed' : data_mm_prev ? 'predicted' : 'empty',
    },
  ]

  return (
    <div className="flex items-center gap-1">
      {nodes.map((node, i) => (
        <div key={node.label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <NodeStar state={node.state} date={node.date} label={node.label} />
            <span className="text-[10px] text-muted-foreground leading-none">{node.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="w-4 h-px bg-muted-foreground/20 mb-3" />
          )}
        </div>
      ))}
    </div>
  )
}
