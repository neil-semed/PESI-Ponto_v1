-- ============================================================
-- PESI Ponto — Supabase schema (ghplxntmcirvdofllgkr)
-- Postgres + RLS + índices
-- Regras validadas: raio 100m/escola, horário configurável,
-- quinzena 1-15/16-fim, IR modelo planilha (2 faixas, ded 908.73, redutor)
-- ============================================================

-- 0) Extensions
create extension if not exists "pgcrypto";
create extension if not exists "earthdistance" cascade;

-- 1) schools (ESCOLAS) — deve vir antes de profiles (FK)
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  endereco text,
  telefone text,
  email text,
  latitude double precision,
  longitude double precision,
  raio_permitido_m integer not null default 100 check (raio_permitido_m between 10 and 2000),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_schools_ativo on public.schools(ativo);

-- 2) oficinas (workshops)
create table if not exists public.oficinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) profiles — espelha auth.users (FK auth.users.id) — depende de schools
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  perfil text not null check (perfil in ('ADMIN','COORDENADOR','DIRETOR','OFICINEIRO')),
  escola_id uuid references public.schools(id) on delete set null,
  ativo boolean not null default true,
  precisa_trocar_senha boolean not null default false,
  bate_proprio_ponto boolean not null default false,
  gera_ordem_pagamento boolean not null default false,
  cpf text,
  banco text,
  agencia text,
  conta text,
  termo_adesao text,
  processo_administrativo text,
  empenho text,
  foto_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_escola on public.profiles(escola_id);
create index if not exists idx_profiles_perfil on public.profiles(perfil);
create index if not exists idx_profiles_ativo on public.profiles(ativo);

-- 4) oficineiros — entidade de negócio (pode ter ou não profile vinculado)
create table if not exists public.oficineiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null unique,
  email text not null unique,
  telefone text,
  escola_id uuid not null references public.schools(id) on delete restrict,
  oficina_id uuid not null references public.oficinas(id) on delete restrict,
  grade jsonb not null default '[]'::jsonb, -- [{dia:"SEG", inicio:"07:00", fim:"11:00"}]
  foto_url text,
  banco text,
  agencia text,
  conta text,
  termo_adesao text,
  processo_administrativo text,
  empenho text,
  ativo boolean not null default true,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chk_cpf check (length(regexp_replace(cpf,'\D','','g')) = 11)
);
create index if not exists idx_oficineiros_escola on public.oficineiros(escola_id);
create index if not exists idx_oficineiros_oficina on public.oficineiros(oficina_id);
create index if not exists idx_oficineiros_ativo on public.oficineiros(ativo);
create index if not exists idx_oficineiros_cpf on public.oficineiros(cpf);

-- 5) financial_config (chave/valor — VALOR_HORA, ISS, INSS, horário, secretário, redutor)
create table if not exists public.financial_config (
  chave text primary key,
  valor text not null,
  descricao text,
  updated_at timestamptz not null default now()
);

-- 6) time_entries (RegistrosPonto) — oficineiros
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  oficineiro_id uuid not null references public.oficineiros(id) on delete cascade,
  escola_id uuid references public.schools(id) on delete set null,
  tipo text not null check (tipo in ('ENTRADA','INICIO_INTERVALO','FIM_INTERVALO','SAIDA')),
  timestamp timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  distancia_m integer,
  barrado boolean not null default false,
  motivo_barrado text,
  barrado_por uuid references public.profiles(id) on delete set null,
  barrado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_time_entries_ofic_tempo on public.time_entries(oficineiro_id, timestamp);
create index if not exists idx_time_entries_escola_tempo on public.time_entries(escola_id, timestamp);
create index if not exists idx_time_entries_timestamp on public.time_entries(timestamp);

-- 7) time_entries_coordenador (RegistrosPontoCoordenador) — coordenador/diretor ponto próprio simplificado
create table if not exists public.time_entries_coordenador (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('ENTRADA','SAIDA')),
  timestamp timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  distancia_m integer,
  barrado boolean not null default false,
  motivo_barrado text,
  created_at timestamptz not null default now()
);
create index if not exists idx_time_coord_profile_tempo on public.time_entries_coordenador(profile_id, timestamp);

-- 8) aprovacoes_quinzena
create table if not exists public.aprovacoes_quinzena (
  id uuid primary key default gen_random_uuid(),
  oficineiro_id uuid not null references public.oficineiros(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADO','REJEITADO')),
  decidido_por uuid references public.profiles(id) on delete set null,
  decidido_em timestamptz,
  motivo text,
  created_at timestamptz not null default now(),
  unique (oficineiro_id, data_inicio, data_fim)
);
create index if not exists idx_aprovacoes_ofic on public.aprovacoes_quinzena(oficineiro_id);

-- 9) abonos
create table if not exists public.abonos (
  id uuid primary key default gen_random_uuid(),
  oficineiro_id uuid not null references public.oficineiros(id) on delete cascade,
  data date not null,
  motivo text not null,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (oficineiro_id, data)
);
create index if not exists idx_abonos_ofic_data on public.abonos(oficineiro_id, data);

-- 10) ordens_pagamento
create table if not exists public.ordens_pagamento (
  id uuid primary key default gen_random_uuid(),
  oficineiro_id uuid references public.oficineiros(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null, -- para coordenador/diretor quando gera ordem
  tipo_pessoa text not null default 'OFICINEIRO' check (tipo_pessoa in ('OFICINEIRO','COORDENADOR')),
  data_inicio date not null,
  data_fim date not null,
  horas_totais_ms bigint not null,
  valor_hora numeric(10,2) not null,
  bruto numeric(12,2) not null,
  iss numeric(12,2) not null,
  inss numeric(12,2) not null,
  ir numeric(12,2) not null,
  liquido numeric(12,2) not null,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','PAGA')),
  pdf_url text,
  termo_adesao text,
  processo_administrativo text,
  empenho text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ordens_ofic on public.ordens_pagamento(oficineiro_id);
create index if not exists idx_ordens_status on public.ordens_pagamento(status);

-- 11) financial_data — dados bancários canônicos por CPF (aba DadosFinanceiros)
create table if not exists public.financial_data (
  cpf text primary key,
  nome text,
  nome_banco text,
  numero_banco text,
  agencia text,
  conta text,
  termo_adesao text,
  processo_administrativo text,
  empenho text,
  updated_at timestamptz not null default now(),
  constraint chk_fd_cpf check (length(regexp_replace(cpf,'\D','','g')) = 11)
);

-- 12) audit_log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  detalhe jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_actor on public.audit_log(actor_id);

-- ============================================================
-- Seeds — financial_config (do ConfigFinanceiro.csv + planilha)
-- ============================================================
insert into public.financial_config(chave, valor, descricao) values
  ('VALOR_HORA','35','R$/hora-aula')
, ('ISS_PERCENTUAL','3','%')
, ('INSS_PERCENTUAL','11','%')
, ('HORARIO_INICIO','07:00','HH:MM')
, ('HORARIO_FIM','17:00','HH:MM')
, ('REDUTOR_LIMITE1','5000','Lei 15.270/2025')
, ('REDUTOR_LIMITE2','7350','Lei 15.270/2025')
, ('REDUTOR_COEF','0.133145','Lei 15.270/2025')
, ('REDUTOR_CONSTANTE','978.62','Lei 15.270/2025')
, ('SECRETARIO_NOME','MARCOS EVANGELISTA TESTE','')
, ('SECRETARIO_CARGO','Secretário Municipal de Educação','')
on conflict (chave) do update set valor = excluded.valor, descricao = excluded.descricao, updated_at = now();

-- ============================================================
-- Helpers — cálculo IR modelo planilha (2 faixas) em SQL
-- ============================================================
create or replace function public.calcular_ir(bruto numeric, inss numeric)
returns table(ir numeric, ir_bruto numeric, deducao numeric, redutor numeric, base_ir numeric)
language plpgsql as $$
declare
  v_base numeric := bruto - inss;
  v_ir_bruto numeric := 0;
  v_deducao numeric := 0;
  v_redutor numeric := 0;
  v_ir numeric := 0;
begin
  if bruto <= 5000 then
    v_ir := 0;
    v_ir_bruto := 0;
    v_deducao := 0;
    v_redutor := 0;
  else
    v_ir_bruto := v_base * 0.275;
    v_deducao := v_ir_bruto - 908.73;
    if bruto >= 5000.01 and bruto < 7350.01 then
      v_redutor := round(978.62 - (bruto * 0.133145), 2);
    else
      v_redutor := 0;
    end if;
    v_ir := round(v_deducao - v_redutor, 2);
    if v_ir < 0 then v_ir := 0; end if;
  end if;
  return query select v_ir, v_ir_bruto, v_deducao, v_redutor, v_base;
end $$;

create or replace function public.distancia_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns integer language plpgsql immutable as $$
declare
  R double precision := 6371000;
  dlat double precision := radians(lat2 - lat1);
  dlon double precision := radians(lon2 - lon1);
  a double precision := sin(dlat/2)^2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)^2;
  c double precision := 2*asin(sqrt(a));
begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then return null; end if;
  return (R*c)::integer;
end $$;

-- ============================================================
-- RLS — ativar e policies
-- ============================================================
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.oficinas enable row level security;
alter table public.oficineiros enable row level security;
alter table public.financial_config enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_entries_coordenador enable row level security;
alter table public.aprovacoes_quinzena enable row level security;
alter table public.abonos enable row level security;
alter table public.ordens_pagamento enable row level security;
alter table public.financial_data enable row level security;
alter table public.audit_log enable row level security;

-- helper: role do usuário logado
create or replace function public.my_role() returns text language sql stable as $$
  select perfil from public.profiles where id = auth.uid()
$$;
create or replace function public.my_escola() returns uuid language sql stable as $$
  select escola_id from public.profiles where id = auth.uid()
$$;
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and perfil='ADMIN')
$$;

-- profiles: cada um vê/edita próprio; admin vê tudo
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles for insert to authenticated with check (public.is_admin());

-- schools/oficinas/financial_config: leitura todos autenticados, escrita admin
drop policy if exists "schools_select_auth" on public.schools;
create policy "schools_select_auth" on public.schools for select to authenticated using (true);
drop policy if exists "schools_write_admin" on public.schools;
create policy "schools_write_admin" on public.schools for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "oficinas_select_auth" on public.oficinas;
create policy "oficinas_select_auth" on public.oficinas for select to authenticated using (true);
drop policy if exists "oficinas_write_admin" on public.oficinas;
create policy "oficinas_write_admin" on public.oficinas for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "fconfig_select_auth" on public.financial_config;
create policy "fconfig_select_auth" on public.financial_config for select to authenticated using (true);
drop policy if exists "fconfig_write_admin" on public.financial_config;
create policy "fconfig_write_admin" on public.financial_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- oficineiros: admin tudo, coordenador/diretor da mesma escola, oficineiro vê próprio vínculo
drop policy if exists "oficineiros_select" on public.oficineiros;
create policy "oficineiros_select" on public.oficineiros for select to authenticated using (
  public.is_admin() or escola_id = public.my_escola() or profile_id = auth.uid()
);
drop policy if exists "oficineiros_write_admin" on public.oficineiros;
create policy "oficineiros_write_admin" on public.oficineiros for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- time_entries: admin tudo, oficineiro próprios, coordenador da escola
drop policy if exists "time_select" on public.time_entries;
create policy "time_select" on public.time_entries for select to authenticated using (
  public.is_admin()
  or oficineiro_id in (select id from public.oficineiros where profile_id = auth.uid())
  or escola_id = public.my_escola()
);
drop policy if exists "time_insert" on public.time_entries;
create policy "time_insert" on public.time_entries for insert to authenticated with check (
  public.is_admin() or oficineiro_id in (select id from public.oficineiros where profile_id = auth.uid())
);
drop policy if exists "time_update_admin_coord" on public.time_entries;
create policy "time_update_admin_coord" on public.time_entries for update to authenticated using (public.is_admin() or escola_id = public.my_escola());

-- time_entries_coordenador: próprio + admin/coordenador da escola
drop policy if exists "timecoord_select" on public.time_entries_coordenador;
create policy "timecoord_select" on public.time_entries_coordenador for select to authenticated using (profile_id = auth.uid() or public.is_admin() or public.my_role() in ('COORDENADOR','DIRETOR'));
drop policy if exists "timecoord_insert" on public.time_entries_coordenador;
create policy "timecoord_insert" on public.time_entries_coordenador for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "timecoord_update" on public.time_entries_coordenador;
create policy "timecoord_update" on public.time_entries_coordenador for update to authenticated using (profile_id = auth.uid() or public.is_admin());

-- aprovacoes/abonos/ordens: admin tudo, coordenador da escola, oficineiro leitura própria
drop policy if exists "aprov_select" on public.aprovacoes_quinzena;
create policy "aprov_select" on public.aprovacoes_quinzena for select to authenticated using (
  public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola()) or oficineiro_id in (select id from public.oficineiros where profile_id = auth.uid())
);
drop policy if exists "aprov_write" on public.aprovacoes_quinzena;
create policy "aprov_write" on public.aprovacoes_quinzena for all to authenticated using (public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola())) with check (public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola()));

drop policy if exists "abonos_select" on public.abonos;
create policy "abonos_select" on public.abonos for select to authenticated using (
  public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola()) or oficineiro_id in (select id from public.oficineiros where profile_id = auth.uid())
);
drop policy if exists "abonos_write" on public.abonos;
create policy "abonos_write" on public.abonos for all to authenticated using (public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola())) with check (public.is_admin() or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola()));

drop policy if exists "ordens_select" on public.ordens_pagamento;
create policy "ordens_select" on public.ordens_pagamento for select to authenticated using (
  public.is_admin()
  or oficineiro_id in (select id from public.oficineiros where profile_id = auth.uid())
  or profile_id = auth.uid()
  or oficineiro_id in (select id from public.oficineiros where escola_id = public.my_escola())
);
drop policy if exists "ordens_write_admin" on public.ordens_pagamento;
create policy "ordens_write_admin" on public.ordens_pagamento for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "fd_select_auth" on public.financial_data;
create policy "fd_select_auth" on public.financial_data for select to authenticated using (true);
drop policy if exists "fd_write_admin" on public.financial_data;
create policy "fd_write_admin" on public.financial_data for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists "audit_insert_auth" on public.audit_log;
create policy "audit_insert_auth" on public.audit_log for insert to authenticated with check (true);

-- Storage buckets — crie manualmente em Dashboard → Storage → New bucket (públicos):
-- fotos-oficineiros, ordens-pagamento, folhas-ponto, logos
-- (removido insert em storage.buckets — requer permissão storage admin; criar via UI evita 42601)
-- insert into storage.buckets (id, name, "public") values ('fotos-oficineiros','fotos-oficineiros', true) on conflict (id) do nothing;
