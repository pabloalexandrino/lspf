'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sessaoSchema } from '@/lib/validations'
import { Sessao } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createSessao, updateSessao } from '@/app/actions/sessoes'
import { z } from 'zod'

type SessaoFormValues = z.input<typeof sessaoSchema>
type SessaoFormOutput = z.output<typeof sessaoSchema>

interface SessaoFormProps {
  sessao?: Sessao
  onSuccess: () => void
}

export function SessaoForm({ sessao, onSuccess }: SessaoFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<SessaoFormValues, unknown, SessaoFormOutput>({
    resolver: zodResolver(sessaoSchema),
    defaultValues: {
      data: sessao?.data ?? '',
      descricao: sessao?.descricao ?? '',
      custo_extra: sessao?.custo_extra ?? 0,
      custo_extra_descricao: sessao?.custo_extra_descricao ?? '',
      tem_agape: sessao?.tem_agape ?? false,
    },
  })

  const temAgape = watch('tem_agape')
  const custoExtra = watch('custo_extra')

  async function onSubmit(data: SessaoFormOutput) {
    const result = sessao
      ? await updateSessao(sessao.id, data)
      : await createSessao(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(sessao ? 'Sessão atualizada!' : 'Sessão criada!')
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="data">Data *</Label>
        <Input id="data" type="date" {...register('data')} />
        {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input id="descricao" {...register('descricao')} placeholder="Descreva a sessão" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="tem_agape">Tem Ágape?</Label>
        <Switch id="tem_agape" checked={temAgape} onCheckedChange={(v) => setValue('tem_agape', v)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custo_extra">Custo Extra (R$)</Label>
        <Input id="custo_extra" type="number" step="0.01" min="0" {...register('custo_extra')} placeholder="0,00" />
        <p className="text-xs text-muted-foreground">
          {temAgape ? 'Dividido entre os presentes no ágape' : 'Dividido entre todos os presentes'}
        </p>
      </div>
      {Number(custoExtra) > 0 && (
        <div className="space-y-2">
          <Label htmlFor="custo_extra_descricao">Descrição do custo extra</Label>
          <Input id="custo_extra_descricao" {...register('custo_extra_descricao')} placeholder="Ex: Aluguel, Material..." />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : sessao ? 'Atualizar' : 'Criar Sessão'}
      </Button>
    </form>
  )
}
