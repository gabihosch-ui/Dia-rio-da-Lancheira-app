-- =============================================================================
-- Migração 3 — Biblioteca de receitas, direitos de acesso e favoritos
--
-- Regras centrais:
--   * Metadados de receitas PUBLICADAS (título, foto, tempo...) são visíveis a
--     qualquer pessoa logada — é a vitrine do Clube.
--   * Conteúdo (ingredientes, preparo, congelamento, vídeo) de receitas
--     exclusivas só é entregue a quem tem direito: equipe (admin/editor) ou
--     direito de acesso ativo (teste concedido por admin; no futuro, assinatura).
--   * Rascunhos e receitas despublicadas só são vistos pela equipe.
--   * Escrita de receitas apenas por funções administrativas (security definer)
--     que verificam o papel e registram auditoria. Nenhuma escrita direta.
--   * Direito de acesso de TESTE não é comprovante de pagamento.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

-- Normalização usada na busca (sem acento, minúsculas).
create or replace function private.normalizar_busca(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;
grant execute on function private.normalizar_busca(text) to authenticated;

create or replace function private.slugificar(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(trim(both '-' from regexp_replace(private.normalizar_busca(t), '[^a-z0-9]+', '-', 'g')), 80);
$$;

create or replace function private.pode_editar_receitas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.tem_papel('admin') or private.tem_papel('editor');
$$;
revoke all on function private.pode_editar_receitas() from public, anon;
grant execute on function private.pode_editar_receitas() to authenticated;

-- -----------------------------------------------------------------------------
-- Direitos de acesso ao conteúdo do Clube
-- tipo 'teste'      = concedido manualmente por admin (desenvolvimento/homologação)
-- tipo 'assinatura' = reservado para a futura validação de compras nas lojas
-- -----------------------------------------------------------------------------
create type public.tipo_direito as enum ('teste', 'assinatura');

create table public.direitos_acesso (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  tipo          public.tipo_direito not null,
  valido_de     timestamptz not null default now(),
  valido_ate    timestamptz not null,
  motivo        text check (motivo is null or char_length(motivo) <= 200),
  concedido_por uuid references auth.users (id) on delete set null,
  revogado_em   timestamptz,
  criado_em     timestamptz not null default now(),
  check (valido_ate > valido_de)
);
create index direitos_acesso_usuario_idx on public.direitos_acesso (usuario_id, valido_ate desc);

-- Regra CENTRAL de acesso ao conteúdo exclusivo.
create or replace function private.tem_acesso_clube()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    private.pode_editar_receitas()
    or exists (
      select 1 from public.direitos_acesso d
      where d.usuario_id = (select auth.uid())
        and d.revogado_em is null
        and now() >= d.valido_de
        and now() < d.valido_ate
    )
  );
$$;
revoke all on function private.tem_acesso_clube() from public, anon;
grant execute on function private.tem_acesso_clube() to authenticated;

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table public.unidades (
  id         text primary key check (id ~ '^[a-z_]{1,20}$'),
  singular   text not null,
  plural     text not null,
  abreviacao text not null,
  ordem      int not null default 0
);

insert into public.unidades (id, singular, plural, abreviacao, ordem) values
  ('unidade', 'unidade', 'unidades', 'un.', 1),
  ('xicara', 'xícara', 'xícaras', 'xíc.', 2),
  ('colher_sopa', 'colher de sopa', 'colheres de sopa', 'c. sopa', 3),
  ('colher_cha', 'colher de chá', 'colheres de chá', 'c. chá', 4),
  ('g', 'grama', 'gramas', 'g', 5),
  ('kg', 'quilo', 'quilos', 'kg', 6),
  ('ml', 'mililitro', 'mililitros', 'ml', 7),
  ('l', 'litro', 'litros', 'l', 8),
  ('pitada', 'pitada', 'pitadas', 'pitada', 9),
  ('fatia', 'fatia', 'fatias', 'fatia', 10),
  ('dente', 'dente', 'dentes', 'dente', 11);

create table public.categorias_receita (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (char_length(btrim(nome)) between 2 and 40),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  emoji         text check (emoji is null or char_length(emoji) <= 8),
  ordem         int not null default 0,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger categorias_receita_atualizado_em before update on public.categorias_receita
  for each row execute function private.definir_atualizado_em();

insert into public.categorias_receita (nome, slug, emoji, ordem) values
  ('Lancheiras', 'lancheiras', '🍱', 1),
  ('Pães', 'paes', '🍞', 2),
  ('Bolinhos', 'bolinhos', '🧁', 3),
  ('Salgados', 'salgados', '🥟', 4),
  ('Doces', 'doces', '🍪', 5),
  ('Congelamento', 'congelamento', '❄️', 6),
  ('Sem glúten', 'sem-gluten', '🌾', 7);

create type public.status_receita as enum ('rascunho', 'publicada', 'despublicada');

create table public.receitas (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  titulo              text not null check (char_length(btrim(titulo)) between 3 and 120),
  descricao           text not null default '' check (char_length(descricao) <= 600),
  capa_path           text check (capa_path is null or capa_path ~ '^capas/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  tempo_preparo_min   int not null check (tempo_preparo_min between 0 and 1440),
  tempo_cozimento_min int not null default 0 check (tempo_cozimento_min between 0 and 1440),
  rendimento          text not null default '' check (char_length(rendimento) <= 60),
  pode_congelar       boolean not null default false,
  exclusiva           boolean not null default true,
  destaque            boolean not null default false,
  status              public.status_receita not null default 'rascunho',
  publicada_em        timestamptz,
  busca               text not null default '',
  criado_por          uuid references auth.users (id) on delete set null,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index receitas_publicadas_idx on public.receitas (status, publicada_em desc);
create index receitas_destaque_idx on public.receitas (destaque) where destaque;

create or replace function private.receitas_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.titulo := btrim(new.titulo);
  new.busca := private.normalizar_busca(new.titulo);
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger receitas_antes_de_gravar before insert or update on public.receitas
  for each row execute function private.receitas_antes_de_gravar();

create table public.receita_categorias (
  receita_id   uuid not null references public.receitas (id) on delete cascade,
  categoria_id uuid not null references public.categorias_receita (id) on delete cascade,
  primary key (receita_id, categoria_id)
);
create index receita_categorias_categoria_idx on public.receita_categorias (categoria_id);

-- Conteúdo protegido ----------------------------------------------------------
create table public.receita_ingredientes (
  id         uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas (id) on delete cascade,
  ordem      int not null check (ordem >= 0),
  nome       text not null check (char_length(btrim(nome)) between 1 and 120),
  quantidade numeric(10, 3) check (quantidade is null or quantidade > 0),
  unidade_id text references public.unidades (id),
  observacao text check (observacao is null or char_length(observacao) <= 120),
  unique (receita_id, ordem),
  check (unidade_id is null or quantidade is not null)
);

create table public.receita_passos (
  id         uuid primary key default gen_random_uuid(),
  receita_id uuid not null references public.receitas (id) on delete cascade,
  ordem      int not null check (ordem >= 0),
  texto      text not null check (char_length(btrim(texto)) between 1 and 1000),
  unique (receita_id, ordem)
);

create table public.receita_congelamento (
  receita_id       uuid primary key references public.receitas (id) on delete cascade,
  prazo_dias       int not null check (prazo_dias between 1 and 365),
  como_embalar     text not null default '' check (char_length(como_embalar) <= 600),
  como_descongelar text not null default '' check (char_length(como_descongelar) <= 600)
);

create table public.receita_videos (
  receita_id        uuid primary key references public.receitas (id) on delete cascade,
  provedor          text not null default 'cloudflare_stream' check (provedor in ('cloudflare_stream')),
  provider_video_id text not null check (provider_video_id ~ '^[A-Za-z0-9]{8,64}$'),
  status            text not null default 'pendente' check (status in ('pendente', 'pronto', 'erro')),
  duracao_segundos  int check (duracao_segundos is null or duracao_segundos > 0),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create trigger receita_videos_atualizado_em before update on public.receita_videos
  for each row execute function private.definir_atualizado_em();

-- Quem pode ver o CONTEÚDO de uma receita.
create or replace function private.pode_ver_conteudo(p_receita uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.receitas r
    where r.id = p_receita
      and (
        private.pode_editar_receitas()
        or (r.status = 'publicada' and (not r.exclusiva or private.tem_acesso_clube()))
      )
  );
$$;
revoke all on function private.pode_ver_conteudo(uuid) from public, anon;
grant execute on function private.pode_ver_conteudo(uuid) to authenticated;

-- Favoritos -------------------------------------------------------------------
create table public.receitas_favoritas (
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receita_id uuid not null references public.receitas (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, receita_id)
);
create index receitas_favoritas_receita_idx on public.receitas_favoritas (receita_id);

-- Registro de tokens de vídeo (limite contra abuso; somente servidor) ----------
create table public.registro_tokens_video (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  receita_id uuid not null references public.receitas (id) on delete cascade,
  criado_em  timestamptz not null default now()
);
create index registro_tokens_video_usuario_idx on public.registro_tokens_video (usuario_id, criado_em desc);

-- =============================================================================
-- Permissões e RLS
-- =============================================================================
alter table public.direitos_acesso       enable row level security;
alter table public.unidades              enable row level security;
alter table public.categorias_receita    enable row level security;
alter table public.receitas              enable row level security;
alter table public.receita_categorias    enable row level security;
alter table public.receita_ingredientes  enable row level security;
alter table public.receita_passos        enable row level security;
alter table public.receita_congelamento  enable row level security;
alter table public.receita_videos        enable row level security;
alter table public.receitas_favoritas    enable row level security;
alter table public.registro_tokens_video enable row level security;

revoke all on public.direitos_acesso, public.unidades, public.categorias_receita, public.receitas,
  public.receita_categorias, public.receita_ingredientes, public.receita_passos, public.receita_congelamento,
  public.receita_videos, public.receitas_favoritas, public.registro_tokens_video from anon;

-- Sem escrita direta pelo app: tudo passa pelas funções administrativas abaixo.
revoke insert, update, delete, truncate on public.direitos_acesso, public.unidades, public.receitas,
  public.receita_categorias, public.receita_ingredientes, public.receita_passos, public.receita_congelamento,
  public.receita_videos, public.registro_tokens_video from authenticated;
revoke select on public.registro_tokens_video from authenticated;

-- Colunas de receitas visíveis ao app (sem criado_por / criado_em).
revoke select on public.receitas from authenticated;
grant select (id, slug, titulo, descricao, capa_path, tempo_preparo_min, tempo_cozimento_min, rendimento,
  pode_congelar, exclusiva, destaque, status, publicada_em, busca, atualizado_em) on public.receitas to authenticated;

-- Vídeo: o identificador no provedor nunca vai para o app.
revoke select on public.receita_videos from authenticated;
grant select (receita_id, status, duracao_segundos) on public.receita_videos to authenticated;

-- Favoritos: só inserir e apagar os próprios.
revoke update, truncate on public.receitas_favoritas from authenticated;

create policy "direitos: ver os próprios ou admin" on public.direitos_acesso
  for select to authenticated using (usuario_id = (select auth.uid()) or (select private.tem_papel('admin')));

create policy "unidades: leitura" on public.unidades
  for select to authenticated using (true);

create policy "categorias: leitura das ativas" on public.categorias_receita
  for select to authenticated using (ativa or (select private.pode_editar_receitas()));
create policy "categorias: equipe cria" on public.categorias_receita
  for insert to authenticated with check ((select private.pode_editar_receitas()));
create policy "categorias: equipe edita" on public.categorias_receita
  for update to authenticated using ((select private.pode_editar_receitas()))
  with check ((select private.pode_editar_receitas()));
create policy "categorias: admin remove" on public.categorias_receita
  for delete to authenticated using ((select private.tem_papel('admin')));

create policy "receitas: publicadas para logados; tudo para a equipe" on public.receitas
  for select to authenticated using (status = 'publicada' or (select private.pode_editar_receitas()));

create policy "receita_categorias: conforme a receita" on public.receita_categorias
  for select to authenticated using (
    exists (select 1 from public.receitas r where r.id = receita_id)
  );

create policy "ingredientes: só com direito ao conteúdo" on public.receita_ingredientes
  for select to authenticated using (private.pode_ver_conteudo(receita_id));
create policy "passos: só com direito ao conteúdo" on public.receita_passos
  for select to authenticated using (private.pode_ver_conteudo(receita_id));
create policy "congelamento: só com direito ao conteúdo" on public.receita_congelamento
  for select to authenticated using (private.pode_ver_conteudo(receita_id));
create policy "vídeos: só com direito ao conteúdo" on public.receita_videos
  for select to authenticated using (private.pode_ver_conteudo(receita_id));

create policy "favoritos: ver os próprios" on public.receitas_favoritas
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "favoritos: adicionar receita publicada" on public.receitas_favoritas
  for insert to authenticated with check (
    usuario_id = (select auth.uid())
    and exists (select 1 from public.receitas r where r.id = receita_id and r.status = 'publicada')
  );
create policy "favoritos: remover os próprios" on public.receitas_favoritas
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- =============================================================================
-- Funções para o app
-- =============================================================================

-- Situação de acesso da pessoa logada (para a interface; a proteção real é a RLS).
create or replace function public.meu_acesso_clube()
returns table (tem_acesso boolean, origem text, valido_ate timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.tem_acesso_clube(),
    case
      when private.pode_editar_receitas() then 'equipe'
      else (select d.tipo::text from public.direitos_acesso d
            where d.usuario_id = (select auth.uid()) and d.revogado_em is null
              and now() >= d.valido_de and now() < d.valido_ate
            order by d.valido_ate desc limit 1)
    end,
    (select max(d.valido_ate) from public.direitos_acesso d
     where d.usuario_id = (select auth.uid()) and d.revogado_em is null
       and now() >= d.valido_de and now() < d.valido_ate);
$$;
revoke all on function public.meu_acesso_clube() from public, anon;
grant execute on function public.meu_acesso_clube() to authenticated;

-- =============================================================================
-- Funções administrativas (verificam papel, validam e auditam)
-- =============================================================================

create or replace function private.exigir_editor()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.pode_editar_receitas() then
    raise exception 'permissao_negada' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.exigir_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.tem_papel('admin') then
    raise exception 'permissao_negada' using errcode = '42501';
  end if;
end;
$$;

-- Verifica se a receita pode ficar publicada.
create or replace function private.validar_publicacao(p_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  r public.receitas;
begin
  select * into r from public.receitas where id = p_id;
  if not exists (select 1 from public.receita_ingredientes where receita_id = p_id) then
    raise exception 'publicacao_invalida: cadastre ao menos um ingrediente' using errcode = '22023';
  end if;
  if not exists (select 1 from public.receita_passos where receita_id = p_id) then
    raise exception 'publicacao_invalida: cadastre ao menos uma etapa de preparo' using errcode = '22023';
  end if;
  if r.pode_congelar and not exists (select 1 from public.receita_congelamento where receita_id = p_id) then
    raise exception 'publicacao_invalida: informe os dados de congelamento' using errcode = '22023';
  end if;
end;
$$;

/*
  Cria ou atualiza uma receita completa numa única transação.
  p = {
    id?, titulo, slug?, descricao, capa_path?, tempo_preparo_min, tempo_cozimento_min, rendimento,
    pode_congelar, exclusiva, destaque,
    categorias: [uuid],
    ingredientes: [{nome, quantidade?, unidade_id?, observacao?}],   -- ordem = posição na lista
    passos: [texto],
    congelamento?: {prazo_dias, como_embalar, como_descongelar},
    video?: {provider_video_id, status?, duracao_segundos?}
  }
  O status (publicar/despublicar) é alterado em admin_definir_status_receita.
*/
create or replace function public.admin_salvar_receita(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_slug text;
  v_status public.status_receita;
begin
  perform private.exigir_editor();

  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p -> 'ingredientes', '[]')) <> 'array'
     or jsonb_typeof(coalesce(p -> 'passos', '[]')) <> 'array'
     or jsonb_typeof(coalesce(p -> 'categorias', '[]')) <> 'array' then
    raise exception 'dados_invalidos: listas esperadas' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p -> 'ingredientes', '[]')) > 60
     or jsonb_array_length(coalesce(p -> 'passos', '[]')) > 40 then
    raise exception 'dados_invalidos: listas grandes demais' using errcode = '22023';
  end if;

  v_slug := coalesce(nullif(btrim(p ->> 'slug'), ''), private.slugificar(p ->> 'titulo'));

  if v_id is null then
    insert into public.receitas (slug, titulo, descricao, capa_path, tempo_preparo_min, tempo_cozimento_min,
      rendimento, pode_congelar, exclusiva, destaque, criado_por)
    values (
      v_slug,
      p ->> 'titulo',
      coalesce(p ->> 'descricao', ''),
      nullif(p ->> 'capa_path', ''),
      (p ->> 'tempo_preparo_min')::int,
      coalesce((p ->> 'tempo_cozimento_min')::int, 0),
      coalesce(p ->> 'rendimento', ''),
      coalesce((p ->> 'pode_congelar')::boolean, false),
      coalesce((p ->> 'exclusiva')::boolean, true),
      coalesce((p ->> 'destaque')::boolean, false),
      (select auth.uid())
    )
    returning id into v_id;
  else
    update public.receitas set
      slug = v_slug,
      titulo = p ->> 'titulo',
      descricao = coalesce(p ->> 'descricao', ''),
      capa_path = nullif(p ->> 'capa_path', ''),
      tempo_preparo_min = (p ->> 'tempo_preparo_min')::int,
      tempo_cozimento_min = coalesce((p ->> 'tempo_cozimento_min')::int, 0),
      rendimento = coalesce(p ->> 'rendimento', ''),
      pode_congelar = coalesce((p ->> 'pode_congelar')::boolean, false),
      exclusiva = coalesce((p ->> 'exclusiva')::boolean, true),
      destaque = coalesce((p ->> 'destaque')::boolean, false)
    where id = v_id
    returning status into v_status;
    if not found then
      raise exception 'receita_nao_encontrada' using errcode = 'P0002';
    end if;
  end if;

  delete from public.receita_categorias where receita_id = v_id;
  insert into public.receita_categorias (receita_id, categoria_id)
  select distinct v_id, c::uuid from jsonb_array_elements_text(coalesce(p -> 'categorias', '[]')) as c;

  delete from public.receita_ingredientes where receita_id = v_id;
  insert into public.receita_ingredientes (receita_id, ordem, nome, quantidade, unidade_id, observacao)
  select v_id, (i.ord - 1)::int, btrim(i.val ->> 'nome'),
         nullif(i.val ->> 'quantidade', '')::numeric,
         nullif(i.val ->> 'unidade_id', ''),
         nullif(btrim(coalesce(i.val ->> 'observacao', '')), '')
  from jsonb_array_elements(coalesce(p -> 'ingredientes', '[]')) with ordinality as i(val, ord);

  delete from public.receita_passos where receita_id = v_id;
  insert into public.receita_passos (receita_id, ordem, texto)
  select v_id, (s.ord - 1)::int, btrim(s.val)
  from jsonb_array_elements_text(coalesce(p -> 'passos', '[]')) with ordinality as s(val, ord);

  if coalesce((p ->> 'pode_congelar')::boolean, false) and jsonb_typeof(p -> 'congelamento') = 'object' then
    insert into public.receita_congelamento (receita_id, prazo_dias, como_embalar, como_descongelar)
    values (v_id, (p -> 'congelamento' ->> 'prazo_dias')::int,
            coalesce(p -> 'congelamento' ->> 'como_embalar', ''),
            coalesce(p -> 'congelamento' ->> 'como_descongelar', ''))
    on conflict (receita_id) do update set
      prazo_dias = excluded.prazo_dias,
      como_embalar = excluded.como_embalar,
      como_descongelar = excluded.como_descongelar;
  else
    delete from public.receita_congelamento where receita_id = v_id;
  end if;

  if jsonb_typeof(p -> 'video') = 'object' and nullif(p -> 'video' ->> 'provider_video_id', '') is not null then
    insert into public.receita_videos (receita_id, provider_video_id, status, duracao_segundos)
    values (v_id, p -> 'video' ->> 'provider_video_id',
            coalesce(nullif(p -> 'video' ->> 'status', ''), 'pendente'),
            nullif(p -> 'video' ->> 'duracao_segundos', '')::int)
    on conflict (receita_id) do update set
      provider_video_id = excluded.provider_video_id,
      status = excluded.status,
      duracao_segundos = excluded.duracao_segundos;
  else
    delete from public.receita_videos where receita_id = v_id;
  end if;

  -- Receita já publicada continua precisando estar completa.
  if v_status = 'publicada' then
    perform private.validar_publicacao(v_id);
  end if;

  perform private.registrar_auditoria('receita_salva', 'receitas', v_id::text);
  return v_id;
end;
$$;

create or replace function public.admin_definir_status_receita(p_id uuid, p_status public.status_receita)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_editor();
  if not exists (select 1 from public.receitas where id = p_id) then
    raise exception 'receita_nao_encontrada' using errcode = 'P0002';
  end if;
  if p_status = 'publicada' then
    perform private.validar_publicacao(p_id);
  end if;
  update public.receitas
     set status = p_status,
         publicada_em = case when p_status = 'publicada' then coalesce(publicada_em, now()) else publicada_em end
   where id = p_id;
  perform private.registrar_auditoria('receita_status', 'receitas', p_id::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_excluir_receita(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin();
  delete from public.receitas where id = p_id;
  if not found then
    raise exception 'receita_nao_encontrada' using errcode = 'P0002';
  end if;
  perform private.registrar_auditoria('receita_excluida', 'receitas', p_id::text);
end;
$$;

-- Leitura completa para o painel (inclui rascunhos e o ID do vídeo no provedor).
create or replace function public.admin_obter_receita(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.exigir_editor();
  select jsonb_build_object(
    'id', r.id, 'slug', r.slug, 'titulo', r.titulo, 'descricao', r.descricao, 'capa_path', r.capa_path,
    'tempo_preparo_min', r.tempo_preparo_min, 'tempo_cozimento_min', r.tempo_cozimento_min,
    'rendimento', r.rendimento, 'pode_congelar', r.pode_congelar, 'exclusiva', r.exclusiva,
    'destaque', r.destaque, 'status', r.status, 'publicada_em', r.publicada_em, 'atualizado_em', r.atualizado_em,
    'categorias', coalesce((select jsonb_agg(rc.categoria_id) from public.receita_categorias rc where rc.receita_id = r.id), '[]'),
    'ingredientes', coalesce((select jsonb_agg(jsonb_build_object('nome', i.nome, 'quantidade', i.quantidade,
        'unidade_id', i.unidade_id, 'observacao', i.observacao) order by i.ordem)
      from public.receita_ingredientes i where i.receita_id = r.id), '[]'),
    'passos', coalesce((select jsonb_agg(s.texto order by s.ordem) from public.receita_passos s where s.receita_id = r.id), '[]'),
    'congelamento', (select jsonb_build_object('prazo_dias', c.prazo_dias, 'como_embalar', c.como_embalar,
        'como_descongelar', c.como_descongelar) from public.receita_congelamento c where c.receita_id = r.id),
    'video', (select jsonb_build_object('provider_video_id', v.provider_video_id, 'status', v.status,
        'duracao_segundos', v.duracao_segundos) from public.receita_videos v where v.receita_id = r.id)
  ) into v
  from public.receitas r where r.id = p_id;
  if v is null then
    raise exception 'receita_nao_encontrada' using errcode = 'P0002';
  end if;
  return v;
end;
$$;

-- Direitos de teste ------------------------------------------------------------
create or replace function public.admin_conceder_acesso_teste(p_email text, p_dias int, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
  v_id uuid;
begin
  perform private.exigir_admin();
  if p_dias is null or p_dias < 1 or p_dias > 90 then
    raise exception 'dados_invalidos: prazo entre 1 e 90 dias' using errcode = '22023';
  end if;
  select id into v_usuario from auth.users where lower(email) = lower(btrim(p_email));
  if v_usuario is null then
    raise exception 'usuario_nao_encontrado' using errcode = 'P0002';
  end if;
  insert into public.direitos_acesso (usuario_id, tipo, valido_ate, motivo, concedido_por)
  values (v_usuario, 'teste', now() + make_interval(days => p_dias), left(nullif(btrim(p_motivo), ''), 200),
          (select auth.uid()))
  returning id into v_id;
  perform private.registrar_auditoria('acesso_teste_concedido', 'direitos_acesso', v_id::text,
    jsonb_build_object('usuario_id', v_usuario, 'dias', p_dias));
  return v_id;
end;
$$;

create or replace function public.admin_revogar_acesso(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin();
  update public.direitos_acesso set revogado_em = now() where id = p_id and revogado_em is null;
  if not found then
    raise exception 'acesso_nao_encontrado' using errcode = 'P0002';
  end if;
  perform private.registrar_auditoria('acesso_revogado', 'direitos_acesso', p_id::text);
end;
$$;

create or replace function public.admin_listar_acessos()
returns table (id uuid, email text, tipo public.tipo_direito, valido_ate timestamptz, revogado_em timestamptz,
               motivo text, criado_em timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin();
  return query
    select d.id, u.email::text, d.tipo, d.valido_ate, d.revogado_em, d.motivo, d.criado_em
    from public.direitos_acesso d join auth.users u on u.id = d.usuario_id
    order by d.criado_em desc
    limit 200;
end;
$$;

-- Execução: apenas usuários logados (a verificação de papel é feita dentro).
revoke all on function public.admin_salvar_receita(jsonb) from public, anon;
revoke all on function public.admin_definir_status_receita(uuid, public.status_receita) from public, anon;
revoke all on function public.admin_excluir_receita(uuid) from public, anon;
revoke all on function public.admin_obter_receita(uuid) from public, anon;
revoke all on function public.admin_conceder_acesso_teste(text, int, text) from public, anon;
revoke all on function public.admin_revogar_acesso(uuid) from public, anon;
revoke all on function public.admin_listar_acessos() from public, anon;
grant execute on function public.admin_salvar_receita(jsonb) to authenticated;
grant execute on function public.admin_definir_status_receita(uuid, public.status_receita) to authenticated;
grant execute on function public.admin_excluir_receita(uuid) to authenticated;
grant execute on function public.admin_obter_receita(uuid) to authenticated;
grant execute on function public.admin_conceder_acesso_teste(text, int, text) to authenticated;
grant execute on function public.admin_revogar_acesso(uuid) to authenticated;
grant execute on function public.admin_listar_acessos() to authenticated;

-- =============================================================================
-- Fotos das receitas (Storage)
-- Capas são vitrine (bucket público para leitura); só a equipe envia/troca/apaga.
-- Tipos e tamanho são limitados no próprio bucket.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receitas', 'receitas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "receitas (storage): equipe envia capas" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'receitas'
    and (storage.foldername(name))[1] = 'capas'
    and (select private.pode_editar_receitas())
  );
create policy "receitas (storage): equipe troca capas" on storage.objects
  for update to authenticated using (bucket_id = 'receitas' and (select private.pode_editar_receitas()))
  with check (bucket_id = 'receitas' and (storage.foldername(name))[1] = 'capas' and (select private.pode_editar_receitas()));
create policy "receitas (storage): equipe apaga capas" on storage.objects
  for delete to authenticated using (bucket_id = 'receitas' and (select private.pode_editar_receitas()));
create policy "receitas (storage): equipe lista capas" on storage.objects
  for select to authenticated using (bucket_id = 'receitas' and (select private.pode_editar_receitas()));
