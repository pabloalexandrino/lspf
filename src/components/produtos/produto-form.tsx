'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { produtoSchema } from '@/lib/validations'
import { Produto } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createProduto, updateProduto } from '@/app/actions/produtos'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

type ProdutoFormValues = z.input<typeof produtoSchema>
type ProdutoFormOutput = z.output<typeof produtoSchema>

interface ProdutoFormProps {
  produto?: Produto
  onSuccess: () => void
}

export function ProdutoForm({ produto, onSuccess }: ProdutoFormProps) {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<ProdutoFormValues, unknown, ProdutoFormOutput>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: produto?.nome ?? '',
      preco: produto?.preco ?? 0,
      descricao: produto?.descricao ?? '',
      ativo: produto?.ativo ?? true,
    },
  })

  const ativo = watch('ativo')

  async function onSubmit(data: ProdutoFormOutput) {
    const result = produto
      ? await updateProduto(produto.id, data)
      : await createProduto(data)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(produto ? 'Produto atualizado!' : 'Produto criado!')
      router.refresh()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} placeholder="Nome do produto" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="preco">Preço (R$) *</Label>
        <Input id="preco" type="number" step="0.01" min="0" {...register('preco')} placeholder="0,00" />
        {errors.preco && <p className="text-xs text-destructive">{errors.preco.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input id="descricao" {...register('descricao')} placeholder="Descrição opcional" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch id="ativo" checked={ativo} onCheckedChange={(v) => setValue('ativo', v)} />
      </div>
      {!produto && (
        <p className="text-xs text-muted-foreground">
          Produtos não são excluídos — apenas inativados quando necessário.
        </p>
      )}
      <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : produto ? 'Atualizar' : 'Cadastrar'}
      </Button>
    </form>
  )
}
