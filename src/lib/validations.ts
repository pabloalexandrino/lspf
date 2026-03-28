import { z } from 'zod'

export const memberSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  nome_historico: z.string().optional().or(z.literal('')),
  data_nascimento: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
  ativo: z.boolean().default(true),
  cargo_ids: z.array(z.string()).default([]),
  whatsapp: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().regex(/^\d{10,11}$/, 'WhatsApp deve ter 10 ou 11 dígitos').nullable().optional()
  ),
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

export const cargoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#6b7280'),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
})

export type MemberFormData = z.infer<typeof memberSchema>
export type SessaoFormData = z.infer<typeof sessaoSchema>
export type ProdutoFormData = z.infer<typeof produtoSchema>
export type CargoFormData = z.infer<typeof cargoSchema>

export const saidaCaixaSchema = z.object({
  caixa_id: z.string().uuid('Caixa inválido'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  data_pagamento: z.string().min(1, 'Data obrigatória'),
  sessao_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
  member_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
})

export type SaidaCaixaFormData = z.infer<typeof saidaCaixaSchema>

export const entradaCaixaSchema = z.object({
  caixa_id: z.string().uuid('Caixa inválido'),
  tipo: z.enum(['deposito', 'oferta', 'outro']),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  data_pagamento: z.string().min(1, 'Data obrigatória'),
  sessao_id: z.preprocess(
    v => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
})

export type EntradaCaixaFormData = z.infer<typeof entradaCaixaSchema>
