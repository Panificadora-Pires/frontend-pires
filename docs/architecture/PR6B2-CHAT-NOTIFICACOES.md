# PR6B.2 — Pedidos, chat e notificações do cliente via sinais

**Base:** PR6B.1 `feat/pr6b1-realtime-client`. Dependências backend: PR6A.1 #58 e PR6A.2 #59.  
**Status:** isolado, Draft, **sem deploy**. `VITE_REALTIME_ENABLED=false` por padrão e polling preservado.

## Integração

- `StudentLayout.vue` inicia o único cliente WS da aba **somente com conta autenticada**, assina eventos e reconsulta dados via REST:
  - `pedido.criado` e `pedido.atualizado` → store de pedidos do aluno;
  - `chat.mensagem_nova` e `chat.leitura_atualizada` → contadores de chat;
  - `notificacao.alterada` → store de notificações / contador do sininho;
  - sinal `null` na abertura/reconexão → atualização completa de pedidos, chat e notificações para recuperar eventos perdidos.
- `OrderChatPanel.vue` observa **apenas** eventos que correspondem a `pedidoId` do chat aberto; consulta `GET` novamente para mensagens e status de leitura. Admin e cliente usam o mesmo componente.
- `realtimeInvalidations.js` agrupa rajadas de eventos em uma consulta por recurso por janela de 400ms. Preserva filtros do painel de notificações e mensagens pendentes; nenhuma alteração remota é aplicada diretamente ao estado.
- `chat.js` ignora respostas HTTP obsoletas em GET/POST quando `resetar()` ou a versão de sessão mudou, evitando reaplicar mensagens de conta anterior.
- Logout ou desmontagem param assinaturas, timers e WS. O polling **continua ativo** até a validação do Fabroku em HML.

## Testes

```powershell
npm ci
node --test tests/realtime-client.test.mjs tests/realtime-invalidations.test.mjs tests/realtime-chat-session.test.mjs
npm run build
```

Revisar também em navegador com **duas contas, duas abas**, mensagens de ambas as direções, filtro em notificações, pedido alterado no Kanban, reconexão e queda do Redis/WSS. O backend deve impedir que eventos de outros clientes entrem no grupo errado; frontend não substitui autorização HTTP.

## Bloqueios conhecidos

- HML Fabroku ainda não provisionada; Redis/WSS não comprovados.
- PR6A.1 passou em mock, mas precisa de driver WebSocket do servidor Uvicorn e teste real com `wsproto` antes do deploy HML.
- Sem redução de polling, sem push notifications e sem promessa de entrega garantida em WebSocket.
- Chat, QR, Mercado Pago e checkout continuam mutando exclusivamente via API REST.
