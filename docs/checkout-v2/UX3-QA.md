# UX3 — revisão visual da confirmação do pedido

**Escopo:** layout de resultado após checkout. Branch `feat/pr7-ux3-confirmacao-balcao` baseada em `feat/pr7-ux2-pagamento-balcao` (PR #82). Merge separado do UX2; **não** levar direto à `main`.

## O que mudou

- Remoção das duas linhas/divisórias internas que deixavam o cartão de resultado com aparência vazia.
- Status real em cartão editorial à esquerda, com ícone, estado, número do pedido e descrição legíveis.
- Total e ações num quadro marrom ao lado, que vai para baixo no mobile; um CTA principal (`Acompanhar pedido`) e um secundário.
- Dinheiro: explicação de retirada separada, **sem declarar pagamento aprovado**.
- Pix pendente: QR Code preservado, instruções de 14px com espaçamento confortável, campo de código e ação `Copiar código` de 48px de altura.
- Mantidos todos os estados (aprovado, pendente, dinheiro, 3DS, análise, recusado, cancelado, reembolsado, erro) e os contratos das APIs/SDK.

## Conferência (pendente no navegador)

- [ ] Desktop 1440/1280: dinheiro, Pix pendente, Pix aprovado; sem linhas duplicadas; sem salto no layout.
- [ ] 768/390/320: QR legível, código não vazando horizontalmente, botões 44px+, sem sobreposição com chatbot/nav.
- [ ] Cartão 3DS, em análise, recusado/erro: mensagem e ação correspondem ao status do backend.
- [ ] Verificar que a confirmação só aparece após resposta do backend e não gera segundo checkout após refresh/retry.
- [ ] Pix: `Copiar código` copia o conteúdo completo e o estado visual muda para `Copiado`; **não incluir o QR real/código integral em capturas ou issues**.
- [ ] Aba oculta/retorno visível: polling respeita estado real sem afirmação falsa de aprovação.
- [ ] Teclado/zoom 200%/prefers-reduced-motion.
- [ ] QA só com contas fictícias da HML e Mercado Pago sandbox; nenhuma cobrança real.

> A CI prova sintaxe/build e regressões unitárias, **não** substitui revisão visual/manual no navegador.
