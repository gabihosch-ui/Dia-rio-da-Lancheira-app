# Arquitetura

## Visão geral

```
App (Expo / React Native)  ──►  Supabase próprio (Auth, Postgres + RLS, Edge Functions)  [Fase 2]
        │                              │
        │                              ├─► Cloudflare Stream (tokens de reprodução assinados) [Fase 4]
        │                              └─► Apple / Google (validação e notificações de assinatura) [Fase 3]
        │
Painel administrativo (web, separado, papéis + MFA)  ──►  mesmo Supabase  [Fases 4–6]
```

O app **nunca** fala diretamente com a Apple/Google/Cloudflare para decidir acesso: o servidor é a fonte confiável de direitos.

## Camadas no app

| Camada | Pasta | Regra |
|---|---|---|
| Rotas/telas | `src/app/` | Só composição de interface e navegação. |
| Componentes | `src/components/` | Reutilizáveis, sem acesso direto a dados. |
| Domínio | `src/domain/models.ts` | Tipos compartilhados (contratos). |
| Regras de negócio | `src/lib/` | Funções puras e testáveis (ex.: `planner.ts`). |
| Serviços | `src/services/` | Interfaces (`types.ts`) + implementações. Hoje só `demo.ts`. |
| Estado local | `src/state/` | Fase 1: memória. Fase 2+: cache do que vem do servidor. |
| Design | `src/theme/tokens.ts` | Toda cor/tamanho/raio vem daqui. |

Trocar de dados demonstrativos para Supabase = criar `services/supabase.ts` implementando `Services` e alterar `services/index.ts`. As telas não mudam.

## Navegação (Expo Router)

- `(tabs)` — 5 abas fixas: Início, Receitas, Planejador, Comunidade, Perfil (abas JavaScript, visual igual em iOS/Android/web).
- Pilha raiz: `receita/[id]`, `planejador/[id]`, `comunidade/[id]`, `comunidade/nova` (modal), `assinatura`, `notificacoes`.

## Ambientes (a partir da Fase 2)

`development`, `staging` (homologação) e `production`, cada um com seu próprio projeto Supabase e variáveis `EXPO_PUBLIC_*` (apenas URL e chave **anon**). Segredos (service_role, chaves Cloudflare, credenciais das lojas) só em Edge Functions/servidor.
