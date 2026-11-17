# Meu perfil editorial — entrega local

Base: `origin/dev` `d3869b7dcd5f9edeb3679c4833ff254e94e8fc2d`. Branch: `feat/perfil-editorial`, em worktree isolada. Sem push, PR ou merge.

## Produto e contratos

Identidade com avatar e iniciais, abertura Anton, formulário editorial e coluna de segurança/conta. Creme, marrom e dourado usam os tokens existentes. A composição se adapta a 1440, 1280, 768, 390 e 320 px; header, navegação e chatbot existentes são preservados.

Nome, telefone, avatar e remoção passam pela store e serviço existentes. E-mail permanece somente leitura. Upload JPG/PNG/WebP até 3 MB, com prévia explicitamente provisória. Dados ausentes não geram informações fictícias. Nenhum endpoint, fluxo de autenticação, dependência ou backend foi acrescentado.

O rascunho não é descartado por refresh da mesma conta; cancelar usa a confirmação mais recente. Uma submissão por vez, controles bloqueados durante salvamento, recuperação de erros e descarte de resultados de outra sessão ou após desmontagem. Object URLs são revogadas. Sucesso exige resposta confirmada da sessão atual.

Labels associados, erros ligados aos campos, foco no primeiro erro, feedback em região viva, alvos de toque de pelo menos 44 px e respeito a movimento reduzido.

## Verificação

- `npm ci`: executado, 420 pacotes instalados. Nenhuma alteração no lockfile.
- `node --test`: 99 aprovados; 23 regressões específicas da tela. RED inicial comprovou 11 falhas; regressão adicional comprovou a perda de foco ao remover foto antes da correção. Os três estados de verificação também têm provas de renderização RED/GREEN.
- `npm run build`: aprovado, 132 entradas PWA.
- `git diff --check` e `git diff --cached --check`: aprovados.
- Chrome com API interceptada: 33 verificações principais e cinco adicionais aprovadas. Cobrem larguras reais, overflow, toque, labels, teclado, foco, edição, telefone, recarga, avatar, erros, rede abortada, GET/retry, dupla submissão, sessão A/B/A e movimento reduzido.
- Contraste de 30 textos renderizados: nenhuma falha AA; contornos dos campos mediram 5,39:1. A margem de rolagem local preserva o foco visível acima da navegação fixa. Console e execução sem erros na abertura normal; respostas 400/503, rede abortada e imagem 404 foram provocadas somente nos cenários correspondentes.
- `npm audit --omit=dev`: código 1, oito alertas altos preexistentes na cadeia `picomatch`/`vue-router`. Não foi aplicado `audit fix` nem a migração de versões principais sugerida pelo npm. Auditoria não aprovada; pendência separada deste redesign.

## Evidências e limites

Artefatos locais fora do Git, na pasta pai do workspace: `docs/prints/perfil-editorial-2026-11-17/`. Incluem capturas antes/depois em 1440/390/320, adicionais em 1280/768, estados de erro/loading/foco, resultados JSON, logs, auditoria e gravação real do Chrome em WebM/MP4.

As provas usam dados fictícios e interceptam a API. Não comprovam integração mutante com backend real, Google real, Cloudinary real, produção, dispositivos físicos, outros navegadores ou leitor de tela real. Os contratos foram conferidos no código local do backend, sem modificá-lo.

Explorer investigou contratos e proteções; designer definiu a composição; frontend engineer implementou e cobriu regressões; coordenador executou provas no navegador. Reviewer independente examinou o resultado completo e revalidou os contornos, a verificação junto à identidade e o foco sob a navegação fixa. Nenhum achado permaneceu aberto no escopo.

Para visualizar a implementação: executar `npm run dev` nesta worktree e acessar `http://localhost:5173/perfil` com uma sessão local de teste válida. As fixtures de validação permanecem fora do produto. A configuração local de ambiente foi corrigida na rodada abaixo.

## Refinamento premium e ambiente local — segunda rodada de 17/11/2026

Continuação do commit `3ea6bd2`, na mesma branch/worktree. A identidade agora ocupa uma faixa marrom com avatar, nome protagonista, verificação e ações de foto. Essa faixa integra uma ficha única com edição em superfície clara. Nome e telefone compartilham a primeira linha em desktop/tablet; e-mail ocupa a seguinte. Segurança e Sua conta foram reunidas em um painel lateral creme, com linhas compactas e divisores internos. O mobile mantém identidade em destaque e remove o espaçamento inferior duplicado. Na fixture de390px, a altura total passou de2226 para1620px (27% menor), sem remover dados ou campos.

Entrada curta dos dois blocos com motion-v, hover/press discretos e respeito a movimento reduzido. O `script setup` permanece idêntico ao commit anterior; o refinamento altera somente markup/CSS. Não há mudanças em autenticação, API, stores, serviços, layout global, dependências ou backend.

### Ambiente corrigido e prova real

O checkout original possuía `.env`; a worktree não possuía. A configuração original foi copiada localmente sem alterar a origem e permanece ignorada pelo Git. Nenhum valor, credencial ou arquivo de ambiente foi versionado. O processo antigo desta worktree foi encerrado e o servidor reiniciado por `npm run dev`, na porta5173 definida pelo Vite existente. Não foi criado proxy nem alterada configuração de CORS.

Sem interceptação, o Chrome confirmou que a URL usada pelo cliente corresponde ao ambiente configurado. O backend respondeu401 ao GET de perfil sem credenciais; o preflight retornou200 e aceitou a origem local. A rota protegida redirecionou para login. Não foram observados erros de CORS, configuração ou JavaScript nessa prova.

**Pendente:** login real e comparação do perfil exibido com o usuário autenticado; nenhuma sessão de teste autorizada estava disponível. Não foram feitas mutações em contas reais. As capturas e regressões abaixo usam fixtures e não substituem essa validação autenticada.

### Verificação do refinamento

- `node --test`:99/99 aprovados, reutilizando as23 regressões de perfil existentes.
- `npm run build`: aprovado,132 entradas PWA; `git diff --check` aprovado.
- Chrome:33/33 verificações principais e5/5 de estados, nas larguras1440/1280/768/390/320. Nova ordem de Tab conferida, ações sem obstrução, sem overflow; upload/remoção, erro/retry, rascunho, sessão A/B/A e persistência preservados.
- Contraste:29 textos e dois contornos sem falhas; contornos mediram5,79:1. O nome sobre o painel marrom tem cor creme explícita, evitando a herança global.
- Reviewer independente comparou capturas anteriores/novas e examinou todo o delta. Aprovou a mudança visual e confirmou o script inalterado; sem achados Bloqueadores ou Importantes.
- Dependências não alteradas. Os oito alertas de auditoria registrados na primeira rodada continuam como pendência separada; auditoria não foi repetida nesta rodada.

Evidências locais fora do Git: `docs/prints/perfil-premium-2026-11-17/` na pasta pai. Incluem comparação HTML, antes/depois nas cinco larguras, medidas, vídeo real do Chrome, logs, resultados de fixtures e `ambiente-real.json` com prova real separada e sanitizada. Leitor de tela, dispositivos físicos, outros navegadores e integrações autenticadas reais permanecem fora das provas.
