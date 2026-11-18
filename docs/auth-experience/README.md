# Auth Experience 2.0

Etapa atual: [revisão e publicação de PR para dev](PUBLICATION.md), autorizadas por Arthur. Merge continua proibido. As restrições de entrega somente local abaixo registram a etapa inicial.

Correção posterior de contraste: [botão de mostrar/ocultar senha](password-contrast/README.md), com causa, estados, testes e capturas antes/depois.

## Escopo

Redesign editorial das cinco rotas existentes: login, cadastro, recuperação, redefinição de senha e confirmação de e-mail. O shell persiste entre rotas e a fotografia alterna de lado entre login e cadastro no desktop. Serviços e contratos existentes foram mantidos; o backend não foi alterado.

## Auditoria e decisões

- **P2 — concorrência e respostas tardias:** bloqueio de submissões duplicadas e guardas de geração/sessão impedem efeitos de respostas antigas. Login iniciado por outra identidade pode substituir a operação anterior; a geração protege o estado mais recente.
- **P2 — navegação de retorno:** redirects externos, circulares e rotas de autenticação são recusados. Rotas internas preservam query/hash quando válidos; a raiz autenticada mantém `/` após refresh e a raiz anônima conduz ao login.
- **P3 — armazenamento temporário:** `sessionStorage` guarda apenas metadados temporários de etapa/cooldown na mesma aba, nunca senha ou código. Fallback em memória evita falhar após uma operação concluída, mas não sobrevive a refresh se o armazenamento estiver bloqueado.
- **P3 — respostas por e-mail:** solicitações e reenvios têm retorno genérico. A interface não afirma entrega garantida.
- **P3 — Google:** falha do SDK permite tentar novamente e mantém login por senha disponível. Renderização/console do SDK foi observada em `localhost`; cenários automatizados usam `mockGIS` e credencial sintética. O popup e autenticação com conta real não foram testados. Em `127.0.0.1`, o Google exibiu `origin_not_allowed`; a validação local deve usar `localhost:5173`. Nenhuma configuração OAuth foi alterada.
- **P3 — aceite jurídico:** checkbox e disclosure estão na interface, inclusive no fluxo Google, mas o backend não registra o aceite e os documentos reais não foram fornecidos. Definição e aprovação dos documentos e tratamento do aceite dependem de decisão jurídica/produto; este relatório não constitui orientação jurídica. Resolver a integração antes da produção.

## Referências e licença

Profitize Sign In, ReUI Auth7, Skiper96 e Aceternity serviram como referências de composição e alternância. Nenhum código ou asset foi copiado; acesso às páginas não implica licença. A implementação usa `motion-v`, já presente no projeto (MIT). Fontes técnicas constam em [plan.md](plan.md).

## Validação

- `node --test`: 126 aprovados, 0 falhos ([log](evidence/node-final.log)).
- `npm run build`: passou ([log](evidence/build-final.log)).
- 21 cenários de navegador com APIs sintéticas passaram ([resultados](evidence/browser-results.json)), incluindo o guard para clique repetido durante transição.
- 9 testes de isolamento entre abas passaram ([log](evidence/session-tabs-final.log)).
- Reviewer independente e revisão final do guard não encontraram bloqueadores ou achados importantes; três achados anteriores foram corrigidos: fallback de storage cheio, guarda de geração do perfil e colisão da raiz autenticada.
- Inspeção local do Google em `localhost:5173`: botão renderizado, console sem erros. `127.0.0.1` retornou `origin_not_allowed`. Popup e autenticação com conta real não foram testados.
- `npm audit --omit=dev` registrou 8 vulnerabilidades altas ([JSON](evidence/audit-production.json)); a instalação reportou 16 no total. `package.json` e lockfile não mudaram e nenhum `audit fix` foi executado.
- Há capturas anteriores das cinco telas em 1440/390 px; as atuais cobrem 320, 390, 768, 1280 e 1440 px, além de altura curta. O [vídeo final da transição](evidence/auth-transition.mp4) tem 7,55 s e 1440 × 948 ([metadados](evidence/video-metadata.json)); frames estão salvos na mesma pasta. Não foram usados dados reais.

## Arquivos e execução

- `AuthLayout.vue`, novo `AuthPage.vue` e `router/index.js`: shell persistente, navegação, foco e movimento.
- As cinco views em `src/views/auth/`: formulários, validações, mensagens, códigos e aceite.
- `GoogleAuthButton.vue`, `google-identity.js`, `BaseInput.vue`: ciclo Google, retry e descrição acessível dos campos.
- `auth-forms.css` e tokens de auth: tema claro e estados com contraste.
- `stores/auth.js` e novo `utils/auth-navigation.js`: operações, respostas antigas, pendências e destino seguro.
- Quatro arquivos novos `tests/auth-*`/`google-identity.test.mjs`: regressões Node e suíte de navegador; documentação e evidências nesta pasta.

Na worktree: `node --test`, `npm run build` e `git diff --check`. As suítes de navegador são `node tests/auth-experience.browser.mjs` e `node tests/session-tabs.browser.mjs`; precisam de Vite na 5173 e Playwright de QA, resolvido por `PLAYWRIGHT_MODULE` quando não estiver instalado localmente. Nenhuma dependência de produção foi adicionada.

## Limitações e entrega

O aceite existe só na interface; o backend não registra consentimento. Documentos e tratamento precisam de definição/aprovação jurídica e de produto antes da produção. A automação Google é sintética. Vulnerabilidades altas precisam de triagem sem atualização automática neste escopo.

Branch `feat/auth-editorial-motion`, baseada em `7411a525cce9c6e74cb494a5b14aabded1c50e09` (`dev`). Preview ativo observado em `http://localhost:5173/login`. Nenhum deploy é afirmado. O coordenador fará revisão final e commit local; sem push, PR ou merge autorizados aqui.

Consulte [HANDOFF.md](HANDOFF.md), [design.md](design.md), [plan.md](plan.md) e [implementation-tests.md](implementation-tests.md).
