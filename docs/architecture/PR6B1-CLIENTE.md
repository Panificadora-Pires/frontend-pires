# PR6B.1 — Transporte realtime Vue (opt-in, sem produção)

**Base:** frontend `dev`. **Depende:** backend PR6A.1 #58 e PR6A.2 #59 (ambos em Draft).  
**Estado:** preparado para CI e testes locais; **WebSocket ainda NÃO habilitado** no deploy Fabroku.

## Integração e protocolo

O cliente `src/services/realtime.js` tem uma única conexão WS por aba e atende diferentes componentes por assinaturas. O transporte começa **desligado**: `VITE_REALTIME_ENABLED=false` (padrão e exemplo em `.env.example`).

Quando habilitado **somente em homologação**:

1. A conexão é iniciada no `AdminLayout` após carregar a sessão.
2. A API HTTP autenticada por JWT obtém `POST /api/realtime/ticket/`; o JWT permanece nos headers do Axios.
3. O navegador recebe ticket descartável, abre `wss://<backend>/ws/v1/events/` com os subprotocolos `pires.v1` e `pires.ticket.<ticket>`; não coloca JWT na URL, no subprotocol ou nos logs.
4. O backend valida origem, ticket Redis de uso único e conta; a conexão WS é somente leitura.
5. A abertura/reconexão revalida o snapshot REST. Eventos v1 podem conter apenas `tipo`, `event_id`, `emitido_em` e `pedido_id`, com deduplicação de até 400 identificadores.
6. A tela de Kanban invalida suas colunas por evento `pedido.*` (sem resetar filtros/páginas), o layout atualiza indicadores agregados e mensagens não lidas por REST.
7. Desconexão dispara solicitação de novo ticket após backoff exponencial (até 30 segundos) com jitter; handshake sem resposta encerra após 10 segundos; logout/troca de sessão encerra o socket e invalida respostas antigas.

A implementação **não** aplica status, pagamentos ou conteúdo do chat diretamente do evento. O HTTP autenticado segue como fonte de verdade.

## Fallback

O polling de **15 segundos continua ativo mesmo quando o WS estiver conectado** neste primeiro PR, para não depender de infraestrutura ainda não homologada. Um PR posterior poderá reduzir o polling **após** testar WSS e Redis no Fabroku e comprovar que o fallback retoma automaticamente depois da queda.

## Configuração de desenvolvimento e homologação

No `.env.local` do frontend, após confirmar backend ASGI, Redis privado e proxy WSS:

```env
VITE_REALTIME_ENABLED=true
VITE_API_URL=http://127.0.0.1:8000/api
```

Execute `pdm run uvicorn app.asgi:application --host 127.0.0.1 --port 8000` no backend local com `REALTIME_ENABLED=True` e Redis configurado. `http://` só é aceito para loopback `localhost`/`127.0.0.1`; outros hosts exigem HTTPS/WSS. A flag `VITE_` é definida durante o build, não dinamicamente.

Em produção, **não configurar** `VITE_REALTIME_ENABLED=true` enquanto o backend continuar servido via `gunicorn app.wsgi:application`.

## Testes e gates

```powershell
npm ci
node --test tests/realtime-client.test.mjs
npm run build
```

- [ ] Node + Vite/PWA + Vercel aprovados.
- [ ] Homologação com backend PR6A.1/PR6A.2, Redis real, duas abas e dois usuários (não confundir sessão com permissão).
- [ ] Login/logout e troca de conta sem eventos de sessão anterior.
- [ ] Queda do WS/Redis, perda de internet, reconexão, convite expirado, protocolo incorreto e WSS real.
- [ ] Kanban preserva busca, filtros, status, paginação e animações; checkout/QR chat e pagamentos sem regressões.
- [ ] Cobrir notificações do cliente e chat aberto no próximo PR6B.2, usando o mesmo serviço.
- [ ] Manter `main` e deploy de produção intactos até PR7.
