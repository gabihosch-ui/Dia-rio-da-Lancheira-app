-- =============================================================================
-- Migração 2 — Exclusão de conta imediata
-- A exclusão agora é feita pela Edge Function "excluir-conta" (login recente
-- exigido, chave secreta só no servidor, registro em auditoria). A tabela de
-- pedidos deixou de ser usada e é removida para não manter estrutura morta.
-- =============================================================================

drop trigger if exists solicitacoes_exclusao_auditoria on public.solicitacoes_exclusao;
drop function if exists private.auditar_solicitacao_exclusao();
drop table if exists public.solicitacoes_exclusao;
