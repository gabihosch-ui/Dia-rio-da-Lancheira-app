# Publicação nas lojas (Fase 7)

Checklist preliminar — nada disso foi feito ainda.

## Contas e identificação
- [ ] Conta Apple Developer (organização) e Google Play Console.
- [ ] Confirmar bundle ID / package (`br.com.diariodalancheira.app` é provisório).
- [ ] Projeto EAS (`npx eas-cli@latest init`) e perfis de build (development, preview, production).

## Materiais
- [ ] Ícone e splash oficiais (a partir da logo oficial).
- [ ] Capturas de tela iPhone/Android, descrição, palavras-chave.
- [ ] Política de privacidade e Termos de uso publicados (URL).
- [ ] Formulários de privacidade (App Privacy / Data safety).

## Requisitos de revisão relevantes
- [ ] Assinatura via compra interna, com preço, período e renovação claros na tela de compra; botão "Restaurar compras".
- [ ] Exclusão de conta dentro do app.
- [ ] Conteúdo gerado por usuários: termos aceitos, filtro/moderação, denúncia, bloqueio, contato do responsável.
- [ ] Login com Apple obrigatório se houver login social de terceiros no iOS.
- [ ] Classificação etária; público adulto.

## Testes
- [ ] TestFlight (interno/externo) e teste interno no Google Play.
- [ ] Compras em sandbox: compra, renovação, cancelamento, reembolso, restauração.
- [ ] iPhone e Android reais, telas pequenas e grandes, desempenho.
