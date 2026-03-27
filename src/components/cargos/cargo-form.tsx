'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cargoSchema } from '@/lib/validations'
import { Cargo } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createCargo, updateCargo } from '@/app/actions/cargos'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type CargoFormValues = z.input<typeof cargoSchema>
type CargoFormOutput = z.output<typeof cargoSchema>

interface CargoFormProps {
  cargo?: Cargo
  onSuccess: () => void
}

export function CargoForm({ cargo, onSuccess }: CargoFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<CargoFormValues, unknown, CargoFormOutput>({
      resolver: zodResolver(cargoSchema),
      defaultValues: {
        nome: cargo?.nome ?? '',
        cor: cargo?.cor ?? '#6b7280',
        ordem: cargo?.ordem ?? 0,
        ativo: cargo?.ativo ?? true,
      },
    })

  const cor = watch('cor')
  const ativo = watch('ativo')

  async function onSubmit(data: CargoFormOutput) {
    const result = cargo
      ? await updateCargo(cargo.id, data)
      : await createCargo(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(cargo ? 'Cargo atualizado!' : 'Cargo criado!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Ex: Venerável Mestre" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cor">Cor</Label>
        <div className="flex items-center gap-3">
          <input
            id="cor"
            type="color"
            {...register('cor')}
            className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent p-1"
          />
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
            style={{
              backgroundColor: `${cor}20`,
              color: cor,
              borderColor: `${cor}40`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cor }}
            />
            Preview
          </span>
        </div>
        {errors.cor && <p className="text-xs text-destructive">{errors.cor.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ordem">Ordem de exibição</Label>
        <Input
          id="ordem"
          type="number"
          min={0}
          {...register('ordem')}
          placeholder="0"
        />
        {errors.ordem && <p className="text-xs text-destructive">{errors.ordem.message}</p>}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch
          id="ativo"
          checked={ativo}
          onCheckedChange={(v) => setValue('ativo', v)}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : cargo ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
