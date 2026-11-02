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

## Identidade visual da área do cliente

Direção "Balcão creme" (Fase 5): fundo creme, marrom nos textos, dourado nos detalhes. A área admin mantém o visual próprio.

- **Tokens** em `src/assets/styles/tokens.css`: paleta (`--pp-creme`, `--pp-marrom`, `--pp-dourado-escuro`…), fontes e cores das ilustrações (`--ilu-*`).
  - Os `--student-*` de `student.css` apontam para esses tokens.
  - **Anton** em chamadas do banner, da vitrine de categorias e nos produtos da Home, **Caveat** em anotações "à mão" e **Inter** no corpo e nas ações.
- **Header flutuante:** barra de vidro neutro translúcido com margens externas, sempre visível na rolagem. Início, Cardápio, Promoções e Meus pedidos, busca (`/cardapio?busca=`), favoritos, notificações, conta e Carrinho com contador permanecem disponíveis.
  - `components/layout/StudentHeader.vue` cuida das interações; `StudentHeaderPanel.vue` apresenta os painéis. Categorias e promoções vêm de `stores/navigationCatalog.js` pelos serviços existentes, sem outro polling.
  - Cardápio abre categorias reais com filtro por `/cardapio?categoria=id`. Promoções lista apenas ofertas vigentes; quando não há ofertas, mantém o acesso ao cardápio. Pedidos aponta para acompanhamento/QR e notificações existentes.
  - Mouse, clique, ArrowDown e Escape; fechamento ao navegar, clicar fora ou sair com o foco. No tablet/celular (abaixo de 1180 px), painel com busca e grupos expansíveis por toque; navegação inferior preservada.
  - Tokens `--pp-header-*`, `backdrop-filter` nativo, fallback sólido sem suporte e movimento reduzido. Os offsets existentes de foco e resumos sticky acompanham a altura e a margem da barra.
  - Fotos de perfil têm recorte circular com `object-fit: cover`, inclusive em imagens verticais/horizontais. O campo `avatar` da API também fornece a foto Google quando não há upload próprio; esse fallback depende da atualização do backend com a migration `core.0010`.
- **Ilustrações próprias:** o cardápio é fictício, então produto sem foto ganha um SVG próprio.
  - Componente `components/catalog/ProductIllustration.vue`; o tipo vem de `utils/ilustracaoProduto.js` (nome do produto e depois categoria).
  - Foto cadastrada no admin tem prioridade.
- **Home:** saudação → banner (`components/home/HomeBanner.vue`) → categorias (`components/home/HomeCategories.vue`) → Destaques (`ProductCard`) → Como funciona (`components/home/HomeComoFunciona.vue`) → Promoções (se houver).

### Vitrine de categorias V1

Salgados, Doces, Bebidas e Combos usam as quatro fotografias estáticas fornecidas no protótipo aprovado, otimizadas em `src/assets/images/categories/` (WebP 800×800, aproximadamente 129 KB no total). Os produtos aparecem inteiros, com `object-fit: contain`: quatro colunas no desktop e duas até 980 px. Cada card é um único RouterLink; mouse e foco realçam borda/sombra e ampliam a foto em 6% com a mesma transição suave dos cards de produtos (0,45 s). A imagem fica contida na sua área, sem alterar o tamanho do card. Movimento reduzido desativa o zoom; navegação por teclado e toque permanece independente do efeito.

`HomeCategories.vue` reutiliza `useNavigationCatalogStore.carregarCategorias()`, compartilhado com o header. A apresentação encontra categorias ativas por slug ou nome normalizado e navega para `{ name: 'cardapio', query: { categoria: String(id) } }`, com o id retornado pela API. O filtro existente do cardápio mantém a seleção ao navegar e recarregar. Categorias ausentes/inativas não geram links; há estados de carregamento, erro com nova tentativa e vazio. Nenhum endpoint, filtro, dependência, header ou banner foi alterado.

Validação e capturas locais: `../docs/prints/categorias-v1-2026-10-30/`. Não há script `npm test` neste projeto; foram usados build e verificações no Chrome DevTools MCP com dados fictícios/API local. A aprovação visual final cabe ao Arthur.

### Cards de produtos da Home

`ProductCard` recebe `variant="home"` somente nos destaques e promoções da página inicial. Essa variante acompanha as categorias: superfície branca, borda creme, nome em Anton, mídia até as bordas superiores e controles independentes de detalhes, favorito e adição ao carrinho. A grade, a largura dos cards e a altura da mídia são preservadas; nomes longos continuam sem truncamento. Cardápio, Favoritos e a página de Promoções mantêm a variante padrão.

Foto cadastrada e ilustração de fallback continuam no `ProductImage`. Hover e foco ampliam somente a imagem em 6%, sem giro ou mudança no tamanho do card; movimento reduzido desativa o efeito. Preços, estados de carregamento, eventos e voo ao carrinho usam o fluxo existente.

Provas locais em `../docs/prints/produtos-home-2026-10-30/`: verificações Playwright com Chrome, dados fictícios e API simulada no navegador, além de capturas pelo Chrome DevTools MCP. Isso não valida autenticação, checkout ou pagamento contra o backend real. O projeto continua sem script `npm test` e sem dependência nova de testes.

### Ações dos cards: preenchimento circular

As ações dos cards da área do cliente compartilham `assets/styles/card-actions.css` e `components/ui/CardActionContent.vue`. A classe opt-in `pp-card-action` recorta uma camada dourada por `clip-path: circle()`, expandindo do centro inferior em 450 ms com `--pp-ease` e retraindo na saída. A camada revela simultaneamente uma cópia visual do conteúdo em marrom, marcada com `aria-hidden`, mantendo o contraste durante a passagem do círculo. O nome acessível, os eventos e o estado continuam no botão original. Não há animação JavaScript nem dependência nova.

Aplicação: adicionar/favorito do `ProductCard` (Home, Cardápio, Promoções e Favoritos), setas visuais do `HomeCategories`, adicionar nas recomendações do carrinho, Mensagens/QR do `OrderCard` e quantidade/remoção dos itens do carrinho. Nas categorias, `pp-card-action-trigger` acompanha hover/foco do RouterLink original, sem botão aninhado. A remoção usa fundo de alerta suave e ícone vermelho; favorito selecionado mantém coração preenchido e `aria-pressed`. QR conserva seu estado de sucesso original.

Disabled/loading ocultam imediatamente o preenchimento e preservam o spinner; toque independe de hover, foco permanece visível e movimento reduzido troca o estado sem expansão/contração perceptível. O foco de quantidade fica dentro do grupo que recorta seu conteúdo. Zoom das fotos, bordas/sombras, voo ao carrinho, header e banner mantêm seus fluxos.

Provas e gravação local: `../docs/prints/hover-cards-2026-11-01/`; plano: `../docs/planos/hover-circular-cards.md`. Testes de interface usam dados fictícios e API simulada no navegador; não validam checkout ou pagamento real. Admin, superfícies de detalhes/notificações, modal e demais botões externos aos cards não recebem a classe, com a extensão do banner descrita abaixo.

Extensão solicitada ao banner: os CTAs de compra e navegação de `HomeBanner.vue` usam o mesmo componente/efeito. No comercial, o botão dourado recebe o círculo marrom com conteúdo creme; nos demais slides, o botão marrom recebe dourado. A variável local `--pp-card-action-radius: 75%` ajusta o recorte ao botão largo para a expansão permanecer perceptível (o padrão de 120% continua nos cards). Conteúdo, dimensões, vídeo, navegação e adição/voo ao carrinho são preservados.

Correção de alinhamento do banner: etiqueta, título, descrição e CTA compartilham linhas de CSS Grid/subgrid entre todos os slides. A altura mínima é comum ao comercial, promoções e QR; conteúdos maiores ampliam o conjunto sem recorte. A troca mantém apenas o fade do slide, sem subida das chamadas. O hover circular continua independente. Evidências locais: `../docs/prints/banner-alinhamento-2026-11-02/` (73 verificações de layout/mídia e 21 de hover/ações, Chromium, dados fictícios).

### Comercial da coxinha no banner

O banner usa o comercial aprovado da coxinha, sem áudio, com versão horizontal no desktop e vertical no celular. Os demais produtos mantêm suas fotos ou ilustrações; novos vídeos serão adicionados posteriormente. As mídias e os respectivos posters ficam em `public/videos/`.

O vídeo toca somente no slide ativo, avança ao terminar e reinicia ao retornar. A aba escondida pausa a reprodução; movimento reduzido, erro ou bloqueio de reprodução usam o poster. Os indicadores permitem escolher o destaque por toque ou teclado. O header usa vidro neutro no desktop e no celular.

Os destaques continuam vindo dos produtos e promoções cadastrados, com preço, estoque e ações de compra existentes. A mídia não altera a seleção dos produtos.

### Animações

| Onde | O quê |
|---|---|
| Banner | Carrossel de 6 s com pausa no mouse ou foco, setas e indicadores com progresso. Conteúdo: promoções vigentes; sem promoção, destaques; e sempre o slide "Como funciona" |
| Banner | Parallax: 3 camadas de "morros de massa" sobem em velocidades diferentes nos primeiros 320 px de rolagem |
| Como funciona | Os 3 passos sobem acompanhando a rolagem |
| Cards | Zoom só na imagem ao passar o mouse (sem mudar o tamanho do card) |
| Carrinho | O produto "voa" até o carrinho e o contador pula, **só depois** de `cart.adicionar` (`utils/vooAoCarrinho.js` + `StudentLayout`) |
| Seções | Aparecem suavemente ao entrar na tela (diretiva `v-revelar`) |

Com `prefers-reduced-motion: reduce`:

- não há voo nem parallax;
- o banner não troca sozinho;
- passos e seções aparecem completos.

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
