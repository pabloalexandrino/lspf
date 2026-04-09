'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberSchema } from '@/lib/validations'
import { Member, Cargo, Grau } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createMember, updateMember } from '@/app/actions/members'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type MemberFormValues = z.input<typeof memberSchema>
type MemberFormOutput = z.output<typeof memberSchema>

interface MemberFormProps {
  member?: Member
  allCargos: Cargo[]
  onSuccess: () => void
}

const GRAU_OPTIONS: { value: Grau; label: string }[] = [
  { value: 'MI', label: 'MI — Mestre Instalado' },
  { value: 'MM', label: 'MM — Mestre Maçom' },
  { value: 'CM', label: 'CM — Companheiro Maçom' },
  { value: 'AM', label: 'AM — Aprendiz Maçom' },
  { value: 'C',  label: 'C  — Candidato' },
]

const TURMA_OPTIONS = [
  { value: '', label: 'Fundador' },
  { value: '1', label: '1ª Turma' },
  { value: '2', label: '2ª Turma' },
  { value: '3', label: '3ª Turma' },
  { value: '4', label: '4ª Turma' },
  { value: '5', label: '5ª Turma' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2 pb-1 border-b border-border">
      {children}
    </p>
  )
}

export function MemberForm({ member, allCargos, onSuccess }: MemberFormProps) {
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } =
    useForm<MemberFormValues, unknown, MemberFormOutput>({
      resolver: zodResolver(memberSchema),
      defaultValues: {
        nome: member?.nome ?? '',
        nome_historico: member?.nome_historico ?? '',
        funcao: member?.funcao ?? '',
        cargo_id: member?.cargo_id ?? '',
        grau: member?.grau ?? '',
cidade: member?.cidade ?? '',
        profissao: member?.profissao ?? '',
        cim: member?.cim ?? '',
        turma: member?.turma ?? undefined,
        fundador: member?.fundador ?? false,
        ativo: member?.ativo ?? true,
        data_nascimento: member?.data_nascimento ?? '',
        data_am: member?.data_am ?? '',
        data_cm: member?.data_cm ?? '',
        data_mm: member?.data_mm ?? '',
        data_cm_prev: member?.data_cm_prev ?? '',
        data_mm_prev: member?.data_mm_prev ?? '',
        indicado_por: member?.indicado_por ?? '',
        whatsapp: member?.whatsapp ?? '',
      },
    })

  const ativo = watch('ativo')
  const fundador = watch('fundador')
  const grau = watch('grau')
  const data_cm = watch('data_cm')
  const data_mm = watch('data_mm')
  const showIndicadoPor = grau === 'AM' || grau === 'C'
  const showDataCmPrev = !data_cm
  const showDataMmPrev = !data_mm

  function formatWhatsapp(value: string): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 11)
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(100vh-8rem)]">

      {/* ── SEÇÃO 1: DADOS MAÇÔNICOS ── */}
      <SectionTitle>Dados Maçônicos</SectionTitle>

      <div className="space-y-2">
        <Label htmlFor="cim">CIM</Label>
        <Input id="cim" placeholder="351211" {...register('cim')} />
      </div>

      <div className="space-y-2">
        <Label>Grau</Label>
        <Select
          value={(watch('grau') as string) ?? ''}
          onValueChange={(v) => setValue('grau', v as Grau)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o grau" />
          </SelectTrigger>
          <SelectContent>
            {GRAU_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cargo</Label>
        <Select
          value={(watch('cargo_id') as string) ?? ''}
          onValueChange={(v) => setValue('cargo_id', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cargo">
              {(value: string) => {
                if (!value) return 'Selecione o cargo'
                const cargo = allCargos.find(c => c.id === value)
                if (!cargo) return value
                return (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cargo.cor }} />
                    {cargo.nome}
                  </div>
                )
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Sem cargo —</SelectItem>
            {allCargos.map((cargo) => (
              <SelectItem key={cargo.id} value={cargo.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cargo.cor }}
                  />
                  {cargo.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="funcao">Função Ritual</Label>
        <Input id="funcao" placeholder="Ex: Mestre de Harmonia" {...register('funcao')} />
      </div>

      <div className="space-y-2">
        <Label>Turma</Label>
        <Select
          value={watch('turma') != null ? String(watch('turma')) : ''}
          onValueChange={(v) => setValue('turma', v === '' ? null : Number(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a turma" />
          </SelectTrigger>
          <SelectContent>
            {TURMA_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="fundador">Fundador</Label>
        <Switch
          id="fundador"
          checked={!!fundador}
          onCheckedChange={(v) => setValue('fundador', v)}
        />
      </div>

      {showIndicadoPor && (
        <div className="space-y-2">
          <Label htmlFor="indicado_por">Indicado por</Label>
          <Input id="indicado_por" placeholder="Nome do padrinho" {...register('indicado_por')} />
        </div>
      )}

      {/* ── SEÇÃO 2: PROGRESSÃO ── */}
      <SectionTitle>Progressão</SectionTitle>

      <div className="space-y-2">
        <Label htmlFor="data_am">Data AM (Iniciação)</Label>
        <Input id="data_am" type="date" {...register('data_am')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_cm">Data CM (Elevação)</Label>
        <Input id="data_cm" type="date" {...register('data_cm')} />
      </div>

      {showDataCmPrev && (
        <div className="space-y-2">
          <Label htmlFor="data_cm_prev">Previsão CM</Label>
          <Input id="data_cm_prev" type="date" {...register('data_cm_prev')} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="data_mm">Data MM (Exaltação)</Label>
        <Input id="data_mm" type="date" {...register('data_mm')} />
      </div>

      {showDataMmPrev && (
        <div className="space-y-2">
          <Label htmlFor="data_mm_prev">Previsão MM</Label>
          <Input id="data_mm_prev" type="date" {...register('data_mm_prev')} />
        </div>
      )}

      {/* ── SEÇÃO 3: DADOS PESSOAIS ── */}
      <SectionTitle>Dados Pessoais</SectionTitle>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome completo" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_historico">Nome Histórico</Label>
        <Input id="nome_historico" {...register('nome_historico')} placeholder="Ex: Alberto Santos Dumont" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
        <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profissao">Profissão</Label>
        <Input id="profissao" placeholder="Ex: Engenheiro" {...register('profissao')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Input id="cidade" placeholder="Ex: Birigui" {...register('cidade')} />
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
          checked={!!ativo}
          onCheckedChange={(v) => setValue('ativo', v)}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : member ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
