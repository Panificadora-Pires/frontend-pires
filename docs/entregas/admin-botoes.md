# Botões do Admin — 18/11/2026

Correção focada sobre os heads dos PRs #59 (`ca494f4`), #60 (`ff6a5da`) e #61 (`844430c`), consultados no GitHub após fetch. A prévia antiga do Editor não continha o #61. Além disso, regras scoped `:deep(.pp-card-action__fill)` impunham dourado a todas as ações.

- `admin-tokens.css` centraliza primary (dourado), secondary (creme), danger (vermelho existente) e cancel (vermelho suave). `CardActionContent` e `card-actions.css` permanecem intactos, incluindo círculo, cópia visual, foco, active, disabled e reduced motion.
- Catálogo: criar, editar e ativar/desativar. Editor: salvar/cadastrar e cancelar por navegação.
- Operação: Dashboard, Kanban, Detalhes, Categorias, Promoções, Usuários e Relatórios usam a base nas ações pertinentes. Links discretos, filtros, modos, fechar e paginação mantêm o tratamento neutro existente. Nenhuma mudança funcional de pedidos, QR, upload ou estoque.
- Origem compartilhada: commit `0085c64`, incorporado por merge às branches #59/#61; #60 incorpora #59. Sem cherry-pick duplicado, rebase ou merge na dev.
- Integração somente local: branch `preview/admin-action-variants`, worktree `.worktrees/admin-actions-preview`. Não publicar essa branch nem apontar para produção.

## Provas

- Teste browser `tests/admin-actions.browser.mjs`: RED com dourado na ação destrutiva; GREEN com variantes, expansão intermediária/final, geometria 1440/390, disabled, Tab, reduced motion e isolamento do aluno.
- Testes Node administrativos: #59 29/29, #60 33/33, #61 26/26. Build/PWA e diff-check em cada entrega e na combinação local.
- QA integrado sintético em Chromium: 23 grupos de verificações, cinco telas em 1440/390, cópias alinhadas, cores, ausência de overflow, salvamento desabilitado e animação de coluna só após resposta. Nenhuma chamada de rede à API, nenhum erro JavaScript. Capturas e script locais na pasta pai `docs/prints/admin-buttons-2026-11-18/`.
- Revisão independente estática sem bloqueadores/importantes; contraste mínimo calculado 6,25:1. Não comprova dispositivo físico, leitor de tela ou operações com Django real.

Prévia local com Axios inteiramente sintético: iniciar Vite na worktree de integração, porta 5194, e abrir `http://127.0.0.1:5194/admin-buttons-preview.html?view=/admin/produtos`. Entrada HTML é local/ignorada; para recarregar a fixture, reabrir esse endereço completo. Dashboard e Pedidos ficam acessíveis pelo menu. Aprovação visual e merges continuam com Arthur.
