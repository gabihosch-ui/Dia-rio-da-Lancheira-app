# CLAUDE.md — Diário da Lancheira (app)

Instruções permanentes para sessões do Claude Code neste repositório. Leia também `AGENTS.md` (regras do Expo), `PROJECT_STATUS.md` (onde paramos) e `docs/` (detalhes técnicos).

## O que é

App de assinatura (iOS e Android) para pais e mães que preparam lancheiras escolares: receitas em vídeo e texto, Planejador semanal, comunidade, perfil e assinatura mensal de R$ 24,90 ("Clube Diário da Lancheira"). Painel administrativo web separado em `admin/`.

## Regras de trabalho

1. **Uma fase só começa após aprovação da anterior** (ver `docs/FASES.md` e `ROADMAP.md`). Não implemente funcionalidades novas sem aprovação explícita da responsável.
2. **Não reescreva nem descarte** funcionalidades existentes. Prefira mudanças pequenas e incrementais.
3. **Antes de mexer em Expo/React Native**, siga `AGENTS.md`: confira a versão em `package.json` (SDK 58) e consulte a documentação versionada. Instale pacotes com `npx expo install`, nunca com `npm install <pacote>` direto.
4. **Não atualize bibliotecas em massa.** Use `npm ci` com o `package-lock.json` existente.
5. **Commit ao concluir cada etapa**, com mensagem em português no padrão `Fase X.Y: descrição` ou `Docs: descrição`. Atualize `PROJECT_STATUS.md` e `docs/FASES.md` no mesmo commit.
6. **Nunca use force push** nem reescreva o histórico da `master`. Trabalhe em branch e abra PR.
7. Antes de dar uma tarefa por concluída: `npm run typecheck`, `npm run lint`, `npm test` e, se mexeu no painel, `cd admin && npm test && npm run build`.
8. Registre decisões técnicas em `docs/DECISOES_TECNICAS.md` (data — decisão — motivo).
9. Textos do app, comentários e documentação em **português do Brasil**, arquivos em UTF-8.

## Regras de segurança (inegociáveis)

- **Isolamento:** este projeto não tem nenhuma ligação com a área de membros existente (Lovable + Supabase de produção). Não acesse, não copie dados e não crie integrações com ela sem plano aprovado (ver `docs/SEGURANCA.md`).
- **Sem segredos no Git.** Só vão para o repositório os arquivos `*.example`. `.env`, `.env.test`, `admin/.env.local`, chaves `service_role`/secret, senha do banco, tokens do Cloudflare e credenciais das lojas nunca são versionados nem aparecem em logs, documentação ou mensagens.
- **No app só entram** `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (chave pública). Segredos ficam apenas como segredos das Edge Functions.
- **O servidor decide o acesso** (RLS, funções `private.*`, Edge Functions). Nunca libere conteúdo por flag local (`isPremium` etc.). `demoHasClubAccess` é só visual do protótipo.
- **Identidade vem do token** (`auth.uid()`), nunca de um ID enviado pelo cliente.
- **Banco remoto:** não execute `db reset`, migrações remotas (`supabase db push`), exclusões ou alterações destrutivas sem autorização expressa da responsável. Não crie projeto Supabase novo sem autorização.
- Toda tabela nova com dados de usuário: RLS habilitada, policies por operação, testes de isolamento em `tests/integration/`.
- Funções privilegiadas: `security definer`, `search_path` fixo, verificação de papel por dentro, auditoria em `public.auditoria` sem dados pessoais.

## Arquitetura (resumo)

```
src/app/         Rotas (Expo Router). (tabs)/ = Início, Receitas, Planejador, Comunidade, Perfil
src/components/  Componentes reutilizáveis (ui/, recipes/, community/, planner/)
src/domain/      Modelos de domínio (contratos)
src/services/    Interface Services + implementações: supabase-recipes.ts (real), demo.ts (fictício)
src/lib/         Regras puras testadas (planner, recipes, sessão segura, supabase client)
src/state/       auth.tsx (sessão), library.tsx (favoritos/acesso), demo-store.tsx (protótipo)
src/theme/       tokens.ts — toda cor/tamanho vem daqui (valores provisórios)
admin/           Painel web (Vite + React + Vitest), porta 5180
supabase/        config.toml, migrations/ (3), functions/ (excluir-conta, video-token)
tests/integration/  Testes contra o Supabase de DESENVOLVIMENTO (npm run test:rls)
docs/            ARQUITETURA, BANCO_DE_DADOS, SEGURANCA, FASES, DECISOES_TECNICAS, PLANEJADOR, ASSINATURAS, PUBLICACAO_LOJAS
```

- Sem `.env` o app abre em **modo demonstração** (sem login, dados fictícios). Com `.env`, exige login e as receitas vêm do Supabase.
- Comunidade, Planejador, notificações e assinatura ainda usam dados demonstrativos.
- Trocar demonstração por real = nova implementação da interface em `src/services/` e ajuste em `services/index.ts`; as telas não mudam.

## Ambiente

- Windows (PowerShell): use `npm.cmd` / `npx.cmd`. Node 22 LTS (mínimo 20). npm (há `package-lock.json`; não use yarn/pnpm/bun).
- Supabase de desenvolvimento: projeto `diario-lancheira-dev` (ver `PROJECT_STATUS.md`). Migrações aplicadas com `npx.cmd supabase db push` **somente com autorização**.
- Configuração completa: `SETUP.md`.
