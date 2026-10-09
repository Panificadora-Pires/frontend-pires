# Frontend — checklist de produção

## Vercel Environment Variables

Configure no ambiente **Production**:

```env
VITE_API_URL=https://backend-pires.class.fabricadesoftware.ifc.edu.br/api
VITE_GOOGLE_CLIENT_ID=<CLIENT_ID_WEB>
VITE_MERCADO_PAGO_PUBLIC_KEY=<PUBLIC_KEY_PRODUCAO>
```

Depois faça um novo deploy.

## Google Cloud

No OAuth Client ID tipo Web:
- origem autorizada: `https://frontend-pires.vercel.app`
- mantenha localhost somente para desenvolvimento;
- se trocar para domínio próprio, adicione a nova origem antes da troca.

## Mercado Pago

A `VITE_MERCADO_PAGO_PUBLIC_KEY` deve ser a **Public Key de produção** da mesma aplicação cujo Access Token produtivo está no backend.

Nunca coloque `MERCADO_PAGO_ACCESS_TOKEN` no Vercel.

## Smoke test

Depois do deploy:
1. login comum;
2. login Google;
3. cardápio;
4. promoções;
5. adicionar item ao carrinho;
6. checkout;
7. dinheiro;
8. Pix/cartão após backend produtivo estar pronto;
9. pedidos;
10. admin;
11. câmera do QR em HTTPS;
12. logout.
