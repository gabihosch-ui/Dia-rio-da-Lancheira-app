# Segurança

## Isolamento do sistema existente (regra permanente)

A área de membros atual (Lovable + Supabase de produção, com clientes reais) **não** é tocada por este projeto:

- Sem acesso ao código, ao banco, a migrações, policies, funções, webhooks ou pagamentos existentes.
- Sem credenciais de produção neste repositório.
- Os nomes `planner_*` do sistema atual servem apenas como referência conceitual.
- Qualquer integração/migração futura exige planejamento próprio e aprovação expressa.

Na Fase 1 o app não faz nenhuma chamada de rede de dados.

## Princípios

1. **Servidor decide.** Assinatura, papéis e posse de dados são verificados no backend/RLS. A interface apenas reflete.
   - No protótipo existe `demoHasClubAccess` (em `src/state/demo-store.tsx`): é **somente visual** e será removido. Nunca usar uma flag local como `isPremium` para liberar conteúdo.
2. **Negado por padrão.** RLS habilitada em toda tabela com dados de usuário; policies explícitas por operação.
3. **Identidade vem do token.** Nunca confiar em `user_id` enviado pelo cliente; usar `auth.uid()`.
4. **Sem segredos no app.** Apenas URL e chave anon do Supabase. Nada de `service_role`.
5. **Conteúdo exclusivo não é público.** Vídeos com tokens temporários (Cloudflare Stream signed URLs); imagens exclusivas em bucket privado com URLs assinadas; o servidor omite ingredientes/preparo sem direito válido.
6. **Funções privilegiadas** (`security definer`) mínimas, com `search_path` fixo, validação de entrada e registro em auditoria.
7. **Admin com MFA** e papéis granulares; painel separado do app.
8. **Uploads (Fase 6):** tipos e tamanhos limitados, remoção de EXIF/GPS, nomes gerados pelo servidor, moderação, limites de envio.
9. **Logs sem dados sensíveis** (sem e-mail, tokens ou conteúdo privado).
10. **Sessão:** tokens em `expo-secure-store`; revogação de sessões; recuperação de acesso por e-mail.

## Testes obrigatórios (automatizados, a partir da Fase 2)

1. Usuário A tentando acessar dados privados do usuário B.
2. Usuário sem assinatura abrindo receita exclusiva.
3. Assinatura expirada tentando reproduzir vídeo.
4. Manipulação de permissões pelo app.
5. Função administrativa chamada por usuário comum.
6. Manipulação de IDs de receitas/planejamentos.
7. Notificação de pagamento duplicada (idempotência).
8. Upload de arquivo inválido.
9. Revogação após reembolso.
10. Exclusão de conta e dados associados.

Nenhum mecanismo é considerado aprovado só por "funcionar visualmente".

## Primeiro administrador

Nenhum usuário consegue se tornar admin pelo app: só um admin pode conceder papéis (e toda concessão vai para `auditoria`). O primeiro admin é definido uma única vez pela responsável, no SQL Editor do projeto, depois de criar a própria conta:

```sql
insert into public.usuario_papeis (usuario_id, papel)
select id, 'admin' from auth.users where email = 'EMAIL-DA-RESPONSAVEL';
```

## Variáveis de ambiente do app

Somente `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`). O arquivo `.env` não vai para o Git. A chave `service_role` nunca entra no app nem no repositório.
