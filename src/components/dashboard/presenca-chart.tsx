'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PresencaChartProps {
  data: Array<{
    data: string
    presentes: number
  }>
}

export function PresencaChart({ data }: PresencaChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Nenhuma sessão realizada ainda
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
        <XAxis dataKey="data" tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(0 0% 10%)',
            border: '1px solid hsl(0 0% 16%)',
            borderRadius: '6px',
            color: 'hsl(36 20% 91%)',
          }}
          labelStyle={{ color: 'hsl(41 55% 55%)' }}
        />
        <Bar dataKey="presentes" fill="hsl(41 55% 55%)" radius={[3, 3, 0, 0]} name="Presentes" />
      </BarChart>
    </ResponsiveContainer>
  )
}
