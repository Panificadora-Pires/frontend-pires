# Auth Experience 2.0 — plano e critérios

17/11/2026. Escopo e execução autorizados pelo briefing do Arthur. Base `origin/dev` `7411a525cce9c6e74cb494a5b14aabded1c50e09`; worktree `frontend-auth-editorial-motion`, branch `feat/auth-editorial-motion`. Somente frontend; backend consultado, sem mudanças, e-mails ou contas reais. Sem push, PR ou merge.

## Sequência e responsáveis

1. Explorer: contratos e riscos reais; coordenador: Git/base, baseline e testes de regressão antes das correções.
2. Designer: especificação e protótipo em `design.md` e `prototype.html`, conforme composição do briefing. Referência visual estável: Balcão creme.
3. Engenheiro: layout persistente, cinco telas, Google persistente, motion/foco, CSS acessível, navegação e respostas locais. Coordenador: invariantes da store, redirecionamento seguro e regressões.
4. Coordenador: navegador real com API sintética; cinco larguras, pouca altura, movimento reduzido, histórico/refresh/deep links, teclado e fluxos positivos/negativos. Capturas antes/depois e vídeo da transição.
5. Reviewer independente: diff completo, segurança, UX, async, motion e regressões. Corrigir achados materiais e repetir provas afetadas.
6. Documenter: relatório e handoff com evidências e limitações reais. Coordenador: validação final, revisão do diff, commit convencional local e árvore limpa.

## Invariantes

- View → store → service → cliente HTTP existente. Sem novos endpoints/dependências ou mudança do contrato.
- Submissões repetidas são bloqueadas. Um login explícito com outra identidade pode substituir o anterior, preservando o contrato de sessão já testado. Geração e versão de sessão são conferidas antes de cada efeito pós-HTTP.
- Nunca guardar senha/código; somente identificador opaco, e-mail e timestamps temporários. `sessionStorage` sobrevive ao refresh da mesma aba, não é uma recuperação entre navegadores. Se bloqueado, fallback apenas na memória atual, sem prometer persistência.
- Layout permanece nas rotas de auth. Foto move entre lados; somente um formulário fica ativo, saída sem acesso por teclado. Google oficial não é recriado por uma transição cosmética.
- Operações em andamento protegidas de navegação acidental; retorno bem-sucedido pode navegar. Desmontagem forçada invalida respostas antigas.
- Redirecionamento somente interno, sem barras invertidas/controles/origens externas/ciclo de auth.
- Mensagens de recuperação/reenvio genéricas. Código válido/expirado decidido pelo servidor. Cooldown não simula duração de validade.
- Ausência de termos reais é pendência de produção explícita, sem textos ou links inventados. Aceite atual é somente UI; backend não registra consentimento.

## Auditoria anterior à implementação

| Severidade | Evidência na base | Correção/prova |
| --- | --- | --- |
| P2 | `auth.js` `_executar` permite duas chamadas simultâneas; login envia duas requisições | Bloqueio síncrono; teste demonstrou 2 antes e exige 1 |
| P2 | `register`, reenvio e recuperação persistem antes da checagem final de geração/sessão | Guardar antes dos efeitos; três testes reproduziram sobrescrita antiga |
| P2 | reset tardio limpa tokens/pendência antes da checagem final | Teste reproduziu dano à sessão nova; contexto antes da limpeza |
| P2 | confirmação tardia remove pendência nova | Conferir contexto e requestId capturado |
| P2 | `LoginView` aceita destino com barra invertida e não preserva destino por todo fluxo | Helper puro com casos maliciosos e navegação real |
| P3 | reenvio grava `emailSent: true`, embora backend retorne resposta genérica | Entrega desconhecida; texto neutro |
| P3 | falha de sessionStorage vira erro após conta já criada | Fallback volátil seguro; teste específico |
| P3 | textos jurídicos sem documento/rota em src/public; aceite não integra contrato backend | Disclosure explícito e pendência; sem inventar documento |
| P3 | carrossel 5s, sem pausa, indicadores pequenos e preços estáticos | Substituir por foto editorial estável sem promoção |
| P3 | frontend orienta só mínimo8; Django verifica similaridade, comuns e só números | Orientação coerente, servidor como autoridade |

Backend consultado: `core/serializers/user.py`, `core/views/verification.py`, `core/services/verification.py`, `app/settings.py` e rotas. Cadastro cria conta inativa, retorna `verification_id`, `email_sent`, `expires_in_seconds`; confirmação recebe `request_id`/`code`. Reset recebe também `new_password`. Solicitação/reenvio retorna 202 genérico e `retry_after_seconds`, sem garantia de entrega nem prazo de validade. Nenhuma mudança nesses contratos.

## Provas e estado de implementação

Baseline `node --test`: 99/99. Oito regressões de store falharam na base e passaram após correção. Testes de helper cobrem destino interno e 14 entradas externas/circulares/malformadas. Browser: login inválido/válido/Google, cadastro/erros/termos, confirmação inválida/expirada/reenvio/entrega inicial falha, reset genérico/código/senha/cleanup, 400/401/403/429/rede, duplicação/resposta tardia/sessão trocada, foco, rotas e movimento. Sem requisições reais de escrita.

Aceite executado: 126/126 testes Node, build e diff-check aprovados; 21/21 cenários de autenticação no navegador e 9/9 regressões de sessão entre abas. Capturas em 1440/1280/768/390/320 e pouca altura, sem overflow ou formulários ativos duplicados. Revisão independente final sem bloqueadores/importantes abertos; corrigidos fallback com storage cheio, perfil tardio e colisão do pai de autenticação com a raiz. O pai usa `/acesso`; as cinco URLs públicas permanecem iguais. Revisão adicional da guarda de cliques durante transição também sem achados materiais. Vídeo `evidence/auth-transition.mp4`, 7,55 s, reproduzido e inspecionado por quadros.

Os documentos distinguem prova sintética de backend real. Ausência dos documentos jurídicos, definição do registro de aceite e validação Google real impedem afirmar prontidão integral de produção. Auditoria de dependências reportou 8 altas herdadas na árvore de produção, sem alterar manifest/lockfile; triagem separada permanece pendente.

## Referências e reutilização

Consultadas diretamente em 17/11: [Profitize Sign In](https://profitize.com.br/build/componentes/sign-in-page), [ReUI Auth7](https://reui.io/blocks/application/auth/auth-7), [Skiper96](https://www.skiper-ui.com/v1/skiper96), [Aceternity](https://ui.aceternity.com/blocks/login-and-signup-sections/login-with-socials-and-email). Inspiração de composição/alternância somente; nenhum código, pacote ou asset dessas referências foi copiado. Não se presume licença pelo acesso gratuito.

Implementação própria com dependência instalada `motion-v` (licença do pacote MIT): [Vue](https://motion.dev/docs/vue), [AnimatePresence](https://motion.dev/docs/vue-animate-presence), [layout](https://motion.dev/docs/vue-layout-animations). `mode="wait"` foi avaliado; evitar saída ainda interativa e dupla montagem do Google tem prioridade. Não é obrigatório usar todos os recursos. [W3C 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) fundamenta autocomplete, gerenciadores e colagem, sem alegar certificação WCAG.
