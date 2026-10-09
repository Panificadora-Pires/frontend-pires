# Pires Panificadora — Frontend

Frontend do sistema de pedidos da Pires Panificadora, desenvolvido em Vue 3 + Vite e publicado como PWA.

O sistema possui área de cliente e área administrativa, integradas ao backend Django/DRF e aos serviços de autenticação Google e pagamento do Mercado Pago.

## Stack

- Vue 3
- Vite
- Pinia
- Vue Router
- Axios
- Lucide
- PWA
- CSS puro com design tokens
- Vercel

## URL de produção

Frontend:

```text
https://frontend-pires.vercel.app
```

API utilizada em produção:

```text
https://backend-pires.class.fabricadesoftware.ifc.edu.br/api
```

## Funcionalidades

### Cliente

- início;
- cardápio;
- promoções;
- carrinho;
- checkout;
- pedidos;
- favoritos;
- notificações;
- perfil;
- autenticação por e-mail;
- autenticação Google;
- recuperação de senha;
- verificação de conta;
- pagamento por dinheiro na retirada;
- pagamento por Pix;
- pagamento por cartão;
- acompanhamento do status do pedido;
- QR Code de retirada.

### Administração

- dashboard;
- pedidos;
- detalhes de pedidos;
- produtos;
- categorias;
- promoções;
- relatórios;
- usuários;
- alteração do status dos pedidos;
- confirmação de retirada;
- leitura de QR Code por câmera ou código manual.

## Estrutura principal

```text
src/
├── assets/
│   └── styles/
│       ├── admin.css
│       ├── auth-forms.css
│       ├── student.css
│       └── tokens.css
├── components/
│   ├── admin/
│   ├── auth/
│   ├── cart/
│   ├── catalog/
│   ├── layout/
│   ├── orders/
│   ├── payment/
│   └── ui/
├── router/
├── services/
├── stores/
├── views/
│   ├── admin/
│   ├── auth/
│   └── student/
├── App.vue
└── main.js
```

### Responsabilidades

- `views/`: telas da aplicação;
- `components/`: componentes reutilizáveis;
- `services/`: comunicação com a API;
- `stores/`: estado global com Pinia;
- `router/`: rotas e guards;
- `assets/styles/`: estilos globais e tokens visuais.

## Desenvolvimento local

### Pré-requisitos

- Node.js compatível com a versão definida no projeto;
- npm;
- backend executando localmente ou acessível remotamente.

### Instalação

```bash
npm install
```

Crie o arquivo `.env` a partir de `.env.example` e ajuste as variáveis necessárias.

Depois:

```bash
npm run dev
```

## Build

```bash
npm run build
```

Para testar o build localmente:

```bash
npm run preview
```

## Variáveis de ambiente

As principais variáveis são:

```env
VITE_API_URL=
VITE_GOOGLE_CLIENT_ID=
VITE_MERCADO_PAGO_PUBLIC_KEY=
```

Exemplo de produção:

```env
VITE_API_URL=https://backend-pires.class.fabricadesoftware.ifc.edu.br/api
VITE_GOOGLE_CLIENT_ID=<CLIENT_ID_WEB>
VITE_MERCADO_PAGO_PUBLIC_KEY=<PUBLIC_KEY_PRODUCAO>
```

As variáveis `VITE_*` são incorporadas ao bundle durante o build. Depois de alterar uma delas na Vercel, é necessário realizar um novo deploy.

## Comunicação com a API

A comunicação HTTP é centralizada em `src/services/api.js`, utilizando Axios.

Os demais arquivos em `src/services/` separam chamadas por domínio, por exemplo:

```text
admin.service.js
auth.service.js
catalog.service.js
favorite.service.js
notification.service.js
order.service.js
payment.service.js
```

A autenticação utiliza JWT e o cliente HTTP é responsável por enviar o token nas requisições autenticadas.

## Pagamentos

O checkout suporta:

- dinheiro na retirada;
- Pix;
- cartão.

O navegador usa a **Public Key** do Mercado Pago para inicializar os componentes de pagamento.

A Public Key pode ficar no frontend.

Nunca devem ser colocados no frontend:

```text
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
```

Esses segredos pertencem exclusivamente ao backend.

Em produção, a Public Key deve ser a credencial produtiva da mesma aplicação Mercado Pago utilizada pelo backend.

## Pix

O Pix é criado pelo backend através da integração com o Mercado Pago.

Em ambiente produtivo, a conta Mercado Pago responsável pela aplicação precisa possuir uma chave Pix cadastrada e ativa. Sem isso, a transação Pix pode falhar mesmo com credenciais e webhook configurados corretamente.

## Cartão

O formulário de cartão é renderizado pelo Mercado Pago Payment Brick.

Os dados sensíveis do cartão são tratados pelo Mercado Pago. A Pires não deve armazenar número completo do cartão nem CVV.

## Google

O frontend utiliza Google Identity Services.

No Google Cloud, o OAuth Client ID do tipo Web deve possuir como origem JavaScript autorizada:

```text
https://frontend-pires.vercel.app
```

Localhost pode ser mantido apenas para desenvolvimento.

Se o domínio de produção mudar, a nova origem deve ser adicionada ao Google Cloud antes da migração.

## PWA e câmera

A aplicação funciona como PWA.

A leitura do QR Code pelo painel administrativo utiliza a câmera do dispositivo.

A câmera exige contexto seguro. Em produção:

- mantenha o frontend em HTTPS;
- permita acesso à câmera no navegador;
- no celular, dê preferência à câmera traseira quando disponível.

O scanner também mantém entrada manual como alternativa.

## Deploy na Vercel

Configure as variáveis no ambiente **Production**:

```env
VITE_API_URL=https://backend-pires.class.fabricadesoftware.ifc.edu.br/api
VITE_GOOGLE_CLIENT_ID=<CLIENT_ID_WEB>
VITE_MERCADO_PAGO_PUBLIC_KEY=<PUBLIC_KEY_PRODUCAO>
```

Depois faça um novo deploy.

O arquivo `vercel.json` contém a configuração usada pelo projeto na Vercel.

## Smoke test de produção

Depois de cada deploy relevante, valide:

1. login comum;
2. login Google;
3. cardápio;
4. promoções;
5. adicionar item ao carrinho;
6. checkout;
7. dinheiro na retirada;
8. Pix;
9. cartão;
10. listagem de pedidos;
11. área administrativa;
12. mudança de status de pedido;
13. QR Code de retirada;
14. câmera do QR em HTTPS;
15. logout.

## Fluxo principal

```text
Cliente
  ↓
Cardápio
  ↓
Carrinho
  ↓
Checkout
  ↓
Pagamento
  ├── Dinheiro
  ├── Pix
  └── Cartão
  ↓
Pedido confirmado
  ↓
Pronto
  ↓
QR Code
  ↓
Retirada
```

## Segurança

O frontend nunca deve ser considerado fonte de verdade para:

- preço;
- estoque;
- permissões;
- status financeiro;
- aprovação de pagamento.

Essas validações pertencem ao backend.

Segredos de integração nunca devem ser colocados em variáveis `VITE_*`, pois essas variáveis ficam disponíveis no bundle entregue ao navegador.
