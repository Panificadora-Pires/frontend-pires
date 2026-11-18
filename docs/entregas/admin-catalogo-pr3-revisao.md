# Admin PR3 — Produtos e Editor: revisão visual

Base técnica: backend `dev` com PR #50 integrado. Frontend: PR #59 (Produtos) e PR #60 (Editor, empilhado em #59). Referências: visual aprovado do Dashboard/Kanban, `AGENTS.md` e `src/assets/styles/admin-tokens.css`.

## Correções motivadas pela gravação de 18/11/2026

- Removidos os rótulos técnicos em formato de breadcrumb (`CATÁLOGO / GESTÃO` e `CATÁLOGO / PRODUTOS`) das duas telas.
- Removido o texto `Dados do estoque no Django`, que não é informação útil para o operador.
- Botões de criar, editar, ativar/desativar e salvar/cancelar passam a usar `CardActionContent` com o CSS compartilhado `card-actions.css` da experiência do aluno: preenchimento circular `clip-path`, sem nova biblioteca ou hover clareador genérico.
- `AdminLayout` aplica transição curta entre *rotas administrativas distintas* (não dispara ao alterar somente filtros da rota). Respeita `prefers-reduced-motion`.
- A API de Produtos consulta 18 itens por página e indicadores globais, sem buscar um detalhe por produto. O Editor usa detalhe interno com permissão administrativa e valida imagens de até 5 MB.

## Checklist de aceitação antes do merge

- [ ] Produtos e Editar/Novo Produto em desktop (1440px) e mobile (390px), sem rolagem horizontal.
- [ ] Conferir a origem, tempo e contraste do hover em fundo escuro/claro, teclado e `prefers-reduced-motion`.
- [ ] Verificar transição Produtos -> Novo -> Produtos e Produtos -> Editar -> Produtos, inclusive ao alternar ID do produto.
- [ ] Filtros por categoria/estoque, busca, paginação e habilitar/desabilitar com banco de teste.
- [ ] Campos de custo/estoque mínimo recuperados na edição; foto existente, upload de imagem permitida e rejeição de arquivo inválido.
- [ ] Erro/offline e reintento sem perda de dados; sem vazamento de dados do Admin para o cliente.
- [ ] CI Node/build e Vercel verdes na mesma versão do PR.
- [ ] Não apontar a Vercel Preview para o backend de produção.

O PR #61 trata o botão de Atualizar e padronização dos hovers do Dashboard/Kanban separadamente. WebSocket/Django Channels continuam **pendentes**; atualização automática existente usa polling até a etapa de realtime.
