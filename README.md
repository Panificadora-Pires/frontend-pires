# Panificadora Pires - Frontend

Aplicação web (PWA) do sistema de pedidos antecipados da Panificadora Pires, Projeto Integrador do Curso Técnico em Informática do IFC — Campus Araquari. O cliente escolhe o lanche, paga por Pix, cartão ou em dinheiro na retirada e retira o pedido no balcão mostrando um QR Code. A equipe da padaria acompanha a fila de pedidos, confirma a retirada pela câmera e consulta os relatórios.

- Documentação do projeto: [Panificadora-Pires](https://github.com/Panificadora-Pires/.github)
- Backend: [backend-pires](https://github.com/Panificadora-Pires/backend-pires)
- Publicação: https://panificadora-pires.vercel.app

## Funcionalidades

**Área do cliente**
- Cadastro com confirmação de e-mail, login com e-mail ou Google e redefinição de senha.
- Home com banner de ofertas, categorias e destaques.
- Cardápio com busca, categorias, filtros e ordenação; página de promoções.
- Carrinho e pagamento por Pix ou cartão (Mercado Pago) ou em dinheiro na retirada.
- Meus pedidos com as etapas em tempo real, o QR Code de retirada e o chat com a padaria.
- Notificações, favoritos, perfil e assistente de dúvidas.
- Termos de Uso, Política de Privacidade e Política de Cookies.

**Área da administração**
- Painel com os indicadores do dia e os produtos mais vendidos.
- Fila de pedidos por etapa, detalhe do pedido e retirada por QR Code com a câmera.
- Cadastro de categorias, produtos e promoções.
- Relatórios de vendas e consulta de usuários.

## Instalação e Configuração

1. Tenha o [Node.js 22](https://nodejs.org/) instalado e o [backend](https://github.com/Panificadora-Pires/backend-pires) rodando em http://127.0.0.1:8000.

2. Clone o repositório e instale as dependências:

   ```
   git clone https://github.com/Panificadora-Pires/frontend-pires.git
   cd frontend-pires
   npm install
   ```

3. Crie o arquivo `.env` a partir do `.env.example`:

   ```
   cp .env.example .env
   ```

   | Variável | Descrição |
   |---|---|
   | `VITE_API_URL` | Endereço da API, terminando em `/api` (ex.: `http://127.0.0.1:8000/api`). |
   | `VITE_GOOGLE_CLIENT_ID` | ID do cliente OAuth do Google, para o login com o Google. |
   | `VITE_MERCADO_PAGO_PUBLIC_KEY` | Chave pública do Mercado Pago, para o pagamento com cartão e Pix. |
   | `VITE_REALTIME_ENABLED` | `true` para usar a atualização em tempo real; `false` usa consultas periódicas. |

   As variáveis `VITE_*` vão para o código publicado. Nunca coloque senhas ou tokens secretos nelas.

4. Execute o servidor de desenvolvimento:

   ```
   npm run dev
   ```

5. Acesse http://localhost:5173. Com os dados de exemplo do backend (`pdm run seed_dados`), dá para entrar como cliente ou como administrador.

## Comandos Úteis

- `npm run dev`: servidor de desenvolvimento com recarga automática.
- `npm run build`: gera a versão de produção em `dist/`, com o service worker do PWA.
- `npm run preview`: serve localmente a versão gerada pelo `build`.
- `node --test tests/*.test.mjs`: executa os testes (é o mesmo comando da integração contínua).

## Estrutura

```
src/
  views/         telas (student, admin, auth e páginas legais)
  components/    componentes por domínio (catalog, cart, checkout, orders, admin, ...)
  composables/   lógica das telas e comportamentos reutilizáveis
  stores/        estado global com Pinia
  services/      chamadas à API (todas passam por services/api.js)
  router/        rotas e regras de acesso
  utils/         funções puras (formatação, filtros, regras de exibição)
  assets/styles/ tokens de cor, tipografia e espaçamento e estilos compartilhados
```

O fluxo de toda tela com dados é **View → Store → Service**. A instância do Axios em `services/api.js` envia o token, renova a sessão quando ele expira e lê o endereço da API do `VITE_API_URL`. Preço, estoque e situação do pagamento sempre vêm do backend.

## Publicação

O frontend é publicado na Vercel a partir da branch `main`. As variáveis de produção estão descritas em `.env.production.example`; os valores reais ficam no painel da Vercel, e mudar uma variável exige uma nova publicação. Os cabeçalhos de segurança estão em `vercel.json`.

## Detalhes do Projeto

Esse projeto utiliza os seguintes pacotes e tecnologias:

- [Vue 3](https://vuejs.org/) com Composition API e `<script setup>`.
- [Vite](https://vite.dev/) e [vite-plugin-pwa](https://vite-pwa-org.netlify.app/): build e PWA.
- [Pinia](https://pinia.vuejs.org/) e [Vue Router](https://router.vuejs.org/).
- [Axios](https://axios-http.com/): comunicação com a API.
- [Lucide](https://lucide.dev/): ícones.
- [Motion for Vue](https://motion.dev/docs/vue): animações, respeitando a preferência de movimento reduzido.
- [ZXing](https://github.com/zxing-js/browser): leitura do QR Code pela câmera.
- [Mercado Pago Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/landing): formulário de pagamento.
- [Google Identity Services](https://developers.google.com/identity/gsi/web): login com o Google.
- CSS próprio, sem framework, com tokens em `src/assets/styles/tokens.css`.
