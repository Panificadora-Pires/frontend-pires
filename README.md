# Pires Panificadora — Frontend

Frontend do sistema de pedidos da cantina, em Vue 3 + Vite, como PWA (instalável, funciona offline pro app shell). Sem Tailwind — CSS puro com design tokens em `src/assets/styles/tokens.css`.

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se o backend não estiver em localhost:8000
npm run dev
```

O backend (Django) precisa estar rodando separadamente — veja a documentação do backend pra subir ele.

## Build de produção

```bash
npm run build
npm run preview   # pra testar o build localmente
```

## Estrutura

```
src/
  assets/styles/theme.css     → design tokens (cores, tipografia, espaçamento, raio, sombra, duração)
  assets/styles/animations.css → keyframes e classes de animação compartilhadas
  assets/images/               → logo e fotos
  components/ui/               → design system (BaseButton, BaseInput, BaseCard, BaseDivider, BaseLogo, BaseIcon, BaseSpinner, BaseAlert)
  views/                       → uma tela por arquivo
  stores/                      → estado global (Pinia) — auth.js por enquanto
  services/api.js              → client axios com JWT (renovação automática de token)
  router/                      → rotas e guards de autenticação
```

## Contas de teste

Use as credenciais do `seed_dados` do backend:

| Papel | E-mail | Senha |
|---|---|---|
| Administração | admin@cantina.ifc.edu.br | senha123 |
| Aluno | joao@aluno.ifc.edu.br | senha123 |
