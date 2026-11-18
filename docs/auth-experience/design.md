# Acesso Pires — direção e contrato de implementação

Especificação de 17/11/2026. Modo **Operate**: entrar, criar conta e concluir os fluxos de código sem perder orientação. Extensão da identidade Balcão creme existente; não substitui DESIGN.md nem os tokens globais. Brief e composição já definidos pelo coordenador; a leitura direta de código e tokens substituiu entrevista adicional neste subagente.

## Direção consolidada

O formulário é uma superfície creme contínua, sem card externo. A fotografia existente `/background-image.png` ocupa metade da tela no desktop, com enquadramento do balcão e saco de papel; a legenda editorial é fixa, sem preços, ofertas inventadas, carrossel ou autoplay. Logo existente, Anton nas chamadas, Inter nos controles e uma anotação Caveat dão continuidade à Home, Cardápio, Promoções, Pedidos e Notificações. Nenhuma alteração nessas páginas, no header flutuante ou em seu megamenu.

Login: formulário à esquerda e foto à direita. Cadastro: foto à esquerda e formulário à direita. Recuperação, redefinição e confirmação: mesma posição do login. A inversão é a única grande assinatura de movimento. Sem entrada individual para cada campo, brilho, textura artificial, parallax ou transformação de hover na foto.

```text
Login / recuperação / redefinição / confirmação
|     marca + título     |                         |
|     formulário        |       foto do balcão    |
|     ação + alternativa |       legenda fixa     |

Cadastro
|                         |     marca + título     |
|       foto do balcão     |     formulário         |
|       legenda fixa      |     ação + alternativa |
```

## Valores e composição

Reutilizar os valores efetivos de `src/assets/styles/tokens.css`. O bloco legado escuro continua existindo: nesta superfície usar os tokens Balcão creme explicitamente, sem assumir que `--pp-font-display` é Anton (atualmente é Georgia).

| Papel | Token existente / valor verificado |
| --- | --- |
| Fundo principal | `--pp-creme`, #fbf6ee |
| Campo/superfície secundária | `--pp-creme-2`, #f4ebdc |
| Borda discreta | `--pp-creme-borda`, #dccbaf |
| Título, texto e CTA | `--pp-marrom`, #2a160b |
| Apoio | `--pp-texto-2`, #6b5641 |
| Link e foco sobre creme | `--pp-dourado-profundo`, #7f4f14 |
| Acento sobre marrom | `--pp-gold`, #e0a83e |
| Sucesso | `--pp-verde`, #4f7a55, e `--pp-verde-suave` |
| Tipos | `--pp-font-titulo`, `--pp-font-body`, `--pp-font-nota` |
| Ritmo | `--pp-space-1` a `--pp-space-6` |
| Curva | `--pp-ease`, cubic-bezier(.2,.7,.2,1) |

Desktop: divisão 50/50; foto com respiro externo de 16px e raio 20px, sem sombra. Formulário de login até 400px; cadastro até 500px. Padding horizontal por metade `clamp(32px,5vw,80px)`; conteúdo centralizado verticalmente quando cabe, alinhado ao topo quando excede a altura. Foto permanece em sua camada e pode acompanhar o viewport sem prender a rolagem do documento.

H1 Anton 400, `clamp(40px,4.3vw,64px)`, entrelinha 1.08, tracking -.025em, marrom, alinhado à esquerda. Apoio Inter 15–16px/1.55. Nota Caveat 26px/1.2, dourado profundo, no máximo uma frase curta. Rótulos Inter 13–14px/600; campos 16px para evitar zoom de foco no iOS. Campos e CTA com pelo menos 48px de altura e raio de token de 12px. Links, checkbox e revelar senha com alvo mínimo de 44×44px. Logo de cerca de 150px, sem distorção.

No cadastro, preservar os cinco campos atuais e sua ordem no DOM: nome, e-mail, telefone, senha, confirmação. Pode manter grade de duas colunas a partir de 1100px, com confirmação em largura total; em menor largura, coluna única. Aceite de termos, Google e volta ao login permanecem. Não inventar documentos de termos nem destinos ausentes.

## Conteúdo por tela

| Rota existente | Título sugerido | Ações e conteúdo preservados |
| --- | --- | --- |
| `login` | Bom te ver por aqui. | E-mail, senha, Entrar, recuperação, confirmação quando necessária, Google, Criar conta e mensagens de retorno |
| `cadastro` | Seu lugar na Pires. | Cinco campos, aceite, Criar conta, Google, Fazer login; sucesso leva à confirmação existente |
| `recuperar-senha` | Esqueceu a senha? | E-mail, Enviar código, explicação de resposta neutra, voltar ao login |
| `redefinir-senha` | Uma nova senha. | Código único de seis dígitos, nova senha, confirmação, Redefinir senha, reenvio e solicitação ausente |
| `confirmar-email` | Falta só confirmar. | Código e e-mail da pendência, Confirmar e-mail, reenvio, Usar outro e-mail; sem pendência, pedir e-mail e Enviar código |

A legenda fotográfica pode ser “Seu intervalo. Do seu jeito.” com anotação “Peça no app. Retire no balcão.”; descreve o fluxo existente sem promessa comercial. Evitar duplicar essa frase no formulário. Foto editorial decorativa (`alt=""`, `aria-hidden` no conjunto que repete a mensagem) não deve ser apresentada como prova documental do estabelecimento.

## Componentes e integração

1. **AuthLayout persistente** como componente pai das cinco rotas, com `RouterView` no painel de conteúdo. Preservar URLs, nomes, metas, guards e todos os parâmetros de retorno. A instância que contém foto e shell não deve remontar em login↔cadastro.
2. **Painel editorial** dentro do layout: uma imagem, uma legenda e um fallback marrom. Estado de lado deriva da rota. A mesma instância se desloca; não manter duas imagens ou dois formulários interativos.
3. **Cabeçalho de formulário**: logo, H1, apoio e nota opcional; slots ou componente simples conforme o código real. H1 recebe `tabindex=-1` para foco de navegação.
4. **BaseInput / BaseButton existentes**: herdar tema claro somente dentro do shell de autenticação; não trocar seus defaults globais. Preservar APIs, ícones Lucide, revelar senha, validação e loading. Evitar duplicar um kit de componentes para estas telas.
5. **Feedback existente**: alertas e mensagens inline ligados por `aria-describedby`; `role=alert` para falha da ação e `role=status` para confirmação. Usar o espaço necessário, sem posições absolutas sobre campos.
6. **GoogleAuthButton existente**: manter o botão oficial renderizado pelo serviço, listener, medição e tratamento de credencial/erro. Integrar visualmente pelo contêiner, sem substituir por botão falso. SDK ausente é estado recuperável do provedor; entrada por e-mail continua disponível.

Serviços, stores, autenticação entre abas, prazos e regras de validação não são decisões visuais e permanecem sob o contrato atual. Não guardar senha em componente persistente, localStorage ou query para criar continuidade visual. Rotas desmontadas eliminam seus estados sensíveis conforme o comportamento atual.

## Movimento com Motion existente

Usar `motion-v` instalado, com `useReducedMotion`; não instalar outra biblioteca. Não combinar View Transitions de catálogo com este fluxo.

- **Desktop >900px, login→cadastro:** foto com largura estável de 50%, `translateX` de 100% no login para 0% no cadastro, respondendo à largura atual. Viaja 400ms, curva `--pp-ease`, sem spring ou overshoot; inversa no retorno.
- O painel de conteúdo ocupa a metade oposta. Troca de formulário usa fade de 140ms na saída e 140ms na entrada, com deslocamento local de no máximo 12px. Não deslizar os campos por toda a largura; a foto carrega a continuidade. Helpers existentes coordenam a cobertura e impedem transições concorrentes.
- Entre as três rotas auxiliares e login: foto estacionária e transição local de 140ms. Sem viagem completa desnecessária.
- Primeiro carregamento direto de qualquer URL: render no estado final, sem foto atravessando a tela e sem tela inicialmente invisível.
- Nova navegação interrompe/substitui o destino anterior, inclusive Voltar/Avançar, sem fila de timers. Somente o conteúdo da rota atual é navegável; saídas visuais são `inert` e `aria-hidden`, ou desmontadas.
- Botões: resposta de cor de 150ms; pressionar pode reduzir a escala até .99 sem prejudicar foco. Sucesso não gera confete ou pulso decorativo. Loading começa junto da requisição, nunca depois da animação.
- **≤900px:** foto fora do DOM ou sem solicitação em nova carga; painel único. Fade 140ms e, no máximo, 6px de deslocamento local; nenhuma viagem horizontal.
- **Reduced motion:** layout final imediato, sem deslocamento, zoom ou espera. Feedback, foco, navegação e estado de carregamento continuam completos. Se mantiver fade, limitar a 80ms; zero animação é a escolha preferida.

O engenheiro pode ajustar o mecanismo de cobertura para evitar colisão entre foto e texto; o contrato visível é uma foto contínua que muda de lado, uma única rota ativa e nenhuma espera funcional.

## Estados

| Estado | Apresentação e comportamento |
| --- | --- |
| Inicial/vazio | Campos vazios com rótulos visíveis; placeholder é exemplo, não rótulo. Não exibir erro antes da tentativa/interação. Sem skeleton de formulário |
| Enviando | CTA mantém largura e texto específico (“Entrando…”, “Criando conta…”, “Enviando…”, “Confirmando…”, “Redefinindo…”); `aria-busy`, impedir envio duplicado; preservar valores e espaço de feedback |
| Inválido | Mensagem factual junto ao campo, `aria-invalid`; no envio focar primeiro inválido. Não depender só de borda vermelha |
| Erro do servidor/rede | Alerta antes do formulário, texto de recuperação e possibilidade de tentar de novo; preservar dados permitidos e não anunciar sucesso |
| Sucesso | Usar o retorno/redirect real, conservar mensagem na rota de destino e `role=status`; animação não retarda login ou expõe uma rota indevida |
| Sem solicitação de código | Redefinição mostra orientação e CTA para solicitar; confirmação permite informar e-mail. Não montar um campo de código sem requestId válido |
| Código expirado/incorreto | Erro próximo ao campo, reenvio disponível conforme prazo real; permitir colar seis dígitos em campo único |
| Reenvio aguardando | Botão informa “Reenviar em Ns”, disabled conforme lógica atual; não fazer live announcement a cada segundo |
| Google indisponível | Mensagem localizada do provedor, mantendo e-mail/senha utilizáveis; nenhuma credencial simulada |
| Foto ausente/falha | Superfície marrom e legenda creme legível; formulário mantém medidas e usabilidade |

Tokens legados `--pp-error` e `--pp-error-bg` nasceram para fundo escuro e não garantem AA no creme. No tema claro, erro precisa ter texto marrom escuro e ícone + mensagem, com vermelho apenas como acento; caso o engenheiro proponha cor semântica nova, centralizar em tokens, medir contraste e justificar. Não aplicar vermelho claro a texto pequeno no creme.

## Responsividade, foco e contraste

- 1440×900 e 1280×800: divisão editorial e formulário legíveis sem sobreposição. 1024px continua com divisão somente se cada formulário couber; ponto escolhido de 900px elimina a foto antes de comprometer campos.
- 390px e 320px: padding lateral 24px/20px, H1 38–42px (até 46 conforme quebra), logo 128–144px, formulário único. Teclado virtual não cobre ação definitivamente: rolagem normal até botão e footer, com safe-area inferior.
- Altura ≤700px: alinhar o formulário no topo, reduzir espaços grandes (48→24, 32→20), não campos nem fonte. Documento pode crescer; evitar `height:100vh`, `overflow:hidden` no body e scroll interno aninhado. Foto acompanha o viewport, sem impor altura ao formulário.
- Navegação por link de rota foca o H1 novo após montagem/nextTick, sem esperar o motion terminar; o H1 deve estar visível no instante do foco. Não focar automaticamente input ao abrir a página em celular. Primeiro inválido no submit; revelar senha conserva foco e cursor; retorno de histórico mantém coerência sem foco em elemento desmontado.
- Ordem natural: marca/voltar → título → campos → ações → alternativas. A inversão visual da foto não altera a sequência de Tab nem cria `tabindex` positivo. Enter submete, Space aciona checkbox e botões, links continuam links.
- Foco claro: outline 3px dourado profundo, offset 3–4px sobre creme; em CTA marrom, anel externo com respiro creme. Não reutilizar ouro claro como único indicador sobre creme.
- Contraste exigido: texto normal ≥4.5:1; texto grande e bordas/indicadores necessários ≥3:1. `--pp-creme-borda` sozinho não distingue campo interativo o suficiente: borda funcional pode usar `--pp-texto-3`; creme-borda apenas para separações decorativas. Legenda da foto tem gradiente marrom escuro concentrado na base; medir na região mais clara, e usar base sólida atrás da legenda caso não passe.
- Ampliação 200%, texto longo, autofill e tradução não podem cortar rótulo, erro ou ação. Não cortar overflow do formulário para esconder problema de largura.

## Critérios objetivos de aceite

- [ ] Cinco URLs, query de retorno, guards e caminhos de sucesso preservados; layout fotográfico permanece montado entre rotas de acesso.
- [ ] Login esquerda/foto direita e cadastro inverso confirmados em captura; troca e retorno mostram viagem horizontal contínua no desktop.
- [ ] Acesso direto a cadastro começa com foto à esquerda, sem animação de posição inicial errada.
- [ ] Sem carrossel, preço, contador comercial, watermark de ícone ou oferta fictícia no layout.
- [ ] Nenhuma chamada funcional depende de animationend; navegação rápida e histórico não deixam overlay, dupla tabulação ou conteúdo travado.
- [ ] 1440×900, 1280×800, 1024×600, 390×844, 390×600 e 320px sem overflow horizontal; CTA alcançável por rolagem; largura efetiva conferida no browser.
- [ ] Reduced motion remove viagem e entradas; 390px não mostra foto grande nem deslocamento horizontal.
- [ ] Tab/Shift+Tab/Enter, campo de código por colagem, senha visível, autofill e foco após erro/navegação funcionam.
- [ ] Loading, inválido, rede, sucesso, sem requestId, código expirado, reenvio e Google indisponível exibidos com fixtures sem dados reais.
- [ ] Contraste das combinações reais e foco AA medidos, inclusive erros e legenda fotográfica; sem depender apenas de cor.
- [ ] Build e testes existentes pertinentes aprovados; console sem erros novos; sessão entre abas e credenciais tardias preservadas.

## Protótipo e limites

`prototype.html` mostra login/cadastro e a troca de lado com HTML/CSS/JS locais. Abrir pelo servidor do repositório em `/docs/auth-experience/prototype.html` ou diretamente no arquivo. Não chama backend, Google, CDN ou qualquer rede externa. Imagens são referências relativas aos arquivos existentes em `public/`. O protótipo usa as famílias aprovadas quando instaladas localmente e os fallbacks do projeto quando ausentes: é referência de composição e movimento, não prova de fontes carregadas nem de autenticação. A implementação Vue continua usando o carregamento de fontes já existente. Um submit no protótipo informa explicitamente que nenhuma conta foi acessada/criada.

Foram estudados AuthLayout, as cinco views, GoogleAuthButton, tokens e padrões das cinco páginas do cliente. As referências externas foram consultadas pelo coordenador; só os padrões de composição, continuidade do painel e alternativas de acesso foram usados, sem código copiado. Este documento precede a implementação; validação funcional e visual do Vue pertence à etapa do engenheiro/coordenador.

Verificação do protótipo: inspecionado no Chrome em desktop 1440×900 (login e cadastro) e viewport efetivo 390×844 (cadastro). Imagens locais carregaram, não houve overflow horizontal e o título recebeu foco na troca. Em 390px com reduced motion, foto oculta e duração computada de transição 0s. O cadastro cresce verticalmente, com CTA e alternativas alcançáveis por rolagem. Hook visual apontou texto auxiliar de 11px: corrigido para 14px, sem supressão. Nenhum teste de autenticação ou prova de fontes em todas as máquinas é reivindicado por esse protótipo.
