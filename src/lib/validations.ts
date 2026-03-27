import { z } from 'zod'

export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_historico: z.string().optional().or(z.literal('')),
  data_nascimento: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  cargo: z.string().optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

export const sessaoSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  descricao: z.string().optional().or(z.literal('')),
  custo_sessao: z.coerce.number().min(0).default(0),
  custo_sessao_descricao: z.string().optional().or(z.literal('')),
  custo_agape: z.coerce.number().min(0).default(0),
  custo_agape_descricao: z.string().optional().or(z.literal('')),
  tem_agape: z.boolean().default(false),
})

export const produtoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  preco: z.coerce.number().min(0.01, 'Preço deve ser maior que zero'),
  descricao: z.string().optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

export type MemberFormData = z.infer<typeof memberSchema>
export type SessaoFormData = z.infer<typeof sessaoSchema>
export type ProdutoFormData = z.infer<typeof produtoSchema>
