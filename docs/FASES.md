# Fases do projeto

Regra: uma fase só começa após aprovação da anterior. Antes de iniciar, revisar contratos já existentes (`src/domain/models.ts`, `src/services/types.ts`) para evitar retrabalho.

## Fase 1 — Fundação e protótipo navegável ✅ Aprovada em 16/11/2026 (testada no celular via Expo Go)

| Entrega | Status | Onde |
|---|---|---|
| Projeto Expo funcionando | ✅ | SDK 58, `npm start` |
| Navegação com 5 abas | ✅ | `src/app/(tabs)/_layout.tsx` |
| Sistema de identidade visual (tokens) | ✅ (valores provisórios) | `src/theme/tokens.ts` |
| Tela Início | ✅ | `src/app/(tabs)/index.tsx` |
| Catálogo de Receitas (busca, categorias, filtros, favoritas) | ✅ | `src/app/(tabs)/receitas.tsx` |
| Detalhe da receita (vídeo, ingredientes, preparo, congelamento, dicas, perguntas) | ✅ | `src/app/receita/[id].tsx` |
| Adicionar receita ao Planejador (escolher semana) | ✅ | `src/components/recipes/add-to-planner-sheet.tsx` |
| Tela do Planejador (ativas, rascunhos, anteriores, arquivar) | ✅ | `src/app/(tabs)/planejador.tsx` |
| Seis etapas do Planejador com validação | ✅ | `src/app/planejador/[id].tsx` |
| Feed da Comunidade com 5 categorias, curtir, denunciar | ✅ | `src/app/(tabs)/comunidade.tsx` |
| Criação de publicação | ✅ (local, sem envio) | `src/app/comunidade/nova.tsx` |
| Perfil | ✅ | `src/app/(tabs)/perfil.tsx` |
| Tela de assinatura R$ 24,90 (5 estados simuláveis) | ✅ | `src/app/assinatura.tsx` |
| Componentes reutilizáveis | ✅ | `src/components/` |
| Dados demonstrativos separados | ✅ | `src/data/demo/`, `src/services/demo.ts` |
| Layout responsivo (largura máxima em tablet/web) | ✅ | `Screen` em `primitives.tsx` |
| Estados de carregamento, erro e vazio | ✅ | `src/components/ui/states.tsx` (erro simulável no Perfil) |
| Prévia no Expo Go | ✅ | só usa módulos incluídos no Expo Go |
| Documentação inicial | ✅ | `README.md`, `docs/` |
| Testes das regras críticas do Planejador | ✅ | `src/lib/planner.test.ts` (7 testes) |

Pendências da Fase 1 que dependem de material da marca: logo, cores/fonte oficiais, ícone, splash, fotos.

## Fase 2 — Backend, autenticação e segurança (em andamento)

- [x] Decisão: projeto Supabase novo na nuvem, em organização separada da área de membros.
- [x] Projeto Supabase **novo** `diario-lancheira-dev` (ref `cffgnnbbyhfufnrkcybs`), em organização própria.
- [x] Cliente Supabase com sessão em armazenamento seguro (`src/lib/supabase.ts`, `src/lib/secure-session-storage.ts`).
- [x] Migração 1 escrita: perfis, papéis, auditoria, notificações, exclusão de conta, RLS (`supabase/migrations/`).
- [x] Migração 1 aplicada no projeto de desenvolvimento (16/11/2026). Conferido: sem login, todas as tabelas negam acesso.
  - Para aplicar novas migrações: `npx.cmd supabase db push --remote`.
- [x] Cadastro/login por e-mail, recuperação de senha, sair; rotas protegidas (`Stack.Protected`); sessão em `expo-secure-store`.
  - Testado no celular (Expo Go) em 16/11/2026: cadastro, login, perfil, edição de nome e sair.
- [x] Recuperação de senha: URLs de retorno `exp://**` (Expo Go) e `diariodalancheira://**` cadastradas no projeto dev.
  - [ ] Teste do link no celular.
- [x] Exclusão de conta imediata: Edge Function `excluir-conta` (login recente, auditoria, cascata) + migração 2. Publicada no dev.
- [ ] Login com Apple e Google (depende das contas de desenvolvedor).
- [x] Perfil real: leitura, edição de nomes, exclusão de conta.
- [x] `npm run test:rls`: 27/27 aprovados em 16/11/2026 (isolamento + exclusão de conta) — duas contas de teste comuns e uma descartável por execução, no projeto dev ("Confirm email" desligado só no dev).
- [x] Perfis privados/públicos, papéis administrativos, auditoria, estrutura de notificações.
- [x] RLS em todas as tabelas com dados de usuário; funções privilegiadas no schema `private`, com auditoria.
- [x] Testes automatizados: cenários 1, 4, 5, 6 e 10 de `SEGURANCA.md`.
- [→] Receitas, Planejador e Comunidade continuam com dados demonstrativos: ligam ao Supabase nas Fases 4, 5 e 6.

## Fase 3 — Assinatura mensal
Compra, renovação, cancelamento, carência, expiração, reembolso, restauração, validação no servidor. Ver `docs/ASSINATURAS.md`.

## Fase 4 — Receitas e vídeos
Cadastro administrativo, Cloudflare Stream com tokens temporários, fotos, pesquisa, favoritos persistentes.

## Fase 5 — Planejador completo
Persistência, histórico, reaproveitar semanas, PDF e compartilhamento. Ver `docs/PLANEJADOR.md`.

## Fase 6 — Comunidade
Publicações com fotos (validação, remoção de metadados), comentários, curtidas, denúncias, bloqueios, moderação, limites contra abuso, notificações.

## Fase 7 — Auditoria, testes e publicação
Ver `docs/PUBLICACAO_LOJAS.md`.
