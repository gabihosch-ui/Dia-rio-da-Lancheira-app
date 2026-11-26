# Roadmap — Diário da Lancheira

Regra: cada fase começa só após a aprovação da anterior. Detalhes por fase em `docs/FASES.md`; situação atual em `PROJECT_STATUS.md`.

| Fase | Tema | Situação |
|---|---|---|
| 1 | Fundação e protótipo navegável | ✅ Aprovada (16/11/2026) |
| 2 | Backend, autenticação e segurança | ✅ Concluída (login Apple/Google adiado) |
| 3 | Biblioteca de receitas | 🟦 Código pronto, falta publicar e validar no dev |
| 3b | Login com Apple e Google | ⬜ Aguarda contas de desenvolvedor |
| 4 | Planejador completo | ⬜ Próxima |
| 5 | Assinatura mensal (R$ 24,90) | ⬜ Adiada |
| 6 | Comunidade e moderação | ⬜ |
| 7 | Auditoria, testes e publicação nas lojas | ⬜ |

## Fase 3 — fechamento (próximo passo)
1. Autorização para aplicar a migração `20261117090000_receitas.sql` no dev (`npx.cmd supabase db push`).
2. Publicar a Edge Function `video-token` no dev.
3. Criar/confirmar conta de teste admin e rodar `npm run test:rls` (rls + exclusão + receitas).
4. Cadastrar receitas reais pelo painel e testar no celular (catálogo, detalhe, favoritos, acesso de teste).
5. Cloudflare Stream: criar conta, gerar token de API e chave de assinatura, gravar como segredos da função; testar a reprodução.
6. Aprovação da Fase 3.

## Fase 3b — Login com Apple e Google
- Conta Apple Developer (organização) e projeto no Google Cloud (OAuth).
- Habilitar provedores no Supabase Auth; `expo-apple-authentication` e login Google nativo (development build, fora do Expo Go).
- Vincular identidades a contas existentes por e-mail; testes de ponta a ponta.
- Obrigatório pela Apple se houver login social no iOS.

## Fase 4 — Planejador completo
- Tabelas `planejamentos`, `planejamento_receitas`, `planejamento_dias`, `planejamento_dia_itens`, `itens_acompanhamento`, `planejamento_despensa`, `regras_planejador` com RLS por usuário.
- Ligar ao catálogo real (`getForPlanner`), mantendo as regras puras de `src/lib/planner.ts`.
- Rascunhos, ativos, arquivados; itens personalizados; reaproveitar semana; PDF e compartilhamento.
- Testes de isolamento (cenário 6 de `docs/SEGURANCA.md`).

## Fase 5 — Assinatura mensal
- Decidir entre RevenueCat e integração direta (registrar em `DECISOES_TECNICAS.md`).
- Compra, renovação, cancelamento, carência, expiração, reembolso, restauração.
- Validação no servidor e notificações das lojas (idempotência via `eventos_pagamento`), gravando `direitos_acesso` com `tipo = 'assinatura'`.
- Testes em sandbox Apple e licença de teste Google; cenários 2, 3, 7 e 9 de `SEGURANCA.md`.

## Fase 6 — Comunidade e moderação
- Publicações com texto e imagens (bucket privado, remoção de EXIF/GPS), comentários, curtidas.
- Perfis públicos com avatar; denúncias, bloqueios, fila de moderação no painel, limites contra abuso.
- Notificações no app e push (`expo-notifications`).
- Cenário 8 (upload inválido) de `SEGURANCA.md`.

## Fase 7 — Auditoria, testes e publicação
- MFA obrigatório para admins; ambientes staging e produção (projetos Supabase próprios, Confirm email ligado).
- Identidade visual final (logo, fonte, cores, ícone, splash, fotos).
- EAS Build/Submit, TestFlight, teste interno Google Play; políticas e formulários de privacidade.
- Medição de desempenho em aparelhos reais. Checklist completo em `docs/PUBLICACAO_LOJAS.md`.
