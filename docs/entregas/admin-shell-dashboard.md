# Admin PR1 — Shell e Dashboard V2

Implementação local em `feat/admin-shell-dashboard`, base `origin/dev` `d91a454`. A V2 aprovada foi encerrada separadamente na branch de auditoria, commit `0402b42`, sem modificar seu `src/`. Nenhuma V3 ou tela de kanban funcional foi criada.

## Resultado

Shell com sidebar chocolate de 232px, navegação compartilhada e contextual, tema creme e gaveta nativa. Rotas/guards, badge da fila, logout e polling existentes preservados. Tokens em `src/assets/styles/admin-tokens.css` são aliases da identidade existente, limitados a `.admin-layout`; estilos e componentes do aluno/autenticação não foram editados.

Dashboard conforme V2: quatro indicadores, operação, ranking com imagens reais do catálogo/fallback, receita de sete dias e pedidos recentes responsivos. Os componentes `AdminPanel`, `AdminMetric`, `AdminRevenueChart` isolam apresentação. A store `adminDashboard` usa geração/sessão e deduplicação por instância; `useAutoRefresh` permanece responsável pelos extras a cada 60s, com fila central existente de 15s no layout.

## Fontes de dados e diferenças necessárias em relação ao desenho

| Informação | Fonte existente | Tratamento |
|---|---|---|
| Pedidos do dia e operação | `adminOrders`, `GET /pedidos/` | Data de criação em São Paulo para o dia; fila inclui pedidos ainda ativos de outros dias |
| Faturamento/retirados do dia | `GET /pedidos/relatorio_vendas/` | Agregado oficial, somente retirados; nenhum valor estimado por preço atual |
| Mais vendidos | `GET /produtos/mais_vendidos/`, campo `resultado` | Quantidades de retirados; imagem associada pelo catálogo; sem receita por produto porque o contrato não a informa |
| Receita de sete dias | Coleção completa de pedidos, estado retirado e `status_atualizado_em` | Datas de São Paulo, soma em centavos; cancelados excluídos; valores por dia também em texto acessível |
| Catálogo/promoções | Listagens existentes | Contagens reais; sem GET individual de cada produto para montar o Dashboard |
| Alertas de estoque | Contrato de leitura insuficiente | Informação de indisponibilidade e link para Produtos. Não se inventam estoque mínimo, alertas ou endpoints |

O helper de paginação passa a rejeitar uma coleção quando a página 30 ainda tem `next`, ou uma página vazia declara continuação. Código `ADMIN_COLLECTION_INCOMPLETE`; sucesso mantém o contrato de array. A interface preserva último sucesso e informa falha de atualização; na primeira falha usa valores desconhecidos, nunca zero fictício. A alteração também impede silêncio sobre truncamento nos outros consumidores administrativos do mesmo serviço, sem redesenhar suas telas.

## Provas executadas

- `node --test tests/*.test.mjs`: **140/140 aprovados**, incluindo 14 novos testes de serviço/domínio/store. A suíte existente de 126 testes permaneceu verde.
- `npm run build`: **aprovado**, Vite/PWA, 131 entradas de precache.
- `tests/admin-pr1.browser.mjs`: **13/13 cenários integrados aprovados** em [browser-results.json](../prints/admin-pr1/browser-results.json). Mais **1/1 cenário focado** em [browser-focused.json](../prints/admin-pr1/browser-focused.json) para fechamento ao navegar/resize e limpeza de scroll lock.
- Dados de API sintéticos atravessam a aplicação Vue, stores, serviços e interceptor reais. Nenhum pedido, pagamento ou retirada foi enviado. Único POST do ensaio é `/token/logout/`, interceptado e recusado pela fixture.
- Sem erros JavaScript de página. Console registra apenas HTTPs intencionais: dez respostas 500 dos cenários de falha e um 403 do logout sintético; não se alega console inteiramente limpo em cenários negativos.
- Desktop 1440 e mobile 390 com fotos carregadas. Reflow e movimento reduzido conferidos em 1280/768/320; menu também testado em desktop de 600px de altura. Foco, Escape/retorno, links e contexto de detalhe, guards de aluno/anônimo, logout, cache após erro, paginação incompleta e polling exercitados.
- `git diff --check` aprovado. `src/views/student`, `src/views/auth`, router, cliente HTTP, tokens compartilhados, dependências e tela de Pedidos não foram alterados.

TDD registrado: o serviço inicialmente falhou em dois casos de cobertura; após o ajuste, 4/4 passaram. Shell antigo mediu 248px no teste que exige 232px. Utilitários/store começaram com módulos ausentes e chegaram a 10/10. A revisão encontrou `aria-busy` permanente após erro inicial: a prova [RED](../prints/admin-pr1/red-initial-aria-busy.json) registrou quatro indicadores ocupados; a rodada final aprovou zero, mantendo valores desconhecidos. Falha anterior do ensaio de guard foi o glob da URL de login, que já havia navegado corretamente; corrigida a asserção por pathname/query, sem alterar o produto.

Revisor independente leu o resultado inteiro, contratos responsáveis, testes e capturas, comparou com a V2 e revalidou `aria-busy`. Sem Bloqueadores/Importantes ou melhorias abertas. Não repetiu build/Node/browser; examinou as provas do coordenador e executou `git diff --check`.

## Evidências principais

- [Dashboard 1440](../prints/admin-pr1/dashboard-1440.png).
- [Dashboard 390](../prints/admin-pr1/dashboard-390.png).
- [Menu 390](../prints/admin-pr1/menu-390.png).
- [Primeira carga](../prints/admin-pr1/loading-390.png), [vazio real](../prints/admin-pr1/empty-390.png) e [erro inicial](../prints/admin-pr1/error-390.png).

As seis imagens usam somente dados fictícios. Não são screenshots de produção nem cópia das fotos sintéticas para o runtime: a fixture fornece URLs de imagens existentes apenas durante o teste.

## Reprodução segura

```powershell
# Terminal 1, raiz desta worktree — sem copiar .env de produção
$env:VITE_API_URL='http://127.0.0.1:59999/api'
npm run dev -- --host 127.0.0.1 --port 5189 --strictPort

# Terminal 2, mesma raiz
$env:PLAYWRIGHT_MODULE='C:/Users/arthu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node --test tests/*.test.mjs
node tests/admin-pr1.browser.mjs
npm run build
```

`PLAYWRIGHT_MODULE` usa o QA externo já instalado, sem dependência nova. `ADMIN_CHECK='Gaveta fecha'` seleciona a prova focada e grava `browser-focused.json`; o relatório integrado não é sobrescrito. A URL `/admin` fora do harness exige sessão/API configuradas; o teste não instala uma sessão utilizável para navegação manual. Para revisão imediata, abrir as imagens acima.

## Limites e próximo passo

Não foram executadas autenticação real, Google, backend integrado, dispositivo físico, leitor de tela ou operações financeiras. A implementação usa contratos existentes verificados no código; os testes HTTP são sintéticos. O limite defensivo de coleta continua em 30 páginas: acima dele a coleção é explicitamente indisponível, em vez de ser apresentada como completa. Paginação remota/escala pertence à etapa pertinente, sem ocultar essa limitação.

Estoque mínimo não está exposto para leitura: alertas automáticos dependem de contrato futuro autorizado. Essa lacuna não bloqueia shell/Dashboard com mensagem honesta, mas impede entregar a lista fictícia de alertas da prévia como funcional.

PR2 permanece pendente: kanban e seleção de etapa no mobile para evitar lista longa. Backend, `main` e aluno fora do escopo. Commits locais somente; Arthur revisa resultados antes de qualquer push/PR. Nenhum merge autorizado.
