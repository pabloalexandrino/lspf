-- members
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_historico text,
  data_nascimento date,
  cargo text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- sessoes
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text,
  custo_extra numeric(10,2) default 0,
  custo_extra_descricao text,
  tem_agape boolean default false,
  created_at timestamptz default now()
);

-- presenca_sessao
create table if not exists presenca_sessao (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  unique(sessao_id, member_id)
);

-- presenca_agape
create table if not exists presenca_agape (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  unique(sessao_id, member_id)
);

-- produtos
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null,
  descricao text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- consumo_produtos
create table if not exists consumo_produtos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  produto_id uuid references produtos(id) on delete cascade,
  quantidade integer not null default 1,
  created_at timestamptz default now()
);

-- lancamentos
create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references sessoes(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  tipo text check (tipo in ('sessao', 'agape', 'produto')) not null,
  descricao text,
  valor numeric(10,2) not null,
  pago boolean default false,
  data_pagamento date,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table members enable row level security;
alter table sessoes enable row level security;
alter table presenca_sessao enable row level security;
alter table presenca_agape enable row level security;
alter table produtos enable row level security;
alter table consumo_produtos enable row level security;
alter table lancamentos enable row level security;

-- RLS policies: authenticated users can do everything
create policy "authenticated_all_members" on members for all to authenticated using (true) with check (true);
create policy "authenticated_all_sessoes" on sessoes for all to authenticated using (true) with check (true);
create policy "authenticated_all_presenca_sessao" on presenca_sessao for all to authenticated using (true) with check (true);
create policy "authenticated_all_presenca_agape" on presenca_agape for all to authenticated using (true) with check (true);
create policy "authenticated_all_produtos" on produtos for all to authenticated using (true) with check (true);
create policy "authenticated_all_consumo_produtos" on consumo_produtos for all to authenticated using (true) with check (true);
create policy "authenticated_all_lancamentos" on lancamentos for all to authenticated using (true) with check (true);
