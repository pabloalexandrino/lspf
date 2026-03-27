'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberSchema } from '@/lib/validations'
import { MemberWithCargos, Cargo } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CargoBadge } from './cargo-badge'
import { toast } from 'sonner'
import { createMember, updateMember } from '@/app/actions/members'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type MemberFormValues = z.input<typeof memberSchema>
type MemberFormOutput = z.output<typeof memberSchema>

interface MemberFormProps {
  member?: MemberWithCargos
  allCargos: Cargo[]
  onSuccess: () => void
}

export function MemberForm({ member, allCargos, onSuccess }: MemberFormProps) {
  const router = useRouter()

  const currentCargoIds = member?.member_cargos.map(mc => mc.cargo_id) ?? []

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<MemberFormValues, unknown, MemberFormOutput>({
      resolver: zodResolver(memberSchema),
      defaultValues: {
        nome: member?.nome ?? '',
        nome_historico: member?.nome_historico ?? '',
        data_nascimento: member?.data_nascimento ?? '',
        ativo: member?.ativo ?? true,
        cargo_ids: currentCargoIds,
        whatsapp: member?.whatsapp ?? '',
      },
    })

  const ativo = watch('ativo')
  const cargoIds = watch('cargo_ids') as string[]

  function toggleCargo(cargoId: string) {
    const current = cargoIds ?? []
    if (current.includes(cargoId)) {
      setValue('cargo_ids', current.filter(id => id !== cargoId))
    } else {
      setValue('cargo_ids', [...current, cargoId])
    }
  }

  function formatWhatsapp(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  }

  async function onSubmit(data: MemberFormOutput) {
    const result = member
      ? await updateMember(member.id, data)
      : await createMember(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(member ? 'Membro atualizado!' : 'Membro criado!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome completo" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_historico">Nome Histórico</Label>
        <Input id="nome_historico" {...register('nome_historico')} placeholder="Nome na loja" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
        <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
      </div>

      <div className="space-y-3">
        <Label>Cargos</Label>
        {allCargos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum cargo ativo cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {allCargos.map((cargo) => {
              const isSelected = (cargoIds ?? []).includes(cargo.id)
              return (
                <button
                  key={cargo.id}
                  type="button"
                  onClick={() => toggleCargo(cargo.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <CargoBadge cargo={cargo} />
                  {isSelected && (
                    <span className="text-xs text-primary font-medium">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          placeholder="(44) 99999-8888"
          value={formatWhatsapp((watch('whatsapp') as string) ?? '')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
            setValue('whatsapp', digits)
          }}
        />
        {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
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
        {isSubmitting ? 'Salvando...' : member ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
