# Banco de dados

Projeto Supabase **novo e independente** (`diario-lancheira-dev`). Migrações em `supabase/migrations/`, aplicadas com `npx.cmd supabase db push --remote`.

| Migração | Conteúdo |
|---|---|
| `20261116120000_identidade` | perfis, papéis, auditoria, notificações |
| `20261116180000_exclusao_imediata` | remove pedidos de exclusão (exclusão via Edge Function) |
| `20261117090000_receitas` | biblioteca de receitas, favoritos, direitos de acesso, bucket de capas |

As seções "Planejador", "Comunidade" e "Assinaturas" abaixo ainda são **propostas** para as próximas fases.

Convenções: `uuid` como PK, `created_at/updated_at`, FKs com `on delete` explícito, RLS habilitada em tudo, nomes em português sem acento (snake_case).

## Identidade
- `perfis_privados` (id = auth.users.id, nome, email*, criado_em, configuracoes jsonb) — RLS: só o dono.
- `perfis_publicos` (id, nome_publico, avatar_path) — leitura por assinantes; escrita só o dono.
- `papeis` / `usuario_papeis` (admin, editor, moderador) — leitura/escrita só via funções admin.
- `dispositivos` (opcional, se for preciso limitar aparelhos).

\* e-mail fica em `auth.users`; duplicar só se necessário.

## Receitas (implementado — migração 3)

| Tabela | Conteúdo | Quem lê (RLS) | Quem escreve |
|---|---|---|---|
| `unidades` | id (`xicara`, `colher_sopa`…), singular, plural, abreviação | logados | só migração |
| `categorias_receita` | nome, slug, emoji, ordem, ativa | logados (ativas); equipe (todas) | equipe (admin/editor); remover: admin |
| `receitas` | título, slug, descrição, `capa_path`, tempos (preparo, forno, **total** calculado), rendimento, `pode_congelar`, `exclusiva`, `destaque`, `status` (rascunho/publicada/despublicada), `busca` (sem acento) | logados: só **publicadas** e só colunas públicas; equipe: todas | só funções `admin_*` |
| `receita_categorias` | N:N receita ↔ categoria | conforme a receita | funções `admin_*` |
| `receita_ingredientes` | ordem, nome, quantidade (>0), `unidade_id` (FK), observação | **conteúdo protegido** | funções `admin_*` |
| `receita_passos` | ordem, texto | **conteúdo protegido** | funções `admin_*` |
| `receita_congelamento` | prazo (dias), como embalar, como descongelar (sempre cadastrados pela equipe) | **conteúdo protegido** | funções `admin_*` |
| `receita_videos` | provedor, `provider_video_id`, status (pendente/pronto/erro), duração | **conteúdo protegido**; `provider_video_id` nunca é exposto ao app | funções `admin_*` |
| `receitas_favoritas` | (usuário, receita) único | só os próprios | só os próprios; só receitas publicadas |
| `direitos_acesso` | usuário, tipo (`teste`/`assinatura`), validade, motivo, concedido por, revogado em | os próprios; admin todos | só `admin_conceder_acesso_teste` / `admin_revogar_acesso` |
| `registro_tokens_video` | pedidos de token de vídeo (limite contra abuso) | ninguém pelo app | Edge Function |

**Conteúdo protegido** = `private.pode_ver_conteudo(receita)`: equipe, ou receita publicada **e** (não exclusiva **ou** `private.tem_acesso_clube()`).

**Regra central de acesso** = `private.tem_acesso_clube()`: logado **e** (admin/editor **ou** direito ativo em `direitos_acesso`, não revogado e dentro da validade). Hoje só existe o tipo `teste`; a futura assinatura gravará `tipo = 'assinatura'` na mesma tabela.

Funções expostas (todas exigem login; as `admin_*` verificam o papel por dentro e registram auditoria):
- `meu_acesso_clube()` → situação de acesso da pessoa (para a interface).
- `admin_salvar_receita(jsonb)` → cria/edita a receita completa numa transação (ingredientes e etapas na ordem da lista).
- `admin_definir_status_receita(id, status)` → publicar exige ≥1 ingrediente, ≥1 etapa e, se congela, dados de congelamento.
- `admin_obter_receita(id)`, `admin_excluir_receita(id)` (só admin).
- `admin_conceder_acesso_teste(email, dias 1–90, motivo)`, `admin_revogar_acesso(id)`, `admin_listar_acessos()` (só admin).

**Favoritos de receita despublicada:** a linha continua guardada, mas a listagem faz junção com receitas publicadas, então ela some da lista e volta se a receita for republicada. Se a receita for excluída, o favorito é apagado em cascata.

**Storage:** bucket `receitas` (leitura pública das capas, que são vitrine do catálogo), até 5 MB, apenas JPEG/PNG/WebP, envio/troca/remoção só pela equipe e só em `capas/`. Conteúdo exclusivo (ingredientes, preparo, vídeo) **não** fica em armazenamento público.

**Planejador (próxima fase):** usará `id` da receita, ingredientes estruturados (nome, quantidade, `unidade_id`), rendimento e categorias — contrato `PlannerRecipeSource` / `getForPlanner` em `src/services`.

## Planejador
- `planejamentos` (usuario_id, titulo, semana_inicio, status [rascunho|ativo|arquivado], etapa_atual).
- `planejamento_receitas` (planejamento_id, receita_id, status_preparo [preparar|pronta]).
- `planejamento_dias` (planejamento_id, dia, receita_id) e `planejamento_dia_itens` (item_id ou texto personalizado).
- `itens_acompanhamento` (tipo [fruta|proteina|acompanhamento], nome, emoji) — administráveis.
- `planejamento_despensa` (planejamento_id, ingrediente_id).
- Lista de compras: **calculada** (não armazenada), mesma regra de `src/lib/planner.ts`.
- `regras_planejador` (min_receitas=2, max_receitas=5) — configurável.
- RLS: tudo filtrado por `usuario_id = auth.uid()`.

## Comunidade
- `publicacoes` (autor_id, tipo [relato|pergunta|dica|minha-receita], texto, status_moderacao, removida_em).
- `publicacao_imagens` (path em bucket privado, largura, altura).
- `comentarios` (oculto bool), `curtidas` (PK composta), `denuncias` (motivo, status), `bloqueios` (bloqueador, bloqueado).
- `acoes_moderacao` (moderador, alvo, acao, motivo) — trilha de auditoria.
- `notificacoes` (usuario_id, tipo, payload, lida).

## Assinaturas
- `planos` (id, nome, preco_referencia, periodo).
- `assinaturas` (usuario_id, plataforma [apple|google], produto_id, transacao_original_id UNIQUE, status, periodo_fim, renovacao_automatica).
- `eventos_pagamento` (plataforma, evento_id UNIQUE p/ idempotência, payload, processado_em).
- `direitos_acesso` (usuario_id, direito, valido_ate, origem) — fonte única consultada pela RLS.
- Escrita apenas por Edge Functions (service role no servidor).

## Administração
- `auditoria` (ator, acao, entidade, entidade_id, dados jsonb sem PII, criado_em).
- `configuracoes_admin` (chave, valor).
