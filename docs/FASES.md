# Fases do projeto

Regra: uma fase só começa após aprovação da anterior. Antes de iniciar, revisar contratos já existentes (`src/domain/models.ts`, `src/services/types.ts`) para evitar retrabalho.

## Fase 1 — Fundação e protótipo navegável ✅ (aguardando aprovação)

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

## Fase 2 — Backend, autenticação e segurança (próxima recomendada)

- [ ] Criar projeto Supabase **novo** (dev) — exige autorização para provisionar.
- [ ] Migrações versionadas iniciais (ver `docs/BANCO_DE_DADOS.md`).
- [ ] Cadastro/login (e-mail; Apple e Google previstos), sessão em `expo-secure-store`.
- [ ] Perfis privados/públicos, papéis administrativos.
- [ ] RLS em todas as tabelas com dados de usuário; funções privilegiadas auditáveis.
- [ ] Implementação Supabase de `src/services/types.ts`.
- [ ] Testes automatizados de isolamento entre usuários (cenários 1, 4, 5, 6 de `SEGURANCA.md`).

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
