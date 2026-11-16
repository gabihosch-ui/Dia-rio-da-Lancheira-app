# Banco de dados (proposta para revisão — nada foi criado)

Projeto Supabase **novo e independente**. Nenhuma migração foi executada na Fase 1. Esta é uma proposta inicial para revisar antes da Fase 2. Os tipos em `src/domain/models.ts` já seguem este desenho.

Convenções: `uuid` como PK, `created_at/updated_at`, FKs com `on delete` explícito, RLS habilitada em tudo, nomes em português sem acento (snake_case).

## Identidade
- `perfis_privados` (id = auth.users.id, nome, email*, criado_em, configuracoes jsonb) — RLS: só o dono.
- `perfis_publicos` (id, nome_publico, avatar_path) — leitura por assinantes; escrita só o dono.
- `papeis` / `usuario_papeis` (admin, editor, moderador) — leitura/escrita só via funções admin.
- `dispositivos` (opcional, se for preciso limitar aparelhos).

\* e-mail fica em `auth.users`; duplicar só se necessário.

## Receitas
- `categorias` (nome, emoji/ícone, ordem, ativa) — administráveis.
- `unidades`, `ingredientes` (catálogo único, reaproveitado na lista de compras).
- `receitas` (titulo, descricao, capa_path, tempo_preparo_min, rendimento, congela, congelamento_dias, congelamento_instrucoes, oficial, exclusiva, status [rascunho|revisao|publicada|despublicada], publicada_em).
- `receita_categorias`, `receita_ingredientes` (quantidade numeric, unidade_id, observacao, ordem), `receita_passos`, `receita_dicas`.
- `receita_videos` (provedor, provider_video_id, duracao) — **sem** URL pública; o token é emitido por função.
- `favoritos` (usuario_id, receita_id) — RLS dono.
- `receita_perguntas` / respostas (oficial bool).

Acesso ao conteúdo exclusivo: view/função `receita_detalhe(id)` que retorna ingredientes/passos apenas se `tem_direito_ativo(auth.uid())`.

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
