# PR7 UX1 — Carrinho V2: Balcão Editorial

Base: `origin/dev` em `ad9caa2`. Branch: `feat/pr7-ux1-carrinho-balcao`.
Direção aprovada pelo Arthur: continuação do Cardápio, sem reaproveitamento do PR #77.

## Escopo e critérios

- [x] Anton editorial e Caveat pontual com tokens existentes.
- [x] Linhas abertas com imagens maiores e quantidade acessível; resumo assimétrico marrom.
- [x] Vazio com composição própria e ilustração existente.
- [x] Mobile com resumo no fluxo, controles de 44px e recomendações sem carrossel.
- [x] Ajuda fechada no fluxo apenas nesta rota, evitando cobrir controles.
- [x] Preservar cálculos, sessão, disponibilidade, serviços e navegação para checkout.
- [x] Executar testes existentes, build e provas funcionais sintéticas.
- [x] Capturar 1440/1280/768/390/320 com 0/1/3 produtos e comparar com Cardápio.
- [ ] Aprovação visual do Arthur. Publicação em Draft não significa aprovação.

Responsabilidades: `CarrinhoView` compõe itens/resumo/vazio e preserva os handlers existentes; `CartRecommendations` mantém seleção e adição da API; `StudentLayout` posiciona a ajuda por rota. Nenhum store, serviço, dependência, pagamento ou backend alterado.

Evidências e limites: [relatório](../carrinho-v2/README.md).
