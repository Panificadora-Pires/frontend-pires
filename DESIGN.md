---
name: Pires Panificadora
description: Identidade Balcão creme da área do cliente e cabeçalhos canônicos da Home.
colors:
  marrom: "#2a160b"
  marrom-secundario: "#5a3418"
  creme: "#fbf6ee"
  creme-camada: "#f4ebdc"
  creme-borda: "#eadfcd"
  superficie: "#ffffff"
  texto-secundario: "#6b5641"
  dourado-escuro: "#a0661d"
  dourado: "#e0a83e"
  palco-promocao: "#110c09"
typography:
  section-title:
    fontFamily: "Anton, Impact, Arial Narrow, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 48px)"
    fontWeight: 400
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  section-intro:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    lineHeight: 1.5
  section-intro-mobile:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  section-note:
    fontFamily: "Caveat, Comic Sans MS, cursive"
    fontSize: "26px"
    fontWeight: 700
  section-note-mobile:
    fontFamily: "Caveat, Comic Sans MS, cursive"
    fontSize: "21px"
    fontWeight: 700
  section-action:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  product-title-home:
    fontFamily: "Anton, Impact, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0em"
  category-title:
    fontFamily: "Anton, Impact, Arial Narrow, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
  category-title-mobile:
    fontFamily: "Anton, Impact, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.2
  category-description-mobile:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  category-action-mobile:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 700
  step-number:
    fontFamily: "Anton, Impact, Arial Narrow, sans-serif"
    fontSize: "46px"
    lineHeight: 1
  step-title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 700
  greeting:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "28px"
    fontWeight: 700
  greeting-mobile:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "23px"
    fontWeight: 700
  status-title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 700
rounded:
  card-lg: "20px"
  btn: "12px"
  full: "999px"
spacing:
  space-1: "8px"
  space-2: "12px"
  space-3: "16px"
  space-4: "24px"
  space-5: "32px"
  space-6: "48px"
components:
  home-section-title:
    textColor: "{colors.marrom}"
    typography: "{typography.section-title}"
  home-section-action:
    textColor: "{colors.dourado-escuro}"
    typography: "{typography.section-action}"
    padding: "0"
    height: "44px"
  card-action:
    backgroundColor: "{colors.marrom}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.full}"
    size: "42px"
  card-action-hover:
    backgroundColor: "{colors.dourado}"
    textColor: "{colors.marrom}"
    rounded: "{rounded.full}"
    size: "42px"
---

# Design System: Pires Panificadora

## Overview

**Creative North Star: "Balcão creme"**

Identidade acolhedora de padaria, com superfícies creme, marrom nas chamadas e dourado nas ações. Anton dá presença às chamadas; Inter mantém a leitura e os controles claros; Caveat identifica anotações breves. Essa direção já foi aprovada no projeto e é preservada nesta documentação.

**Key Characteristics:**
- Chamadas condensadas em marrom sobre creme.
- Anotações cursivas pontuais e ações secundárias discretas.
- Conteúdo e produto reais do catálogo como centro da escolha.
- Mesma anatomia para cabeçalhos de seções com a mesma função.

Escopo documentado: área do cliente, com contrato exato para os cabeçalhos da Home. O restante registra padrões existentes, sem afirmar que admin, autenticação ou todas as telas já foram padronizados. Contexto de produto em [PRODUCT.md](../PRODUCT.md); decisões recentes em [retomada](../docs/codex/retomada.md).

## Colors

Paleta quente existente de `src/assets/styles/tokens.css`; os valores do frontmatter espelham os tokens CSS, que continuam sendo a fonte usada pela aplicação.

### Primary
- **Marrom da Pires:** títulos de seção, nomes e ações de compra.
- **Dourado escuro:** links secundários, anotações e foco dos cabeçalhos.
- **Dourado:** preenchimento circular e botão sobre o comercial.

### Neutral
- **Creme:** fundo da área do cliente.
- **Creme em camada:** fundos secundários e mídia de fallback.
- **Creme de borda:** separações e contornos suaves.
- **Superfície branca:** cards de produto e categoria.
- **Texto secundário em marrom:** descrições e apoio.

Não criar novos valores de cor nos componentes para repetir esses papéis. O header flutuante tem tokens neutros próprios `--pp-header-*`; esta entrega não o redesenha.

## Typography

Anton é a chamada; Inter é o apoio e a ação; Caveat é a anotação. Usar apenas os pesos disponíveis, evitando simular negrito em Anton. As fontes já são carregadas com `display=swap` em tokens.css; esta entrega não adiciona famílias ou downloads.

### Hierarchy
- **Título de seção:** papel `section-title`, `--pp-home-section-title-*`. Margem inferior ligada a `space-1`; quebra balanceada e possibilidade de quebrar palavras quando a ampliação exigir.
- **Descrição do cabeçalho:** `section-intro`, variante mobile até 760px. Não transformar o apoio Inter da seção de categorias em nota cursiva.
- **Nota:** `section-note`, variante mobile até 760px. Preservar as frases existentes e sua relação com o conteúdo.
- **Ação secundária:** `section-action`, mesma tipografia e ícone em todos os cabeçalhos.
- **Produto da Home:** papel próprio `product-title-home`; não aplicar o tamanho dos títulos de seção aos nomes dos cards.
- **Papéis locais preservados:** títulos/descrições/ações de categoria, numeração e títulos dos passos, saudação e mensagens de estado constam no frontmatter como observados. São funções diferentes dos cabeçalhos de seção e não foram redimensionados nesta entrega.

As demais medidas locais do banner, cards e navegação continuam próprias de seus papéis. Não substituir todos os h2 da aplicação por um único estilo global.

## Layout

Conteúdo da Home com largura máxima de 1240px e margens laterais fornecidas por StudentLayout. Categorias usam quatro colunas no desktop e duas até 980px; produtos usam quatro, três até 1100px e duas até 760px.

**Contrato dos cabeçalhos da Home:** `HomeSectionHeader.vue` deriva do bloco “Seu intervalo, do seu jeito.” / “Ver cardápio”. Os quatro títulos usam esse componente: categorias, destaques, como funciona e promoções. IDs e `aria-labelledby` continuam vinculando cada seção ao seu título.

- Topo das seções: `--pp-home-section-space`, ligado a `space-6`, com `space-5` até 760px. Padding superior zero.
- Cabeçalho até conteúdo: `--pp-home-section-header-after`, ligado a `space-4`, com `space-3` até 760px.
- Cabeçalho horizontal: `--pp-home-section-header-gap`, ligado a `space-4`; título e nota podem quebrar, ação na borda direita.
- Até 760px: cabeçalho em coluna, gap de 4px, ação abaixo e alinhada à direita. A ampliação e os fallbacks de fonte devem continuar cabendo.
- Descrições/notas são opcionais; não inventar apoio para igualar artificialmente a altura dos cabeçalhos. Uniformizar as distâncias e os papéis visuais, preservando o conteúdo.

## Elevation & Depth

Cards usam contorno creme e resposta suave de borda/sombra no hover e no foco. O token de sombra da área cliente é `--pp-sombra-card`; o header usa `--pp-header-shadow`. Esses padrões existentes não autorizam adicionar novas caixas aos títulos de seção.

Sombras, transições e breakpoints que não cabem no frontmatter estão em `.impeccable/design.json`.

## Shapes

Cards seguem `card-lg`; controles pequenos usam círculos ou `full`. Links secundários de cabeçalho são texto com seta, sem fundo, borda ou cápsula. Não aplicar a anatomia de compra a uma ação de navegação secundária.

## Components

### Cabeçalho de seção da Home

Componente sem estado: recebe título/id e, quando existem, descrição, nota e destino/rótulo da ação. O conteúdo e as rotas pertencem aos componentes consumidores. Preservar as notas “escolha e adicione” e “três passos, sem fila”; a anotação de categorias continua após os cards.

### Ação secundária

Link com ArrowUpRight Lucide de 18px, gap `space-1`, altura mínima de 44px e alinhamento à direita. Hover sublinha com offset de 4px; foco visível também sublinha e usa outline dourado escuro de 3px/offset4. Sem deslocamento ou animação nova. Nome acessível vem do texto; ícone é decorativo.

### Compra nos cards e banner

Preservar `CardActionContent` e `pp-card-action`: círculo nasce do centro inferior e revela a cópia visual junto com a cor de fundo, mantendo o nome acessível único. Expansão/retração de 450ms; disabled/loading interrompem o preenchimento; movimento reduzido suprime a transição. O comercial usa as cores invertidas já implementadas.

### Cards

Fotos cadastradas têm prioridade e fallback preservado. Fotos de categorias são mostradas inteiras; hover/foco ampliam somente a mídia. Não substituir imagens, ilustrações ou fluxos nesta padronização.

### Busca e navegação

Header mantém busca com rótulo acessível, foco próprio e navegação por rotas. Os estilos neutros desse contexto são uma exceção existente e não uma nova direção para os cabeçalhos da Home.

### Final da Home — 04/11/2026

Quatro destaques mantêm prioridade e ordem da seleção existente; o hero conserva sua seleção própria. `HomeComoFunciona` apresenta título, três passos e CTA à esquerda, foto editorial `images/home/combo-balcao-runway.webp` (1100×1100) à direita. A foto do card Combos não muda. No celular, a ordem no DOM e na leitura é título, foto 3:2, passos e CTA. O enquadramento `cover`, centralizado a 80% na vertical, mantém coxinha e copo. Dimensões reservadas e lazy loading permanecem.

`HomePromotionFeature` é uma faixa editorial de duas colunas: palco `--pp-promotion-stage` à esquerda; cabeçalho, link, nome, descrição, preços e ações à direita. O fundo chega às bordas com sombra de expansão e recorte vertical, sem largura `100vw`, overflow ou alteração do contêiner da Home. Bordas externas retas; miolo alinhado ao conteúdo. Creme e dourado mantêm contraste sobre #110c09. O CTA dourado reutiliza preenchimento circular creme; favorito usa coração preenchido e `aria-pressed`.

Somente o produto id 1 (Coxinha de frango, confirmado na API local) recebe o clipe escuro 600×720, 24fps/4s, 96 quadros keyframes e sem áudio. No desktop, `useScrollVideo` sincroniza `currentTime` com scroll nativo via RAF e agrupa seeks; subida reverte. Sticky fica abaixo do header e libera após o último quadro. Erro, metadados inválidos ou altura insuficiente usam pôster sem espaço extra. Movimento reduzido impede montagem do vídeo. Outras ofertas usam `ProductImage`, inclusive seu fallback.

Até 760px, título/link iniciam a promoção; seguem pôster de 180–220px, nome, descrição, preço e ações. Sem vídeo no DOM, solicitação ao MP4, sticky ou distância extra. O pôster amplia apenas seu fundo excedente para manter o produto inteiro e presente na faixa. Ações reservam 64px à direita para o botão flutuante de dúvidas; favorito mantém alvo próprio de 48px. O fluxo normal permite alcançar detalhes e compra também em telas baixas.

`--pp-home-action-duration: 450ms` é herdado apenas na Home, com `--pp-ease`. `CardActionContent` calcula em pixels a distância do centro inferior à borda arredondada mais distante; `ResizeObserver` acompanha o tamanho e é desconectado na desmontagem. Isso normaliza entrada e saída em botões largos e circulares, preservando o CSS compartilhado e a cópia visual de contraste. Loading/disabled interrompem o preenchimento imediatamente. Hover exige suporte; foco e toque independem dele. Movimento reduzido remove transições. Outras rotas mantêm seus raios e tempos anteriores.

O fechamento exclusivo da Home combina marca e três links existentes com separação de 1px creme. Nenhum dado institucional foi inventado. Ações editoriais e da oferta têm no mínimo 44px e foco visível. Provas da revisão responsiva em `../docs/prints/home-responsiva-2026-11-04/`; histórico em `../docs/prints/home-ajustes-2026-11-04/` e `../docs/prints/home-pos-destaques-2026-11-04/`.

### Curadoria A–F da Home — prévia de 04/11/2026

A sequência após a oferta é galeria, dúvidas e rodapé. A composição anterior e os quatro destaques
permanecem. `HomeFaq` usa três disclosures nativos com nome compartilhado, leitura em Inter,
divisores creme e título canônico em Anton; duas colunas no desktop e sequência linear até 760px.
As respostas refletem acompanhamento em Meus pedidos, notificação no app e QR disponível no estado pronto.

`HomeFooter` mantém os três links existentes e acrescenta retorno ao topo com foco na saudação.
PIRES é um wordmark decorativo em Anton, grande e monocromático, impresso por pontos de 4px;
não é texto informativo com gradiente. Aparece uma vez por montagem com blur de 3px/opacidade em
400ms, nunca oculta conteúdo por padrão. Movimento reduzido mantém o elemento estático.

O indicador único do header acompanha apenas a rota, com transform em 240ms. Hover e menu aberto
continuam estados próprios; destinos e semântica existentes permanecem. No menu mobile,
`aria-current` identifica a área sem exigir expansão do submenu. A confirmação existente do carrinho
passa a atingir ícone/contador e barra inferior por 400ms, depois da ação de adição; movimento
reduzido mantém a atualização estática. Falha, remoção e carga inicial não são sucesso de adição.

`HomeGallery` usa foto principal 4:3 e miniaturas no desktop, moldura branca e legenda Caveat.
Até 760px, a trilha usa scroll snap nativo, setas e controles manuais de 48px. Recebe no máximo
três imagens autorizadas, sem autoplay; erro de imagem mantém legenda e navegação. Desde 05/11,
a Home importa os WebP fornecidos pelo Arthur: preparo, vitrine e retirada, todos 1200×896.
A seção informa uma vez “Imagens ilustrativas geradas com IA”; nomes acessíveis não apresentam
as cenas como fotos documentais da Pires. Vazia, a prévia DEV mostra a lacuna, e o build oculta a seção.
A seleção preserva o destino durante a rolagem suave, sem aceitar posições intermediárias como
novos comandos. Fim da rolagem ou gesto manual devolvem a leitura à posição nativa; resize alinha
imediatamente a imagem selecionada. Setas, Home, End e movimento reduzido mantêm a navegação.

A linha dourada da promoção ocupa 38% da largura do palco e reutiliza `progress` normalizado de
`useScrollVideo`. Avanço, reversão e fim têm a mesma fonte do seek; não há polling/listener paralelo.
Modo estático, mobile, erro, altura insuficiente e outras ofertas não mostram esse indicador.
Nenhum recurso depende das animações para navegar ou comprar.

Referências e evidências: `docs/prints/home-curadoria-2026-11-04/README.md` na pasta pai.
Finalização da galeria e regressão A–F: `docs/prints/home-curadoria-final-2026-11-05/README.md` na pasta pai.

### Detalhe compartilhado e Cardápio — 05/11/2026

`ProductDetailsModal` mantém o Balcão creme: foto ou ilustração à esquerda, conteúdo creme à direita, nome em Anton e leitura/controles em Inter. O favorito tem alvo separado; fechar fica fora do painel no desktop amplo e em cabeçalho próprio quando a largura diminui. No celular, imagem e texto rolam no miolo; quantidade, subtotal e compra permanecem visíveis na base do painel, com espaço para a área segura.

O diálogo nativo via Teleport ocupa a camada superior, recebe foco inicial em fechar, contém Tab/Shift+Tab e devolve o foco ao gatilho. Escape e clique iniciado e concluído no fundo fecham. Bloqueia a rolagem da página somente aberto e restaura valor e prioridade anteriores de `overflow`. Quantidade acompanha o estoque recebido; carregamento, falha, indisponibilidade e adição pendente têm estados próprios. Feedback opcional fica dentro do diálogo para permanecer visível nessa camada; as quatro telas limpam a mensagem ao abrir, permitindo repetir o mesmo aviso. O CTA reutiliza o círculo de 450ms com raio medido por `CardActionContent`, habilitado por `data-card-action-radius` mesmo fora da Home; movimento reduzido suprime a transição.

No Cardápio, busca e ordenação compartilham a barra desktop; categorias ficam em trilha com indicador dourado e `aria-pressed`. Até 760px, busca ocupa a largura, categorias rolam e filtro/ordenação usam controles compactos. Cards mantêm fotos/fallback e ações existentes; acabamento branco, borda creme e nomes em Inter pertencem somente a essa view. No celular, preço e compra se alinham à esquerda para manter a ação livre do assistente à direita. Busca/categoria continuam ligadas à URL e ao histórico; carregamento, erro, catálogo vazio e busca sem resultados permanecem distintos. Plano e evidências: [detalhe e Cardápio](../docs/planos/detalhe-e-cardapio.md) e [relatório local](../docs/prints/detalhe-cardapio-2026-11-05/README.md).

Revisão do Cardápio: uma busca própria, com busca do header omitida somente nesta rota. Controles mais próximos dos produtos e linha dourada contínua na categoria selecionada. Paginação de oito mantém anterior, números, próxima e resumo; grupo centralizado no desktop para ficar livre do chatbot, alinhado à esquerda no celular. Página ativa marrom/creme, foco dourado e alvos de pelo menos 44px. Categoria/página remontam a grade com entrada de 200ms, opacidade e deslocamento de 8px, sem atraso por card. Movimento reduzido remove entrada, deslizamento e rolagem suave. O feedback existente do carrinho só ocorre após adição confirmada. [Evidências da revisão](../docs/prints/cardapio-revisao-2026-11-05/README.md).

## Do's and Don'ts

### Do:
- Reutilizar HomeSectionHeader nos cabeçalhos de seção da Home.
- Preservar textos, rotas, notas e estados existentes.
- Validar estilos computados, foco, hover, quebra, ampliação e toque em desktop e celular.
- Manter tokens CSS como fonte da implementação e atualizar esta documentação quando o contrato mudar.

### Don't:
- Duplicar regras de título/ação em HomeView ou componentes de seção.
- Aplicar o tamanho de chamada aos nomes de produto ou a todos os h2 da aplicação.
- Adicionar textos auxiliares, fundos ou ornamentos para preencher espaço.
- Trocar fontes, paleta ou comportamento de compra durante uma padronização de cabeçalhos.
