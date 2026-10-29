# AGENTS.md — Frontend da Pires Panificadora

Frontend Vue 3 + Vite (PWA) da **Pires Panificadora**. As regras gerais (git, segurança, testes, formato da resposta) estão no `AGENTS.md` da pasta pai. Contexto mestre: `../contexto.md`. Plano da fase: `../docs/planos/`.

## Stack

Vue 3 (`<script setup>`, Composition API), JavaScript sem TypeScript, Vite, Pinia, Vue Router, Axios, `lucide-vue-next`, `@zxing/browser`, `vite-plugin-pwa`, CSS puro com tokens. Confirme o `package.json` antes de importar qualquer biblioteca. Não instalar Tailwind nem trocar de framework.

## Arquitetura

- Fluxo de toda tela com dados: **View → Store → Service**.

| O quê | Onde | Nome |
|---|---|---|
| Página (rota) | `src/views/{student,admin,auth}/` | `XView.vue` |
| Componente de domínio | `src/components/<dominio>/` | PascalCase (`ProductCard.vue`) |
| Componente base de UI | `src/components/ui/` | prefixo `Base` (`BaseButton`, `BaseInput`) |
| Estrutura de página | `src/components/layout/` | `StudentLayout`, `AdminLayout`, `AuthLayout` |
| Store Pinia | `src/stores/<entidade>.js` | `useXStore` |
| Chamadas HTTP | `src/services/<dominio>.service.js` | funções por endpoint |
| Cliente HTTP | `src/services/api.js` | instância Axios única |
| Estilos globais e tokens | `src/assets/styles/` | `tokens.css`, `student.css`, `admin.css`, `auth-forms.css` |

- Imports com o alias `@/` (`@` = `src/`).
- HTTP **sempre** pela instância de `src/services/api.js`: ela injeta o JWT, renova o token em 401 e lê `VITE_API_URL`. Nunca `axios` direto nem URL fixa.
- Rotas em `src/router/index.js`, em lazy loading, com `meta` (`requerAuth`, `requerAdmin`, `requerAluno`, `somenteVisitante`). Navegação por nome de rota. Não criar item de menu para página que ainda não existe.
- Seguir o estilo atual dos stores (`defineStore('nome', { state, getters, actions })`). Quando a Fase 2 introduzir o helper de atualização automática, reutilizá-lo em vez de criar novos `setInterval`.

## Telas e componentes

- Toda tela com dados trata **carregando, vazio, erro e sucesso**. A atualização automática é silenciosa: não pisca nem apaga dados ao falhar.
- `v-for` com `:key` estável; sem `v-if` no mesmo elemento do `v-for`; sem `v-html` com dado do usuário.
- Props tipadas, emits declarados. Derivações em `computed`.
- Ícones de `lucide-vue-next`; ícone decorativo com `aria-hidden="true"`; botão só com ícone com `aria-label`.
- Textos da interface em português do Brasil.

## CSS e identidade visual

- Tudo em tokens `--pp-*` de `tokens.css`; sem hex repetido nos componentes. Atualizar o arquivo de tokens em vez de espalhar valores.
- Contraste, foco visível de teclado, estados que não dependem só de cor.
- Animações curtas (150–400 ms), com `prefers-reduced-motion` respeitado e sem depender de hover.
- Sem rolagem horizontal no celular (validar em 390 px). Menu fixo no topo não pode cobrir conteúdo.
- Direção do redesign e checklist de "cara de IA genérica": `../AGENTS.md` (seção 4) e `../docs/planos/fase-5-redesign.md`.

## Pagamento e segredos

- O Payment Brick usa só a **Public Key** (`VITE_MERCADO_PAGO_PUBLIC_KEY`). O Access Token e o Webhook Secret do Mercado Pago **nunca** vão para o frontend.
- Variáveis `VITE_*` entram no bundle: sem segredos. Mudou a variável na Vercel, é preciso novo deploy.
- O frontend não é fonte de verdade para preço, estoque, permissões ou status financeiro.

## Verificação

- Antes de dizer que terminou: `npm run build`; a partir da Fase 6, também `npm test`.
- Subir `npm run dev` (localhost:5173) com o backend local e conferir o fluxo afetado em desktop (≥ 1280 px) e celular (390 px), sem erros no console.
- Salvar prints de validação em `../docs/prints/fase-N/`, sem dados de usuários reais.

## Commits

Conventional Commits em português: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`. Autor Arthur Lanznaster, sem `Co-Authored-By` e sem rodapé do Codex. Branch da fase a partir da `dev`, PR para a `dev`; nunca direto na `main`.


## Retomada no Codex

Ler explicitamente o AGENTS.md da pasta pai e ../docs/codex/retomada.md, inclusive quando este repositório for aberto sozinho. As decisões recentes e o fluxo da dev prevalecem sobre os planos antigos. Preservar o trabalho local existente.
