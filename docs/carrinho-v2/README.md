# Carrinho V2 — Balcão Editorial

Implementação exclusiva do Carrinho, baseada em `origin/dev` (`ad9caa2`), sem incorporar o PR #77. Título na escala editorial do Cardápio, linhas abertas sobre creme, imagens ampliadas, resumo marrom com total e CTA dourado, vazio assimétrico e recomendações em grade. No celular, resumo no fluxo e recomendações em linhas; a ajuda fechada ocupa espaço próprio nesta rota.

Lógica de negócio preservada: preços e descontos, conferência de estoque, bloqueio por indisponibilidade, isolamento de sessão, cálculo e rota de checkout. Não modifica Pagamento, Confirmação, APIs ou backend. Produtos das recomendações continuam vindo exclusivamente do catálogo; dados fictícios existem apenas no roteiro de QA.

## Provas executadas

- `node --test tests/*.test.mjs`: **221 passaram**, zero falhas ([saída](node-results.txt)). Inclui regressões de sessão e carrinho.
- `npm run build`: produção e PWA concluídos ([saída](build-results.txt)).
- `node docs/carrinho-v2/qa.mjs`: Chrome com API interceptada; vazio, um/múltiplos itens, promoção, subtotal/total, incremento/decremento, adição de recomendação, remoção, limpeza confirmada, estoque zero, erro HTTP, loading e navegação até `/checkout`. Nenhum POST financeiro.
- Larguras CSS efetivas 1440, 1280, 768, 390 e 320; 15 capturas de estado e cinco do Cardápio. Sem overflow horizontal, controles com altura ≥44px, título Anton, foco visível e movimento reduzido. CTA conferido entre header e navegação; ajuda acessível acima da barra no final da rolagem.
- Contraste calculado para texto principal/secundário, nota, resumo e CTA: todos ≥4,5:1. Valores e medidas em [results.json](results.json). Sem erros JavaScript nos cenários da grade.
- Comparação visual das capturas: mesma paleta creme/marrom, Anton/Caveat e ilustrações próprias do Cardápio; produtos sem caixas brancas, resumo com hierarquia distinta. Aprovação estética final pendente do Arthur.

## Capturas reais do Chrome

Capturas integrais preservam header e navegação fixos; em uma captura longa, a barra aparece na posição do viewport original. As capturas do CTA mostram o viewport após rolagem, com o botão acessível.

| Largura | Vazio | Um produto | Vários produtos | Cardápio |
|---|---|---|---|---|
| 1440 | [ver](../prints/carrinho-v2/1440-0.png) | [ver](../prints/carrinho-v2/1440-1.png) | [ver](../prints/carrinho-v2/1440-3.png) | [referência](../prints/carrinho-v2/1440-cardapio.png) |
| 1280 | [ver](../prints/carrinho-v2/1280-0.png) | [ver](../prints/carrinho-v2/1280-1.png) | [ver](../prints/carrinho-v2/1280-3.png) | [referência](../prints/carrinho-v2/1280-cardapio.png) |
| 768 | [ver](../prints/carrinho-v2/768-0.png) | [ver](../prints/carrinho-v2/768-1.png) | [ver](../prints/carrinho-v2/768-3.png) | [referência](../prints/carrinho-v2/768-cardapio.png) |
| 390 | [ver](../prints/carrinho-v2/390-0.png) | [ver](../prints/carrinho-v2/390-1.png) | [ver](../prints/carrinho-v2/390-3.png) | [referência](../prints/carrinho-v2/390-cardapio.png) |
| 320 | [ver](../prints/carrinho-v2/320-0.png) | [ver](../prints/carrinho-v2/320-1.png) | [ver](../prints/carrinho-v2/320-3.png) | [referência](../prints/carrinho-v2/320-cardapio.png) |

[Estoque insuficiente](../prints/carrinho-v2/390-stock.png) · [Erro de API](../prints/carrinho-v2/390-error.png) · [Carregamento](../prints/carrinho-v2/390-loading.png) · CTA no viewport: [768](../prints/carrinho-v2/768-cta-viewport.png), [390](../prints/carrinho-v2/390-cta-viewport.png), [320](../prints/carrinho-v2/320-cta-viewport.png).

## Reproduzir e limites

Iniciar Vite com `npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`. O roteiro usa Playwright já instalado, configurável por `PLAYWRIGHT_MODULE`; `QA_BASE` altera a origem. `QA_FONT_CACHE` aceita o JSON local preexistente de fontes para QA offline; sem ele usa as fontes públicas do próprio projeto. Nenhuma biblioteca nova foi adicionada.

Testes usam autenticação e catálogo fictícios interceptados. Não validam login/backend reais, pagamentos, produção, Safari/Firefox, dispositivo físico ou leitor de tela. Não houve cobrança, pedido ou mudança de estoque real. A revisão foi feita pelo implementador, sem subagentes, conforme o pedido de economia de contexto. Instalação apontou quatro vulnerabilidades moderadas preexistentes; dependências/lockfile foram preservados. CI verde não representa aprovação visual; merge depende de autorização explícita.
