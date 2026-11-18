# Revisão para publicação em dev

Arthur autorizou revisão final, organização do histórico, push da branch `feat/auth-editorial-motion` e PR para `dev`. **Merge não autorizado.** Esta etapa substitui a restrição de entrega somente local dos relatórios anteriores.

## Revisão independente atual

Diff completo contra `origin/dev` `7411a525cce9c6e74cb494a5b14aabded1c50e09` confrontado com código atual, consumidores da store e contratos locais do backend. Nenhum Bloqueador ou Importante confirmado. A revisão executou 51 testes Node focados, todos aprovados, e diff-check. Navegador, build e auditoria de dependências são verificações separadas do coordenador.

## Histórico e conteúdo enviado

- Branch confirmada ausente no remoto e árvore limpa antes da organização. Base remota permaneceu em `7411a525` na consulta inicial.
- Backup local: `backup/auth-editorial-motion-pre-publicacao-f1a7a0d`, apontando ao resultado anterior. Não publicar essa referência.
- Consolidar o resultado final em um commit sobre a dev atual, preservando a árvore de código. Conferir todos os caminhos e objetos novos antes do push; os quatro PNGs e dois JSONs de `password-contrast` não podem aparecer nem como blobs de commits intermediários enviados.
- Referências aos commits `803966e`, `1f2a32a` e `f1a7a0d` nos documentos anteriores descrevem a preparação local. O histórico consolidado enviado substitui esses commits; o backup local preserva a rastreabilidade.
- Evidências regeneráveis de contraste permanecem locais e ignoradas. Teste, resumo de contraste, capturas aprovadas do redesign e vídeo curto permanecem versionados. Não incluir `.env`, credenciais ou dados pessoais reais de contas.

## Verificação final

Executar após a consolidação: `node --test`, `npm run build`, `git diff --check`, além de `auth-experience.browser.mjs`, `session-tabs.browser.mjs` e `auth-password-contrast.browser.mjs`. Usar dados sintéticos e interceptação de APIs. A descrição do PR registra os resultados desta execução, sem reaproveitar contagens antigas como prova nova.

A reexecução encontrou uma asserção instável no teste, sem falha de produto: Chromium em contexto touch não garante `:hover` na réplica externa acionada por mouse. A verificação de isolamento dessa réplica agora exige hover efetivo no desktop. Os cinco campos, dois ícones, 140 medições, teclado e toque mobile continuam testados; nenhum estilo ou código funcional foi alterado por esse ajuste.

Fechamento em 18/11/2026: `node --test` passou 126 testes; build/PWA, 21 cenários de autenticação, nove cenários entre abas, 140 medições de contraste e diff-check passaram. A primeira execução entre abas atingiu timeout de `networkidle` durante as suítes concorrentes; a reexecução isolada passou integralmente, sem alterar o teste ou o produto. O Vite precisou ser reiniciado após a interrupção do ambiente. Capturas regeneradas foram comparadas visualmente e restauradas às versões aprovadas, sem mudança intencional.

Os 79 caminhos consolidados foram conferidos: 15 arquivos de código, cinco testes e 59 documentos/evidências do escopo de autenticação. A varredura dos textos não encontrou credenciais ou dados pessoais reais de contas; e-mails são placeholders ou fixtures. `.env` permanece ignorado; os seis artefatos dispensados de contraste não constam dos objetos alcançáveis pelos commits enviados. A base remota `dev` foi reconfirmada em `7411a525`; dependências e lockfile permanecem intactos.

## Segunda revisão — histórico e resposta tardia (18/11/2026)

Investigado o [comentário da linha 84](https://github.com/Panificadora-Pires/frontend-pires/pull/53#discussion_r4614687433). O guard de `AuthPage.vue` normalmente recusa Voltar/Avançar durante HTTP pendente. A URL provisória do navegador não prova que o Vue Router concluiu a navegação; a prova verifica o resultado do guard ou aguarda o formulário de destino.

Corrida confirmada em uma janela específica: durante a saída animada de cadastro para login, o formulário já perdeu o guard, mas o botão Google persiste. Um callback GIS nesse intervalo inicia HTTP; Voltar/Avançar consegue trocar de tela antes da resposta. Na base, a resposta retida gravou tokens e usuário após a troca. Os dois testes de regressão falharam antes do patch por access token indevido.

O watcher do layout agora acompanha `route.fullPath` e chama `auth.invalidarOperacao()` sincronicamente quando a navegação se conclui. A geração da store invalida os efeitos antes de `persistTokens` e da atualização de usuário; não é necessário alterar a store. Navegações recusadas não invalidam a operação legítima. Cadastro/recuperação concluídos mantêm seus metadados e navegação normal; a proteção por versão de sessão permanece intacta.

Prova final: 126 testes Node, 27 cenários de autenticação no Chrome, nove cenários entre abas, build/PWA e diff-check aprovados. Os seis novos cenários cobrem senha/Google com Voltar/Avançar recusados, Google com navegação efetiva durante a transição, ausência de ambos os tokens/usuário/GET de perfil tardio e nova tentativa válida após descarte. API e GIS são sintéticos. Nenhuma alteração visual, dependência ou backend; as pendências de produção abaixo permanecem abertas.

## Pendências de produção

1. Não foram localizados documentos jurídicos publicados de Termos de Uso e Política de Privacidade. A UI apresenta o aviso; o backend não registra aceite. Definir documentos, destinos e tratamento antes de produção.
2. Provedor Google, entrega de e-mails e fluxos integrados com backend real continuam sem validação. Testes automatizados usam API/GIS sintéticos.
3. Auditoria atualizada `npm audit --omit=dev`: **8 vulnerabilidades altas**, nenhuma crítica, herdadas da árvore existente. Pacotes: `@vue-macros/common`, `fdir`, `picomatch`, `tinyglobby`, `unplugin`, `unplugin-utils`, `vite` e `vue-router`. Não houve alteração de dependências ou `audit fix`. As soluções automáticas sugeridas envolvem mudanças de versão fora deste escopo; a triagem permanece necessária.
4. Limite operacional preexistente: `src/services/api.js` usa backend de produção como fallback em builds PROD, incluindo Preview Vercel. Não assumir que preview é sandbox. Validar somente renderização/navegação sem escrita, bloquear APIs nos testes sintéticos e confirmar as variáveis de Preview antes de qualquer teste integrado. Nenhuma variável remota foi alterada.

Essas pendências ficam visíveis para decidir a publicação em produção. Abrir o PR para dev não equivale a liberar produção ou autorizar merge. CI atual valida build/PWA; os testes funcionais executados localmente são informados separadamente.
