# Decisões técnicas

Formato: data — decisão — motivo. Não substituir uma decisão aprovada sem registrar a justificativa.

- **2026-11-16 — Expo SDK 58 + Expo Router + TypeScript strict.** Versão estável atual; roteamento por arquivos; prévia no Expo Go.
- **2026-11-16 — Abas JavaScript (`Tabs` do Expo Router) em vez de abas nativas.** Visual idêntico em iOS, Android e web, com as cores da marca; mais simples para avaliar o protótipo. Reavaliar abas nativas na Fase 7.
- **2026-11-16 — Ícones `@expo/vector-icons` (Ionicons).** Já suportado no Expo Go, multiplataforma, sem custo.
- **2026-11-16 — Fonte do sistema.** Fonte oficial da marca entra quando enviada (via `expo-font`).
- **2026-11-16 — Tema claro fixo.** A identidade é clara (fundo creme); modo escuro pode ser avaliado depois.
- **2026-11-16 — Camada de serviços com interface única.** Telas dependem de `Services`; dados demonstrativos isolados em `services/demo.ts` + `data/demo/`.
- **2026-11-16 — Estado do protótipo em Context em memória.** Sem persistência para não parecer funcional quando não é. Biblioteca de estado/cache (ex.: TanStack Query) será avaliada na Fase 2.
- **2026-11-16 — Regras do Planejador como funções puras testadas (Jest + jest-expo).** Reaproveitáveis no servidor.
- **2026-11-16 — Identificadores do app provisórios:** `br.com.diariodalancheira.app` (iOS e Android). **Confirmar** antes do primeiro build na loja — não podem ser alterados depois da publicação.
- **2026-11-16 — Sem RevenueCat, Supabase ou Cloudflare ainda.** Nenhum serviço provisionado na Fase 1.
- **2026-11-17 — Cronograma reorganizado:** Biblioteca de receitas antes das assinaturas. Conteúdo exclusivo liberado por acesso de teste concedido por admin (servidor).
- **2026-11-17 — Nomes de tabelas em português** (`receitas`, `receita_ingredientes`…), seguindo o padrão da Fase 2.
- **2026-11-17 — Escrita de receitas só por funções `admin_*`** (transação única, validação e auditoria) em vez de escrita direta nas tabelas.
- **2026-11-17 — Unidades em tabela própria** (FK), para o Planejador somar quantidades com segurança.
- **2026-11-17 — Capas em bucket de leitura pública:** são vitrine do catálogo; conteúdo exclusivo nunca vai para armazenamento público.
- **2026-11-17 — Vídeo com expo-video** (módulo oficial, incluído no Expo Go) e Cloudflare Stream com URLs assinadas.
- **2026-11-17 — Painel administrativo em Vite + React (`admin/`)**, separado do app, mesmo padrão do outro projeto da equipe.
- **2026-11-17 — Validação de migrações com PGlite** (Postgres em memória) antes de publicar, já que não há Docker na máquina de desenvolvimento.
