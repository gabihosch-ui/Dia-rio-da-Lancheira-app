# Diário da Lancheira — App

Aplicativo de assinatura do Diário da Lancheira (iOS e Android): receitas em vídeo, Planejador semanal de lancheiras, comunidade e perfil.

> **Projeto independente.** Este repositório não tem nenhuma ligação com a área de membros existente (Lovable + Supabase de produção). Não há credenciais, conexões ou dados reais aqui. Veja `docs/SEGURANCA.md`, seção "Isolamento".

## Situação atual: Fase 1 — protótipo navegável

- Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router.
- Todos os dados são **demonstrativos** (`src/data/demo/`) e ficam só em memória.
- Sem banco de dados, sem pagamentos, sem uploads, sem login.

Checklist e próximos passos: `docs/FASES.md`.

## Como rodar

Requisitos: Node 20+ e o app **Expo Go** no celular (SDK 58).

```bash
npm install
npm start
```

- **Celular:** escaneie o QR code com a câmera (iPhone) ou com o Expo Go (Android). Celular e computador precisam estar na mesma rede Wi-Fi (ou use `npx expo start --tunnel`).
- **Navegador:** `npm run web` (útil para uma olhada rápida; a referência de experiência é o celular).

### Verificações

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (expo lint)
npm test            # Testes de unidade (Jest)
npm run test:rls    # Testes de isolamento (RLS) contra o Supabase de desenvolvimento
```

No PowerShell, use `npm.cmd` / `npx.cmd` (ou o Prompt de Comando).

### Configuração local

- `.env` — URL e chave pública do Supabase de desenvolvimento (modelo em `.env.example`). Sem ele, o app abre no modo demonstração, sem login.
- `.env.test` — contas de teste usadas por `npm run test:rls`. Não versionado.

## Painel administrativo (equipe)

```bash
cd admin
npm.cmd install
npm.cmd run dev
```

Abre em http://localhost:5180. Precisa de `admin/.env.local` (modelo em `admin/.env.example`) e de uma conta com papel `admin` ou `editor`.

## Estrutura

```
src/
  app/                   Rotas (Expo Router). Cada arquivo é uma tela.
    (tabs)/              As 5 abas: index (Início), receitas, planejador, comunidade, perfil
    receita/[id].tsx     Detalhe da receita
    planejador/[id].tsx  Assistente de 6 etapas
    comunidade/          Detalhe da publicação e nova publicação
    assinatura.tsx       Meu plano e assinatura
    notificacoes.tsx
  components/            Componentes reutilizáveis (ui/, recipes/, community/, planner/)
  domain/models.ts       Modelos de domínio (contratos de dados)
  services/              Interfaces de serviço + implementação demonstrativa
  data/demo/             Dados fictícios (separados dos serviços reais)
  lib/                   Regras de negócio puras (planner.ts) e utilitários
  state/demo-store.tsx   Estado local do protótipo
  theme/tokens.ts        Sistema de design (cores, tipografia, espaçamentos, raios)
docs/                    Documentação técnica
```

## Ferramentas de demonstração

- **Perfil › Ferramentas de demonstração:** simular erro de carregamento.
- **Meu plano e assinatura › Simular estado:** alternar entre não-assinante, ativa, falha no pagamento, cancelada e expirada. Isso só muda a aparência; no app real o status virá do servidor.

## Pendências que dependem da marca

- **Logo oficial:** enviar o arquivo (SVG ou PNG em alta). Hoje há um espaço reservado (`src/components/ui/brand.tsx`). Não criamos nem modificamos logo.
- **Cores e fonte oficiais:** os valores em `src/theme/tokens.ts` são provisórios.
- **Ícone do app e splash:** ainda são os padrões do Expo.
- **Fotos das receitas:** hoje são espaços reservados ilustrativos.
