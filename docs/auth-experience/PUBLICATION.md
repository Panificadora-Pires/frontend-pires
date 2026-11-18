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

## Pendências de produção

1. Não foram localizados documentos jurídicos publicados de Termos de Uso e Política de Privacidade. A UI apresenta o aviso; o backend não registra aceite. Definir documentos, destinos e tratamento antes de produção.
2. Provedor Google, entrega de e-mails e fluxos integrados com backend real continuam sem validação. Testes automatizados usam API/GIS sintéticos.
3. Auditoria atualizada `npm audit --omit=dev`: **8 vulnerabilidades altas**, nenhuma crítica, herdadas da árvore existente. Pacotes: `@vue-macros/common`, `fdir`, `picomatch`, `tinyglobby`, `unplugin`, `unplugin-utils`, `vite` e `vue-router`. Não houve alteração de dependências ou `audit fix`. As soluções automáticas sugeridas envolvem mudanças de versão fora deste escopo; a triagem permanece necessária.
4. Limite operacional preexistente: `src/services/api.js` usa backend de produção como fallback em builds PROD, incluindo Preview Vercel. Não assumir que preview é sandbox. Validar somente renderização/navegação sem escrita, bloquear APIs nos testes sintéticos e confirmar as variáveis de Preview antes de qualquer teste integrado. Nenhuma variável remota foi alterada.

Essas pendências ficam visíveis para decidir a publicação em produção. Abrir o PR para dev não equivale a liberar produção ou autorizar merge. CI atual valida build/PWA; os testes funcionais executados localmente são informados separadamente.
