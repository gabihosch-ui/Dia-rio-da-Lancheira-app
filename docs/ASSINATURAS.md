# Assinaturas

**Plano único:** Clube Diário da Lancheira — R$ 24,90/mês, renovação automática (preço final, tributos e condições a confirmar nas lojas).

## Fase 1 (atual)
Tela "Meu plano e assinatura" com 5 estados **simulados** (sem assinatura, ativa, falha no pagamento/carência, cancelada até o fim do período, expirada). Nenhum pagamento é processado. O botão "Assinar" apenas explica que a compra virá na Fase 3.

## Fase 3 (planejado)
- Compras internas: Apple In-App Purchase (StoreKit 2) e Google Play Billing. Avaliar camada de gerenciamento (ex.: RevenueCat) vs. integração direta — decisão a registrar em `DECISOES_TECNICAS.md`.
- Requer development build (não funciona no Expo Go).
- Fluxos: compra inicial, renovação, cancelamento, falha de cobrança, carência (grace period / billing retry), expiração, reembolso/revogação, restauração, troca de celular.
- **Validação no servidor:** Edge Function recebe o recibo/token, valida com a loja e grava `assinaturas` + `direitos_acesso`.
- **Notificações de servidor:** App Store Server Notifications v2 e Google Real-time Developer Notifications → Edge Function idempotente (`eventos_pagamento.evento_id` único).
- O app só consulta "tenho direito?" no servidor; nunca decide sozinho.
- Testes em sandbox (Apple) e licença de teste (Google).
