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
import { useRouter } from 'next/navigation'

type SessaoFormValues = z.input<typeof sessaoSchema>
type SessaoFormOutput = z.output<typeof sessaoSchema>

interface SessaoFormProps {
  sessao?: Sessao
  onSuccess: () => void
}

export function SessaoForm({ sessao, onSuccess }: SessaoFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<SessaoFormValues, unknown, SessaoFormOutput>({
    resolver: zodResolver(sessaoSchema),
    defaultValues: {
      data: sessao?.data ?? '',
      descricao: sessao?.descricao ?? '',
      custo_sessao: sessao?.custo_sessao ?? 0,
      custo_sessao_descricao: sessao?.custo_sessao_descricao ?? '',
      custo_agape: sessao?.custo_agape ?? 0,
      custo_agape_descricao: sessao?.custo_agape_descricao ?? '',
      tem_agape: sessao?.tem_agape ?? false,
    },
  })

  const temAgape = watch('tem_agape')
  const custoSessao = watch('custo_sessao')
  const custoAgape = watch('custo_agape')

  async function onSubmit(data: SessaoFormOutput) {
    const result = sessao
      ? await updateSessao(sessao.id, data)
      : await createSessao(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(sessao ? 'Sessão atualizada!' : 'Sessão criada!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
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
        <Label htmlFor="custo_sessao">Custo da Sessão (R$)</Label>
        <Input id="custo_sessao" type="number" step="0.01" min="0" {...register('custo_sessao')} placeholder="0,00" />
        <p className="text-xs text-muted-foreground">Ex: aluguel de cadeiras - dividido entre os presentes na sessão</p>
        {Number(custoSessao) > 0 && (
          <Input {...register('custo_sessao_descricao')} placeholder="Descrição do custo" />
        )}
      </div>
      {temAgape && (
        <div className="space-y-2">
          <Label htmlFor="custo_agape">Custo do Ágape (R$)</Label>
          <Input id="custo_agape" type="number" step="0.01" min="0" {...register('custo_agape')} placeholder="0,00" />
          <p className="text-xs text-muted-foreground">Dividido entre os presentes no ágape</p>
          {Number(custoAgape) > 0 && (
            <Input {...register('custo_agape_descricao')} placeholder="Ex: jantar, bebidas" />
          )}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : sessao ? 'Atualizar' : 'Criar Sessão'}
      </Button>
    </form>
  )
}
