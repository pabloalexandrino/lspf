'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buscarMembroPorCim } from '@/app/actions/busca-cim'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function BuscaCimForm() {
  const router = useRouter()
  const [cim, setCim] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await buscarMembroPorCim(cim)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/extrato/${result.memberId}`)
    // Keep loading=true while navigating so the button stays disabled
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Digite seu CIM"
        value={cim}
        onChange={(e) => {
          setCim(e.target.value)
          setError(null)
        }}
        disabled={loading}
        required
        autoComplete="off"
        aria-label="CIM do membro"
      />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading || !cim.trim()}>
        {loading ? 'Buscando...' : 'Buscar'}
      </Button>
    </form>
  )
}
