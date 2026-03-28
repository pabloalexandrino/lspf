export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  data_nascimento: string | null
  cargo: string | null
  ativo: boolean
  whatsapp: string | null
  created_at: string
}

export type Sessao = {
  id: string
  data: string
  descricao: string | null
  custo_sessao: number
  custo_sessao_descricao: string | null
  custo_agape: number
  custo_agape_descricao: string | null
  tem_agape: boolean
  created_at: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  descricao: string | null
  ativo: boolean
  created_at: string
}

export type PresencaSessao = {
  id: string
  sessao_id: string
  member_id: string
}

export type PresencaAgape = {
  id: string
  sessao_id: string
  member_id: string
}

export type ConsumoProduto = {
  id: string
  sessao_id: string
  member_id: string
  produto_id: string
  quantidade: number
  created_at: string
}

export type Lancamento = {
  id: string
  sessao_id: string | null
  member_id: string | null
  tipo: 'sessao' | 'agape' | 'produto' | 'mensalidade' | 'oferta' | 'deposito' | 'outro' | 'saida_caixa'
  descricao: string | null
  valor: number
  pago: boolean
  data_pagamento: string | null
  caixa_id: string | null
  created_at: string
}

export type Caixa = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

export type TroncoSolidariedade = {
  id: string
  sessao_id: string
  valor: number
  observacao: string | null
  created_at: string
}

export type Mensalidade = {
  id: string
  member_id: string
  mes_referencia: string
  valor: number
  pago: boolean
  data_pagamento: string | null
  created_at: string
}

export type Cargo = {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
}

export type MemberWithCargos = Member & {
  member_cargos: Array<{
    id: string
    cargo_id: string
    cargos: Cargo
  }>
}

export type LancamentoWithSessao = Lancamento & {
  sessao?: { data: string; descricao: string | null } | null
}
