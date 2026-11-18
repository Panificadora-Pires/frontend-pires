# PR1 — Shell e Dashboard administrativo

Base: `origin/dev` `d91a454`, atualizada por fetch. Direção V2 aprovada em 18/11/2026; referência preservada na worktree de auditoria, commit `0402b42`, `docs/auditorias/admin-experience/preview-v2/`. Esta worktree não incorpora os protótipos nem as 69 capturas anteriores.

## Escopo e donos

- Shell: `AdminLayout.vue`, navegação administrativa reutilizável e `admin-tokens.css` escopado à `.admin-layout`. Preservar guards/rotas, logout, polling de pedidos/chat e acesso às telas existentes.
- Dashboard: `AdminDashboardView.vue`, `AdminPanel.vue`, `AdminMetric.vue`, store `adminDashboard.js` no padrão atual e utilitários de domínio necessários. Quatro indicadores; operação, ranking com imagens reais/fallback e receita; painel honesto sobre alertas indisponíveis e pedidos recentes.
- Serviço: o helper paginado deve falhar explicitamente se o teto terminar com `next`, sem declarar coleção parcial como completa. Sucesso continua retornando array; demais contratos preservados.
- Testes: serviço/estado/domínio por Node e browser com API sintética. Capturas somente de Dashboard desktop/mobile, menu e estados necessários. Sem pagamentos, pedidos, retirada ou backend reais.

## Contratos confirmados por leitura

- `GET /produtos/mais_vendidos/`: `{ criterio, resultado: [{ produto_id, produto_nome, produto_codigo, quantidade_vendida }] }`; não informa receita por produto. Ranking considera retirados por data de retirada.
- `GET /pedidos/relatorio_vendas/`: período obrigatório; `total_vendido`, `total_pedidos`, `ticket_medio`, apenas retirados. Não usar estimativa de preço atual multiplicado por quantidade vendida.
- Lista de produtos tem imagem, preço e identificação; detalhe acrescenta estoque/ativo. Estoque mínimo não aparece na leitura. Não haverá limiar fictício, alerta automático inventado ou N+1 para preencher essa lacuna.
- Pedidos fornecem estado, itens, valor, pagamento e data de atualização; série de receita derivada somente de retirados com cobertura completa. Fonte/período e falha de atualização devem ficar visíveis.

## Invariantes e aceite

- [ ] Provas RED antes dos ajustes: coleta truncada rejeitada; carga/erro/vazio distintos; logout e request antigo não reativam dados; refresh preserva último sucesso.
- [ ] Store de extras com geração/sessão, reset explícito e deduplicação por instância. `useAutoRefresh` continua dono do refresh de 60s; fila central permanece 15s.
- [ ] Shell 232px e gaveta nativa: foco, Escape, retorno, fechamento ao navegar/resize e limpeza ao desmontar. Indicador de seção permanece correto em detalhe/edição.
- [ ] Indicadores reais: pedidos do dia e fila da store existente; faturamento/retirados do agregado. Ranking usa `resultado` e imagens do catálogo; sem receita inventada por produto.
- [ ] Estoque: informar indisponibilidade de alertas automáticos e encaminhar a Produtos; não apresentar ausência de contrato como “estoque normal”.
- [ ] Visual V2 em 1440/390, estados sintéticos, console, teclado e movimento reduzido. Nenhum overflow global. Tabela recente vira registros mobile sem esconder dinheiro/pagamento/ação.
- [ ] Testes Node pertinentes, build e revisão independente. Commits locais; sem push/PR antes da revisão do Arthur.

Kanban e seleção de etapa no mobile pertencem ao PR2. Backend, aluno, autenticação e `main` fora do escopo. Não corrigir dívidas de outras telas por conveniência.
