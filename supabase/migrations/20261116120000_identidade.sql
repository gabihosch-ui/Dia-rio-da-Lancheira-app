-- =============================================================================
-- Migração 1 — Identidade, papéis, auditoria, notificações e exclusão de conta
-- Projeto Supabase NOVO do app (nunca aplicar no Supabase da área de membros).
--
-- Princípios:
--   * RLS habilitada em todas as tabelas; sem policy = acesso negado.
--   * Identidade sempre por auth.uid(); nunca por IDs enviados pelo cliente.
--   * Funções privilegiadas ficam no schema "private" (não exposto pela API),
--     com search_path vazio.
--   * Papel "anon" (sem login) não acessa nenhuma destas tabelas.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.papel_app as enum ('admin', 'editor', 'moderador');

-- -----------------------------------------------------------------------------
-- Utilitário: atualizado_em automático
-- -----------------------------------------------------------------------------
create or replace function private.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfis
-- O e-mail fica apenas em auth.users (não é duplicado aqui).
-- -----------------------------------------------------------------------------
create table public.perfis_privados (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome_completo     text not null default '' check (char_length(nome_completo) <= 120),
  preferencias      jsonb not null default '{}'::jsonb check (jsonb_typeof(preferencias) = 'object'),
  aceitou_termos_em timestamptz,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
comment on table public.perfis_privados is 'Dados privados: visíveis apenas para a própria pessoa.';

create table public.perfis_publicos (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome_publico  text not null check (char_length(nome_publico) between 2 and 40),
  avatar_path   text check (avatar_path is null or char_length(avatar_path) <= 300),
  suspenso_ate  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.perfis_publicos is 'Nome público e foto exibidos na comunidade. Sem e-mail ou dados privados.';

create trigger perfis_privados_atualizado_em before update on public.perfis_privados
  for each row execute function private.definir_atualizado_em();
create trigger perfis_publicos_atualizado_em before update on public.perfis_publicos
  for each row execute function private.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- Papéis administrativos
-- O primeiro admin é concedido manualmente pelo SQL Editor (ver docs/SEGURANCA.md).
-- -----------------------------------------------------------------------------
create table public.usuario_papeis (
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  papel         public.papel_app not null,
  concedido_por uuid references auth.users (id) on delete set null,
  concedido_em  timestamptz not null default now(),
  primary key (usuario_id, papel)
);

create or replace function private.tem_papel(p public.papel_app)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario_papeis
    where usuario_id = (select auth.uid()) and papel = p
  );
$$;
revoke all on function private.tem_papel(public.papel_app) from public, anon;
grant execute on function private.tem_papel(public.papel_app) to authenticated;

-- -----------------------------------------------------------------------------
-- Auditoria (somente escrita pelo servidor; leitura por admin)
-- Não registrar e-mail, tokens ou conteúdo privado em "detalhes".
-- -----------------------------------------------------------------------------
create table public.auditoria (
  id          bigint generated always as identity primary key,
  ator_id     uuid references auth.users (id) on delete set null,
  acao        text not null check (char_length(acao) <= 80),
  entidade    text not null check (char_length(entidade) <= 80),
  entidade_id text check (char_length(entidade_id) <= 120),
  detalhes    jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);
create index auditoria_criado_em_idx on public.auditoria (criado_em desc);
create index auditoria_ator_idx on public.auditoria (ator_id);

create or replace function private.registrar_auditoria(
  p_acao text, p_entidade text, p_entidade_id text, p_detalhes jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.auditoria (ator_id, acao, entidade, entidade_id, detalhes)
  values ((select auth.uid()), p_acao, p_entidade, p_entidade_id, coalesce(p_detalhes, '{}'::jsonb));
$$;
revoke all on function private.registrar_auditoria(text, text, text, jsonb) from public, anon, authenticated;

-- Toda concessão/remoção de papel fica registrada.
create or replace function private.auditar_usuario_papeis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.registrar_auditoria('papel_concedido', 'usuario_papeis', new.usuario_id::text,
      jsonb_build_object('papel', new.papel));
    return new;
  else
    perform private.registrar_auditoria('papel_removido', 'usuario_papeis', old.usuario_id::text,
      jsonb_build_object('papel', old.papel));
    return old;
  end if;
end;
$$;
create trigger usuario_papeis_auditoria after insert or delete on public.usuario_papeis
  for each row execute function private.auditar_usuario_papeis();

-- Quem concede é sempre quem está autenticado (não aceita valor do cliente).
create or replace function private.definir_concedido_por()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.concedido_por := (select auth.uid());
  new.concedido_em := now();
  return new;
end;
$$;
create trigger usuario_papeis_concedido_por before insert on public.usuario_papeis
  for each row execute function private.definir_concedido_por();

-- -----------------------------------------------------------------------------
-- Notificações (criadas pelo servidor; a pessoa só lê e marca como lida)
-- -----------------------------------------------------------------------------
create table public.notificacoes (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo       text not null check (char_length(tipo) <= 40),
  titulo     text not null check (char_length(titulo) <= 120),
  corpo      text not null default '' check (char_length(corpo) <= 500),
  dados      jsonb not null default '{}'::jsonb,
  lida_em    timestamptz,
  criado_em  timestamptz not null default now()
);
create index notificacoes_usuario_idx on public.notificacoes (usuario_id, criado_em desc);

-- -----------------------------------------------------------------------------
-- Pedidos de exclusão de conta (processados pelo servidor)
-- -----------------------------------------------------------------------------
create table public.solicitacoes_exclusao (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null unique references auth.users (id) on delete cascade,
  status        text not null default 'pendente' check (status in ('pendente', 'concluida', 'cancelada')),
  solicitado_em timestamptz not null default now()
);

create or replace function private.auditar_solicitacao_exclusao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.registrar_auditoria('exclusao_solicitada', 'solicitacoes_exclusao', new.usuario_id::text);
  return new;
end;
$$;
create trigger solicitacoes_exclusao_auditoria after insert on public.solicitacoes_exclusao
  for each row execute function private.auditar_solicitacao_exclusao();

-- -----------------------------------------------------------------------------
-- Criação automática dos perfis no cadastro
-- Os metadados vêm do cliente: tratados como não confiáveis (aparados e limitados).
-- -----------------------------------------------------------------------------
create or replace function private.criar_perfis_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := left(btrim(coalesce(new.raw_user_meta_data ->> 'nome', '')), 120);
  v_publico text := left(btrim(coalesce(new.raw_user_meta_data ->> 'nome_publico', '')), 40);
begin
  if char_length(v_publico) < 2 then
    v_publico := 'Membro ' || left(new.id::text, 4);
  end if;
  insert into public.perfis_privados (id, nome_completo) values (new.id, v_nome);
  insert into public.perfis_publicos (id, nome_publico) values (new.id, v_publico);
  return new;
end;
$$;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function private.criar_perfis_novo_usuario();

-- =============================================================================
-- Permissões e RLS
-- =============================================================================
alter table public.perfis_privados       enable row level security;
alter table public.perfis_publicos       enable row level security;
alter table public.usuario_papeis        enable row level security;
alter table public.auditoria             enable row level security;
alter table public.notificacoes          enable row level security;
alter table public.solicitacoes_exclusao enable row level security;

-- Defesa em profundidade: sem login, nenhum acesso.
revoke all on public.perfis_privados, public.perfis_publicos, public.usuario_papeis,
  public.auditoria, public.notificacoes, public.solicitacoes_exclusao from anon;

-- Privilégios por coluna: o que a pessoa pode alterar em si mesma.
revoke insert, update, delete on public.perfis_privados from authenticated;
grant update (nome_completo, preferencias, aceitou_termos_em) on public.perfis_privados to authenticated;

revoke insert, update, delete on public.perfis_publicos from authenticated;
grant update (nome_publico, avatar_path) on public.perfis_publicos to authenticated;

revoke update on public.usuario_papeis from authenticated;

revoke insert, update, delete on public.auditoria from authenticated;

revoke insert, update, delete on public.notificacoes from authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

revoke update, delete on public.solicitacoes_exclusao from authenticated;

-- perfis_privados: somente a própria pessoa
create policy "perfil privado: ler o próprio" on public.perfis_privados
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil privado: editar o próprio" on public.perfis_privados
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- perfis_publicos: qualquer pessoa logada lê (na Fase 3 passa a exigir assinatura); só o dono edita
create policy "perfil público: leitura por usuários logados" on public.perfis_publicos
  for select to authenticated using (true);
create policy "perfil público: editar o próprio" on public.perfis_publicos
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- usuario_papeis: cada um vê os seus; admin vê e gerencia todos
create policy "papéis: ver os próprios ou admin" on public.usuario_papeis
  for select to authenticated using (usuario_id = (select auth.uid()) or (select private.tem_papel('admin')));
create policy "papéis: admin concede" on public.usuario_papeis
  for insert to authenticated with check ((select private.tem_papel('admin')));
create policy "papéis: admin remove" on public.usuario_papeis
  for delete to authenticated using ((select private.tem_papel('admin')));

-- auditoria: somente admin lê; ninguém escreve pelo app
create policy "auditoria: leitura por admin" on public.auditoria
  for select to authenticated using ((select private.tem_papel('admin')));

-- notificacoes: a própria pessoa lê e marca como lida
create policy "notificações: ler as próprias" on public.notificacoes
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "notificações: marcar as próprias" on public.notificacoes
  for update to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));

-- solicitacoes_exclusao: a própria pessoa solicita e acompanha
create policy "exclusão: ver a própria" on public.solicitacoes_exclusao
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "exclusão: solicitar a própria" on public.solicitacoes_exclusao
  for insert to authenticated with check (usuario_id = (select auth.uid()) and status = 'pendente');
