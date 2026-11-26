# Relatório de recuperação — 26/11/2026

## Contexto

A responsável trocou de computador e perdeu os arquivos locais e o histórico das sessões do Claude Code. O projeto foi recuperado a partir da cópia do computador anterior e enviado para um novo repositório no GitHub. Esta recuperação reconstruiu o contexto técnico a partir desse repositório.

## 1. Repositório

- **Recuperado:** `gabihosch-ui/Dia-rio-da-Lancheira-app` (branch `master`, visibilidade **pública**).
- Outro repositório na conta, `gabihosch-ui/historias-de-ninar`, é **outro aplicativo** (Histórias de Ninar). Só compartilha a razão social nos documentos jurídicos. Não foi alterado.
- Histórico: 16 commits, uma branch (`master`), sem tags e sem releases. Primeiro commit `4e8adb0` (Fase 1), último `f398d84` (Docs da Fase 3), todos com data de 16/11/2026 e autoria `gabi.hosch`.
- Versão de referência: `f398d84`, a mais recente e a única linha de histórico. Nenhuma branch foi sobrescrita; nada foi enviado com force push.

## 2. Verificação de segredos

- Varredura em **todo o histórico** por chaves JWT, `sb_secret`, `service_role`, senhas, tokens do GitHub/Stripe, chaves privadas e arquivos `.env`: **nada encontrado**.
- Versionados apenas `.env.example` e `admin/.env.example`, sem valores reais.
- O identificador (ref) do projeto Supabase de desenvolvimento aparece em `docs/FASES.md`. Ele não é segredo (faz parte da URL pública do app), mas, com o repositório público, recomenda-se torná-lo privado.

## 3. Ambiente de recuperação

Ambiente Linux na nuvem (o app não pôde ser aberto no Windows nem no celular a partir daqui).

| Item | Resultado |
|---|---|
| Node / npm | Node 22.23.5 |
| `npm ci` (app) | ✅ sem erros, 0 vulnerabilidades no painel |
| `npm ci` (admin) | ✅ |
| `npm run typecheck` | ✅ sem erros |
| `npm run lint` | ✅ sem avisos |
| `npm test` (app) | ✅ 16/16 (3 suítes: planner, recipes, secure-session-storage) |
| `admin: npm test` | ✅ 10/10 (validação) |
| `admin: npm run build` | ✅ |
| `expo export --platform android` | ✅ bundle gerado (3,8 MB) |
| `expo-doctor` | ⚠️ 18/20; 2 verificações exigem a API da Expo (sem rede aqui) |
| `npm run test:rls` | ⏸️ não executado: exige `.env`/`.env.test` com credenciais do dev |

Avisos do npm sobre pacotes obsoletos (`glob`, `inflight`, `eslint@9`) vêm de dependências indiretas; não foram atualizados, conforme a regra de não atualizar em massa.

## 4. Conferência do histórico informado

| Informação anterior | Encontrado no código |
|---|---|
| Fase 2 concluída | ✅ Confirmado (`docs/FASES.md`, migrações 1 e 2, Edge Function `excluir-conta`) |
| 27 testes de segurança do servidor | ✅ Registrado 27/27 em 16/11 (`rls.test.ts` + `excluir-conta.test.ts`). Não reexecutado. |
| 11 testes unitários | Hoje são **16** no app (a Fase 3 adicionou `recipes.test.ts`) + **10** no painel |
| Próxima etapa: login Apple e Google | ⚠️ **Desatualizado.** O login social foi adiado e o desenvolvimento seguiu para a **Fase 3 (biblioteca de receitas)**, cujo código está pronto mas não publicado no Supabase dev |

## 5. Supabase

- Projeto próprio `diario-lancheira-dev`, em organização separada da área de membros.
- Migrações versionadas: `20261116120000_identidade` e `20261116180000_exclusao_imediata` (aplicadas no dev, segundo a documentação) e `20261117090000_receitas` (**não aplicada**).
- Edge Functions: `excluir-conta` (publicada) e `video-token` (**não publicada**), ambas com `verify_jwt = false` e validação do token dentro da função.
- RLS habilitada em todas as 16 tabelas públicas (5 da identidade + 11 das receitas); privilégios por coluna em `receitas`, `receita_videos`, `perfis_*`; funções privilegiadas no schema `private`.
- **Estrutura remota não comparada:** não houve acesso autorizado ao projeto. Para comparar sem alterar nada: `npx.cmd supabase migration list` (ver `SETUP.md`, seção 6).
- Nenhum banco foi criado, resetado ou alterado.

## 6. O que foi alterado na recuperação

Branch `recuperacao/2026-11-26`, um commit, sem envio ao GitHub até a aprovação:

- Novos: `CLAUDE.md`, `PROJECT_STATUS.md`, `ROADMAP.md`, `RECOVERY_REPORT.md`, `SETUP.md`, `.env.test.example`.
- `.gitignore`: passa a permitir `.env.test.example` (os `.env` reais continuam ignorados).
- `README.md`: seção "Situação atual" atualizada (dizia Fase 1).
- `tests/integration/env.ts`: acentuação corrompida corrigida no comentário e na mensagem de erro (sem mudança de lógica).

Nenhuma funcionalidade foi removida, reescrita ou adicionada.

## 7. O que não pôde ser recuperado

- Histórico das sessões anteriores do Claude Code (a documentação em `docs/` cobre as decisões).
- Arquivos locais não versionados: `.env`, `.env.test`, `admin/.env.local` e as senhas das contas de teste. Precisam ser recriados (ver `SETUP.md`).
- Estado real do Supabase remoto e dos segredos das Edge Functions (sem acesso).
- Teste do app em aparelho real após a recuperação.

## 8. Rotina contra novas perdas

- Commit ao final de cada etapa e `git push` no mesmo dia; trabalho em branch + PR.
- `PROJECT_STATUS.md` atualizado em cada commit de fase.
- Guardar `.env`, `.env.test` e as senhas de teste num gerenciador de senhas (não no Git).
- Tornar o repositório privado.
