-- 1. caixas
create table caixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean default true,
  created_at timestamptz default now()
);

insert into caixas (nome, descricao) values
  ('Bar da Sabedoria', 'Custos de sessão, ágape e consumo'),
  ('Caixa da Loja', 'Mensalidades, ofertas e despesas gerais');

-- 2. lancamentos: add caixa_id + extend tipo check
alter table lancamentos
  add column caixa_id uuid references caixas(id);

alter table lancamentos
  drop constraint if exists lancamentos_tipo_check;

alter table lancamentos
  add constraint lancamentos_tipo_check check (tipo in (
    'sessao', 'agape', 'produto',
    'mensalidade', 'oferta',
    'deposito', 'outro'
  ));

-- sessao_id is already nullable in the schema — no change needed

-- 3. tronco_solidariedade
create table tronco_solidariedade (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  valor numeric(10,2) not null default 0,
  observacao text,
  created_at timestamptz default now(),
  unique(sessao_id)
);

-- 4. mensalidades
create table mensalidades (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  mes_referencia date not null,
  valor numeric(10,2) not null default 0,
  pago boolean default false,
  data_pagamento date,
  created_at timestamptz default now(),
  unique(member_id, mes_referencia)
);

-- 5. RLS
alter table caixas enable row level security;
alter table tronco_solidariedade enable row level security;
alter table mensalidades enable row level security;

create policy "authenticated_all_caixas"
  on caixas for all to authenticated using (true) with check (true);

create policy "authenticated_all_tronco"
  on tronco_solidariedade for all to authenticated using (true) with check (true);

create policy "authenticated_all_mensalidades"
  on mensalidades for all to authenticated using (true) with check (true);
