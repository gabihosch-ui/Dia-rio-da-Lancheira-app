# Situação do projeto — Diário da Lancheira

Atualizado em 26/11/2026 (recuperação do projeto). Base: `master` @ `f398d84`.

## Resumo

- **Fase 1** (protótipo navegável): concluída e aprovada (16/11/2026).
- **Fase 2** (backend, autenticação e segurança): concluída, exceto login com Apple/Google (adiado).
- **Fase 3** (biblioteca de receitas): **código escrito, não publicado nem validado no Supabase de desenvolvimento.** É aqui que o desenvolvimento parou.
- Próximas: Fase 4 (Planejador real), Comunidade, Assinatura, Publicação.

## Onde paramos exatamente

O último commit (`f398d84`, "Docs: Fase 3…") deixou pendentes, segundo `docs/FASES.md`:

1. Aplicar a migração `20261117090000_receitas.sql` no Supabase de desenvolvimento (validada só localmente com PGlite).
2. Publicar a Edge Function `video-token` no projeto de desenvolvimento.
3. Executar `tests/integration/receitas.test.ts` (21 testes) contra o dev — exige conta `TEST_ADMIN_EMAIL` com papel admin.
4. Configurar credenciais do Cloudflare Stream (segredos da função) para a reprodução real de vídeo.
5. Aprovação da Fase 3 pela responsável.

A ordem dos itens 1 e 2 precisa de autorização, porque altera o banco remoto.

## Classificação das funcionalidades

Legenda: ✅ Concluída e validada · 🟦 Implementada, não validada · 🟨 Parcial · ⬜ Não implementada · 🟥 Com problemas · 🔌 Depende de configuração externa

| Área | Funcionalidade | Estado | Observação |
|---|---|---|---|
| Arquitetura | Expo SDK 58, Expo Router, TS strict, camada de serviços | ✅ | typecheck, lint e bundle Android passam (26/11) |
| Interface | Sistema de design (amarelo, rosa, azul pastel) | 🟨 | `src/theme/tokens.ts` com valores provisórios; logo, fonte, ícone e splash oficiais pendentes |
| Navegação | 5 abas + pilha + rotas protegidas (`Stack.Protected`) | ✅ | testado no celular (Fase 1/2) |
| Autenticação | Cadastro/login por e-mail, sair | ✅ | testado no celular em 16/11 |
| Autenticação | Sessão segura (`expo-secure-store` em pedaços) | ✅ | testes unitários |
| Autenticação | Recuperação de senha por link | ✅ | testado no celular |
| Autenticação | Login com Apple e Google | ⬜🔌 | adiado; depende de contas Apple Developer e Google Cloud |
| Autenticação | MFA para administradores | ⬜ | obrigatório antes de produção |
| Conta | Exclusão de conta (Edge Function `excluir-conta`) | ✅ | publicada no dev e testada |
| Perfis | Perfil privado e público | ✅ | RLS testada; tela de edição de nomes. Avatar não implementado |
| Papéis | admin, editor, moderador + auditoria | ✅ | concessão só por admin; primeiro admin via SQL |
| Notificações | Tabela `notificacoes` com RLS | 🟨 | estrutura no banco; tela usa dados demonstrativos; push não implementado |
| Banco | Migrações 1 e 2 (identidade, exclusão) | ✅ | aplicadas no dev; 27/27 testes (16/11) |
| Banco | Migração 3 (receitas, favoritos, direitos de acesso, storage) | 🟦 | validada só com PGlite; **não aplicada no dev** |
| Segurança | RLS e isolamento entre usuários | ✅ | Fase 2 validada; Fase 3 pendente de execução |
| Receitas | Catálogo, busca sem acento, categorias, filtros, destaques, paginação | 🟦 | código real em `supabase-recipes.ts`; modo demo funciona |
| Receitas | Página da receita (ingredientes, preparo, congelamento) | 🟦 | idem |
| Receitas | Favoritos persistidos | 🟦 | idem |
| Receitas | Compartilhar link | ⬜ | sem rota pública segura |
| Vídeos | Player `expo-video` + `video-token` (Cloudflare Stream assinado) | 🟦🔌 | função não publicada; credenciais Cloudflare ausentes (responde 503) |
| Administração | Painel web: receitas, fotos, categorias, vídeos, status, acessos de teste | 🟦 | build e 10 testes passam; depende da migração 3 |
| Planejador | 6 etapas, regras, lista de compras | 🟨 | só demonstração em memória; regras puras testadas; persistência na Fase 4 |
| Comunidade | Feed, curtir, denunciar, nova publicação | 🟨 | só demonstração local; sem banco, sem imagens, sem moderação |
| Moderação | Denúncias, bloqueios, ações de moderação | ⬜ | só proposta em `docs/BANCO_DE_DADOS.md` |
| Assinaturas | Tela com 5 estados simulados | 🟨 | só visual |
| Assinaturas | Compra (StoreKit/Play Billing), validação no servidor | ⬜🔌 | fase posterior; depende das lojas |
| Desempenho | — | ⬜ | não medido; bundle Android 3,8 MB |
| Testes | Unitários do app (16), do painel (10) | ✅ | aprovados em 26/11 |
| Testes | Integração (rls 18 + exclusão 4 + receitas 21 casos) | 🔌 | exigem `.env`/`.env.test`; não executados na recuperação |
| Publicação | EAS, contas das lojas, materiais, políticas | ⬜ | checklist em `docs/PUBLICACAO_LOJAS.md` |

## Problemas conhecidos

- O repositório no GitHub está **público**. Não há segredos no histórico (verificado em 26/11), mas recomenda-se torná-lo privado.
- `tests/integration/env.ts` tinha comentários e mensagem com acentuação corrompida; corrigido na recuperação.
- `supabase/config.toml` aponta `site_url` para `127.0.0.1:3000` (padrão local); as URLs do projeto remoto ficam no painel do Supabase.
- `expo-doctor` não completou 2 das 20 verificações por falta de rede no ambiente de recuperação (18/20 passaram). Rodar de novo no Windows.
- Datas: os commits estão todos em 16/11/2026, mas a documentação cita 17/11 para a Fase 3. O histórico foi recriado a partir da cópia do outro computador.
- Identificadores `br.com.diariodalancheira.app` são provisórios e precisam de confirmação antes do primeiro build.

## Próxima etapa

Concluir a Fase 3 no ambiente de desenvolvimento (itens 1 a 5 acima), com autorização. Depois, aprovar a Fase 3 e decidir entre Fase 4 (Planejador) e login Apple/Google. Ver `ROADMAP.md`.
