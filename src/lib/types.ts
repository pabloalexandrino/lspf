export type Member = {
  id: string
  nome: string
  nome_historico: string | null
  data_nascimento: string | null
  cargo: string | null
  ativo: boolean
  created_at: string
}

export type Sessao = {
  id: string
  data: string
  descricao: string | null
  custo_extra: number
  custo_extra_descricao: string | null
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
  sessao_id: string
  member_id: string
  tipo: 'sessao' | 'agape' | 'produto'
  descricao: string | null
  valor: number
  pago: boolean
  data_pagamento: string | null
  created_at: string
}
