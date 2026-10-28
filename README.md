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
- QR Code de retirada;
- chat com a padaria em cada pedido;
- assistente de dúvidas (chatbot por regras e FAQ).

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
- leitura de QR Code por câmera ou código manual;
- chat com o cliente no detalhe do pedido e aviso de mensagens não lidas na fila.

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

A autenticação utiliza JWT e o cliente HTTP é responsável por enviar o token nas requisições autenticadas. Falha de rede (sem resposta do servidor) não desloga o usuário: os tokens só são apagados quando o backend recusa a sessão.

## Atualização automática

As telas se atualizam sozinhas por polling, sem recarregar a página. A lógica fica em `src/utils/autoRefresh.js` (`createAutoRefresh`) e no composable `src/composables/useAutoRefresh.js`:

- não faz requisições com a aba escondida; ao voltar para a aba, ganhar foco ou reconectar, atualiza na hora;
- nunca executa duas buscas ao mesmo tempo e, em erro, espera cada vez mais (até 5 min) antes de tentar de novo;
- falha em segundo plano mantém os dados já exibidos e mostra "Sem conexão, tentando de novo".

| Tela | Intervalo |
|---|---|
| Fila, dashboard (pedidos) e detalhe do pedido no admin | 15 s |
| Meus pedidos (cliente) | 10 s com pedido em andamento, 60 s sem |
| Notificações (badge do menu) | 30 s |
| Chat aberto (gaveta do cliente ou detalhe do admin) | 5 s |
| Mensagens não lidas do chat | 30 s no cliente, 15 s no admin |
| Cardápio, produtos do admin e números do dashboard | 60 s |
| Pagamento Pix/cartão no checkout | 5 s |

No admin, a store `adminOrders` é a única fonte da fila: o `AdminLayout` a mantém atualizada, e o badge do menu, o dashboard e a tela de pedidos leem dela. Mudar o status atualiza a lista local na hora. SSE/WebSocket não foi adotado porque o Gunicorn síncrono do Fabroku prenderia um worker por conexão.

## Chat por pedido

Cada pedido tem uma conversa entre o cliente e a padaria (`/api/chat/`, veja o README do backend).

- Cliente: botão **Mensagens** no card de "Meus pedidos", com contador de mensagens novas; abre uma gaveta (`components/chat/OrderChatDrawer.vue`), em tela cheia no celular.
- Admin: card **Conversa com o cliente** no detalhe do pedido; a fila mostra quantas mensagens não lidas há e permite filtrar só esses pedidos.
- O painel (`components/chat/OrderChatPanel.vue`) é o mesmo nos dois lados. Fluxo: `OrderChatPanel` → `stores/chat.js` → `services/chat.service.js`.
- Envio otimista: a mensagem aparece na hora como "Enviando..."; se falhar, fica marcada como "Não enviada", com **Tentar de novo** e **Descartar**.
- Enter envia, Shift+Enter quebra a linha. As mensagens são exibidas sempre como texto (sem `v-html`).
- Abrir a conversa marca como lidas as mensagens do outro lado; no cliente, também some a notificação "Nova mensagem da padaria".
- Depois de retirado ou cancelado, o pedido aceita mensagens por mais 24 h (configurável no backend) e então a conversa fica só para leitura.

## Assistente de dúvidas (chatbot)

Botão **Dúvidas?** no canto inferior direito da área do cliente (`components/chatbot/ChatbotWidget.vue`); as respostas vêm de `/api/chatbot/` (regras + FAQ editável no admin do backend).

- **Posição:** no celular, o botão fica acima da navegação inferior e o painel ocupa a tela toda. Fica oculto no checkout para não disputar espaço com o pagamento.
- **Conversa:** o cliente escreve ou toca nos botões de assunto; só a última resposta mostra os botões de próximo passo. O histórico fica na store `chatbot` durante a sessão e é apagado no logout.
- **Respostas com dados:** status dos pedidos do próprio cliente e disponibilidade do produto citado ("tem coxinha?").
- **Falar com a padaria:** leva a `/pedidos?chat=ID`, que abre a gaveta de chat do pedido.
- **Estados:** abrindo, assistente respondendo, erro com **Tentar de novo** (e mensagem própria para limite de perguntas).
- **Acessibilidade:** Esc fecha e devolve o foco ao botão; lista com `role="log"`; campo com rótulo.

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
