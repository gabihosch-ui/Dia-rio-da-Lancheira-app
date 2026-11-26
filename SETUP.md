# Configuração em um computador novo (Windows)

## 1. Ferramentas

| Ferramenta | Versão | Observação |
|---|---|---|
| Git | 2.4x ou mais nova | https://git-scm.com |
| Node.js | 22 LTS (mínimo 20) | inclui o npm; validado com Node 22.23 |
| GitHub CLI (opcional) | 2.x | `gh auth login` |
| Expo Go (celular) | compatível com **SDK 58** | App Store / Google Play |
| Supabase CLI | já vem como dependência (`npx.cmd supabase`) | não precisa instalar à parte |

No PowerShell use `npm.cmd` e `npx.cmd` (ou o Prompt de Comando), por causa da política de execução de scripts.

## 2. Código

```powershell
cd $HOME\Documents
git clone https://github.com/gabihosch-ui/Dia-rio-da-Lancheira-app.git diario-da-lancheira
cd diario-da-lancheira
npm.cmd ci
cd admin; npm.cmd ci; cd ..
```

Use `npm ci` (respeita o `package-lock.json`). Não rode `npm update` nem `npx expo install --fix` sem necessidade.

## 3. Variáveis de ambiente (nunca versionadas)

Pegue os valores no painel do Supabase do projeto **diario-lancheira-dev** › Project Settings › API. Use apenas a URL e a chave **pública** (anon ou publishable).

| Arquivo | Modelo | Conteúdo |
|---|---|---|
| `.env` | `.env.example` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `.env.test` | `.env.test.example` | contas de teste do dev (A, B e admin) |
| `admin/.env.local` | `admin/.env.example` | `VITE_PUBLIC_SUPABASE_URL`, `VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_ENVIRONMENT_LABEL` |

```powershell
copy .env.example .env
copy .env.test.example .env.test
copy admin\.env.example admin\.env.local
notepad .env
```

Sem `.env`, o app abre em modo demonstração (sem login). Nunca coloque a chave `service_role`/secret, a senha do banco ou tokens do Cloudflare nesses arquivos.

Segredos das Edge Functions ficam **no Supabase** (Edge Functions › Secrets), não no computador: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_CUSTOMER_CODE` (usados por `supabase/functions/video-token/index.ts`). As chaves `SUPABASE_*` das funções são fornecidas pelo próprio Supabase.

## 4. Rodar

```powershell
npm.cmd start          # QR code para o Expo Go (mesma rede Wi-Fi, ou: npx.cmd expo start --tunnel)
npm.cmd run web        # prévia no navegador
cd admin; npm.cmd run dev   # painel em http://localhost:5180
```

## 5. Verificações

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test                 # 16 testes unitários
cd admin; npm.cmd test; npm.cmd run build; cd ..   # 10 testes do painel
npx.cmd expo-doctor
npm.cmd run test:rls         # integração contra o Supabase dev (precisa de .env e .env.test)
```

## 6. Supabase CLI (somente leitura, sem autorização)

```powershell
npx.cmd supabase login                     # abre o navegador; o token fica no seu computador
npx.cmd supabase link --project-ref <ref>  # ref em docs/FASES.md; pede a senha do banco
npx.cmd supabase migration list            # compara migrações locais x remotas (não altera nada)
```

Comandos que **alteram** o banco remoto (`db push`, `db reset`, `functions deploy`, `secrets set`) só com autorização da responsável.

## 7. Primeiro admin

Ver `docs/SEGURANCA.md`, seção "Primeiro administrador" (SQL executado uma vez no SQL Editor, depois de criar a conta).
