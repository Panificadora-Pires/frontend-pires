# Handoff — Auth Experience 2.0

Atualização de escopo: Arthur autorizou revisão, consolidação do histórico, push e PR para dev. [Critérios e pendências atuais](PUBLICATION.md). Merge não autorizado; a entrega somente local descrita abaixo corresponde à etapa anterior.

**Estado:** implementação, validação e revisão independente concluídas no worktree. Reviewer final e revisão do guard adicional terminaram sem achados bloqueadores ou importantes.

## Escopo e decisões

- Branch `feat/auth-editorial-motion`, baseada em `7411a525cce9c6e74cb494a5b14aabded1c50e09` (`dev`). Backend consultado e intacto; sem endpoints novos.
- Cinco rotas usam shell persistente. Store bloqueia duplicatas e protege respostas com geração/sessão; novo login de outra identidade pode substituir o anterior sem permitir que resposta antiga altere o estado atual.
- `sessionStorage` preserva apenas metadados temporários de etapa/cooldown na mesma aba. Se indisponível ou cheio, fallback em memória evita falhar a operação corrente, mas não conserva estado após refresh.
- Redirect interno seguro preserva query/hash; destinos externos, circulares e rotas de auth são recusados. `/` autenticada continua em `/` após refresh; raiz anônima conduz ao login sem mudar URLs públicas existentes.
- Motion: 400 ms na viagem da foto, 140/140 ms nos formulários, `translate` 0/100 e helpers de transição; respeita reduced motion e não bloqueia funções.
- Aceite/disclosure existem apenas na UI. Backend não registra consentimento. Definição e aprovação dos documentos e tratamento dependem das áreas jurídica/produto; isso não é orientação jurídica e precisa ser resolvido antes da produção.

## Validação e revisão

- `node --test`: 126 aprovados, 0 falhos ([log](evidence/node-final.log)); `npm run build` passou ([log](evidence/build-final.log)).
- 21 cenários sintéticos de navegador passaram ([resultados](evidence/browser-results.json)); 9 testes de isolamento entre abas passaram. O caso de clique repetido durante a transição está incluído.
- Reviewer independente e revisão final do guard sem achados bloqueadores/importantes. Corrigidos: fallback de storage cheio, guarda de geração do perfil e preservação da raiz autenticada.
- Google: botão renderizado e console sem erros em `localhost:5173`. `127.0.0.1` retornou `origin_not_allowed`; configuração OAuth não mudou. Automação usa `mockGIS`/credencial sintética. Popup e conta real não foram testados.
- `npm audit --omit=dev`: 8 vulnerabilidades altas em [audit-production.json](evidence/audit-production.json); `npm ci` reportou 16 no total. Manifesto/lockfile não mudaram e não houve `audit fix`.
- Capturas cobrem cinco telas em 320, 390, 768, 1280 e 1440 px, mais altura curta. [Vídeo final](evidence/auth-transition.mp4): 7,55 s, 1440 × 948 ([metadados](evidence/video-metadata.json)); frames inspecionados estão na pasta. Sem dados reais.

## Pendências e entrega

1. Triar vulnerabilidades altas de produção, sem atualização automática neste escopo.
2. Definir/aprovar documentos e implementar registro do aceite no backend antes da produção.
3. Popup Google real segue não testado.
4. O coordenador revisa o diff e faz o commit local autorizado. Push, PR e merge não estão autorizados neste handoff.

## Visualização

Preview ativo observado em `http://localhost:5173/login`. Nenhum deploy é afirmado. Para Google local, usar `localhost`, não `127.0.0.1`.
