# Correção do contraste do botão de senha

Correção pontual sobre `803966e`, branch `feat/auth-editorial-motion`. Direção visual aprovada preservada.

## Causa e alteração

O Vue adiciona um atributo scoped à regra de `BaseInput.vue`: `.pp-field__toggle[data-v-…]:hover:not(:disabled)`. Sua especificidade (0,4,0) empatava com `.auth-layout .auth-layout__panel .pp-field__toggle:hover`. O CSS do componente, carregado depois, vencia e aplicava `--pp-cream`, feito para a superfície escura. Reproduzido no Chrome: contraste de 1,12:1 em hover e active, nos dois ícones.

Somente `auth-forms.css` mudou no produto. Os estados hover, focus-visible e active usam `--pp-marrom` em seletores (0,5,0). Disabled usa `--pp-marrom-2` e cursor de indisponibilidade. Normal mantém `--pp-texto-2`; o anel de foco mantém o dourado profundo existente. Não foram alterados `BaseInput.vue`, tokens, markup, JavaScript funcional ou backend. Todos os seletores novos ficam dentro do shell de autenticação.

## Prova

Chrome real via Playwright, viewport 1440 e 390 px; neste último, emulação mobile/touch. Login: um campo; cadastro e redefinição: dois campos cada. Foram testados os dois ícones em normal, hover, foco por Tab, active com mouse pressionado, disabled pelo fieldset e disabled com a opacidade 0,62 do componente. Space e toque alternaram o tipo sem perder o valor. Rótulos, `aria-pressed`, anel de foco e bloqueio quando disabled foram conferidos.

| Estado | Menor contraste após correção |
| --- | --- |
| Normal | 6,44:1 |
| Hover / focus-visible / active | 16,02:1 |
| Disabled pelo fieldset | 10,07:1 |
| Disabled com opacidade | 3,55:1 |

O critério [WCAG 2.2 AA 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) exige 3:1 para informação visual necessária de controles ativos; controles inativos são isentos. A medição também manteve os inativos acima desse limiar. Não é declaração de conformidade integral da aplicação.

- Antes: **140 verificações, 40 falhas**, concentradas em hover/active.
- Depois: **140 verificações, zero falhas**. Inclui 20 verificações de outros hovers: ações principais, links, voltar, disclosure e reenvio; mínimo de 6,44:1 nos demais textos. Nenhuma outra correção necessária nessa revisão dirigida.
- Réplica do botão com os atributos scoped, fora de `.auth-layout`, manteve o hover legado, confirmando o isolamento do tema.
- `node --test`: **126/126**; `npm run build`: aprovado; `git diff --check`: aprovado.
- Capturas desktop/mobile antes e depois inspecionadas. PNGs e resultados JSON são saídas locais regeneráveis, ignoradas pelo Git; o teste e este resumo constituem a evidência versionada.

Execução: `node tests/auth-password-contrast.browser.mjs`, com Vite na 5173 e `PLAYWRIGHT_MODULE` apontando à instalação de QA quando necessário. `AUTH_CONTRAST_PHASE=before` apenas escolhe o nome das evidências, não altera CSS nem simula a regressão. O RED foi executado antes do patch.

Dados sintéticos; nenhuma autenticação, conta ou chamada de backend real. Mobile é emulação do Chrome; não foi utilizado dispositivo físico nem leitor de tela.

## Triagem e retenção

O commit `1f2a32a` incluiu quatro capturas e dois JSONs detalhados desnecessários à revisão do patch. Uma correção posterior os retirou da árvore versionada e preservou as cópias locais, sem reescrever o histórico. Não contêm dados pessoais: somente campos sintéticos e medições de estilo. O código de produção e o teste de regressão foram preservados.

Arthur confirmou a manutenção da borda dos alertas existente em `803966e`, incluindo `.auth-alert--info`. A exceção `side-tab=*` foi registrada pelo comando oficial `impeccable hooks ignore-value`, limitada a `auth-forms.css` na configuração compartilhada da pasta pai. Esse detector não oferece valor por seletor para `side-tab`; a documentação prescreve escopo por arquivo. A regra continua ativa nos demais arquivos. Nenhum estilo de alerta foi alterado.
