# Frontend — Pires Panificadora

Aplicação Vue para clientes e administração.

## Stack

- Vue 3
- Vite
- Pinia
- Vue Router
- Axios
- Lucide
- PWA
- Vercel

## Desenvolvimento

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Variáveis

Veja `.env.production.example`.

Variáveis principais:
- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_MERCADO_PAGO_PUBLIC_KEY`

Variáveis `VITE_*` são incorporadas no bundle durante o build. Depois de alterar qualquer uma delas na Vercel, faça novo deploy.

## Produção

URL atual:
`https://frontend-pires.vercel.app`

API:
`https://backend-pires.class.fabricadesoftware.ifc.edu.br/api`

## Áreas

### Cliente
- início;
- cardápio;
- promoções;
- carrinho;
- checkout;
- pedidos;
- favoritos;
- notificações;
- perfil.

### Administração
- dashboard;
- pedidos;
- produtos;
- categorias;
- promoções;
- relatórios;
- usuários;
- retirada por QR Code.

## Pagamento

O navegador usa a Public Key do Mercado Pago para o Payment Brick. O Access Token nunca deve ser colocado no frontend.

Para produção, altere somente a Public Key para a credencial produtiva correspondente à mesma aplicação do backend.

## Google

O frontend utiliza Google Identity Services.

No Google Cloud, a URL final do frontend precisa estar entre as origens JavaScript autorizadas.

## PWA e câmera

Leitura por câmera exige contexto seguro. Em produção, mantenha o frontend em HTTPS e permita acesso à câmera no navegador.
