# Planejador

Reproduz o conceito do Planejador da área de membros (apenas como referência; nenhum acesso ao sistema atual).

## Etapas

| # | Etapa | Regra no protótipo | Validação para avançar |
|---|---|---|---|
| 1 | Escolha das receitas | 2 a 5 receitas (`PlannerRules`, futuramente configurável) | mínimo e máximo |
| 2 | Organização do preparo | cada receita: "vou preparar" ou "já está pronta" | todas classificadas |
| 3 | Distribuição pelos dias | segunda a sexta; um dia pode ter várias receitas | nenhum dia vazio |
| 4 | Frutas e acompanhamentos | frutas, proteínas, acompanhamentos por dia | opcional |
| 5 | Conferência da despensa | marcar ingredientes que já tem em casa (só de receitas "preparar") | opcional |
| 6 | Cardápio e lista de compras | cardápio por dia + lista somada por ingrediente e unidade, sem o que já tem | — |

Regras puras em `src/lib/planner.ts`, testadas em `src/lib/planner.test.ts`:
- `checkRecipeSelection`, `toggleRecipe` (não passa do máximo), `canAdvance`.
- `pruneWeek`: ao desmarcar uma receita, remove-a das etapas seguintes.
- `aggregateIngredients` / `buildShoppingList`: soma por `ingredientId` + unidade; ignora receitas "prontas"; desconta a despensa.

## Gestão
- Criar semana, salvar rascunho (botão no cabeçalho), continuar rascunho na etapa onde parou.
- Concluir → semana **ativa**. Arquivar → **anteriores** (somente leitura, pode reativar).
- "Adicionar ao Planejador" na receita: escolher semana existente (respeita o limite) ou criar nova.

## Pendências (Fase 5)
- Persistência no servidor e isolamento por usuário (RLS).
- Itens personalizados, notas por dia, reaproveitar semana anterior.
- PDF e compartilhamento (botões já previstos, hoje avisam "em breve").
- Conversão de unidades entre si (hoje soma apenas unidades iguais).
