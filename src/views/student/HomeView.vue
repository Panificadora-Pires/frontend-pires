<template>
  <div class="home">
    <header class="home__intro">
      <h1>{{ saudacao }}, {{ primeiroNome }}!</h1>
      <p>Peça agora e retire no balcão antes do sinal tocar.</p>
    </header>

    <HomeBanner
      :slides="slidesBanner"
      :carregando="carregandoProdutos || carregandoPromos"
      :adicionando-id="produtoAdicionando"
      @adicionar="adicionarAoCarrinho"
    />

    <HomeCategories />

    <section v-revelar class="home__secao" aria-labelledby="titulo-destaques">
      <HomeSectionHeader
        title-id="titulo-destaques"
        title="Destaques para você"
        note="escolha e adicione"
        :action-to="{ name: 'cardapio' }"
        action-label="Ver cardápio"
      />

      <div
        v-if="carregandoProdutos"
        class="home__grade"
        aria-label="Carregando produtos"
      >
        <div v-for="indice in 4" :key="indice" class="home__skeleton" aria-hidden="true">
          <span class="home__skeleton-img" />
          <span />
          <span class="home__skeleton-curto" />
        </div>
      </div>

      <div v-else-if="erroProdutos" class="home__estado" role="alert">
        <CircleAlert :size="26" aria-hidden="true" />
        <strong>Não conseguimos carregar os produtos.</strong>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" class="home__botao-secundario" @click="carregarProdutos">
          Tentar novamente
        </button>
      </div>

      <div v-else-if="!destaques.length" class="home__estado">
        <ShoppingBag :size="26" aria-hidden="true" />
        <strong>O cardápio de hoje ainda não foi publicado.</strong>
        <p>Volte daqui a pouco: os produtos aparecem aqui assim que a padaria liberar.</p>
      </div>

      <div v-else class="home__grade">
        <ProductCard
          v-for="produto in destaques"
          variant="home"
          :key="produto.id"
          :produto="produto"
          :favorito="favorites.tem(produto.id)"
          :favoritando="favorites.estaProcessando(produto.id)"
          :adicionando="produtoAdicionando === produto.id"
          @open="abrirProduto"
          @favorite="alternarFavorito"
          @add="adicionarAoCarrinho"
        />
      </div>
    </section>

    <HomeComoFunciona class="home__secao" />

    <HomePromotionFeature
      v-if="promocaoEmDestaque"
      :key="promocaoEmDestaque.id"
      class="home__secao"
      :produto="promocaoEmDestaque"
      :favorito="favorites.tem(promocaoEmDestaque.id)"
      :favoritando="favorites.estaProcessando(promocaoEmDestaque.id)"
      :adicionando="produtoAdicionando === promocaoEmDestaque.id"
      @open="abrirProduto"
      @favorite="alternarFavorito"
      @add="adicionarAoCarrinho"
    />

    <HomeFooter />

    <ProductDetailsModal
      :open="modalAberto"
      :produto="produtoDetalhado"
      :loading="carregandoDetalhe"
      :adding="adicionandoModal"
      :favorito="Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))"
      :favoritando="
        Boolean(produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id))
      "
      @close="fecharModal"
      @favorite="alternarFavorito"
      @add="adicionarDoModal"
    />

    <Transition name="toast">
      <div v-if="toast" class="home__toast" role="status" aria-live="polite">
        <Check :size="17" aria-hidden="true" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Check, CircleAlert, ShoppingBag } from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import HomeBanner from "@/components/home/HomeBanner.vue";
import HomeCategories from "@/components/home/HomeCategories.vue";
import HomeComoFunciona from "@/components/home/HomeComoFunciona.vue";
import HomeFooter from "@/components/home/HomeFooter.vue";
import HomePromotionFeature from "@/components/home/HomePromotionFeature.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import catalogService, {
  promocaoEstaAtiva,
  resolverUrlMidia,
} from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { ilustracaoParaProduto } from "@/utils/ilustracaoProduto";

const MAXIMO_DESTAQUES = 8;
const MAXIMO_PROMOCOES_NO_BANNER = 3;
const MAXIMO_DESTAQUES_NO_BANNER = 2;

const auth = useAuthStore();
const cart = useCartStore();
const favorites = useFavoritesStore();

const produtos = ref([]);
const promocoes = ref([]);
const carregandoProdutos = ref(true);
const carregandoPromos = ref(true);
const erroProdutos = ref(false);
const modalAberto = ref(false);
const carregandoDetalhe = ref(false);
const produtoDetalhado = ref(null);
const produtoAdicionando = ref(null);
const adicionandoModal = ref(false);
const toast = ref("");
const detalhesCache = new Map();
let timeoutToast = null;

const primeiroNome = computed(
  () => (auth.usuario?.name || "Aluno").trim().split(/\s+/)[0] || "Aluno",
);

const saudacao = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
});

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

// Produtos em destaque primeiro; sem destaque marcado, os primeiros ativos.
const destaques = computed(() => {
  const marcados = produtos.value.filter((produto) => produto.destaque);
  const restantes = produtos.value.filter((produto) => !produto.destaque);
  return [...marcados, ...restantes].slice(0, MAXIMO_DESTAQUES);
});

// Só produtos com promoção vigente (a API marca em_promocao; a lista de promoções confirma a vigência).
const produtosEmPromocao = computed(() => {
  const vigentes = new Map(
    promocoes.value
      .filter((promocao) => promocaoEstaAtiva(promocao))
      .map((promocao) => [Number(promocao.produto), promocao]),
  );
  return produtos.value.filter(
    (produto) => produto.em_promocao && vigentes.has(Number(produto.id)),
  );
});

// A listagem não traz estoque: confirmar pelo detalhe antes de oferecer a compra.
const promocaoEmDestaque = ref(null);
watch(produtosEmPromocao, async (candidatos, anterior, onCleanup) => {
  let atual = true;
  onCleanup(() => { atual = false; });
  promocaoEmDestaque.value = null;

  for (const produto of candidatos) {
    try {
      const detalhe = await catalogService.obterProduto(produto.id);
      if (!atual) return;
      if (detalhe.ativo && detalhe.em_promocao && Number(detalhe.estoque) > 0) {
        promocaoEmDestaque.value = { ...produto, ...detalhe };
        return;
      }
    } catch {
      // Sem confirmar disponibilidade, tentar a próxima oferta vigente.
      if (!atual) return;
    }
  }
});

// Comercial v3 aprovado, sem texto gravado; demais produtos mantêm foto/ilustração.

function slideDeProduto(produto, { etiqueta, destaque, texto, nota }) {
  const preco = formatarPreco(produto.preco_atual ?? produto.preco);
  return {
    id: `produto-${produto.id}`,
    etiqueta,
    titulo: [produto.nome],
    destaque,
    texto,
    nota,
    ilustracao: ilustracaoParaProduto(produto),
    imagem: resolverUrlMidia(produto.imagem) || null,
    ...(ilustracaoParaProduto(produto) === "coxinha" && {
      video: "/videos/coxinha-banner.mp4",
      poster: "/videos/coxinha-banner-poster.jpg",
      videoMobile: "/videos/coxinha-banner-mobile-v2.mp4",
      posterMobile: "/videos/coxinha-banner-mobile-v2-poster.jpg",
      duracao: 16000,
    }),
    acao: { tipo: "adicionar", rotulo: `Adicionar · ${preco}`, produto },
  };
}

// Banner: promoções reais primeiro; sem promoção, os destaques da casa. "Como funciona" fecha a fila.
const slidesBanner = computed(() => {
  const emPromocao = produtosEmPromocao.value.slice(0, MAXIMO_PROMOCOES_NO_BANNER);
  const slides = emPromocao.length
    ? emPromocao.map((produto) => {
        const original = Number(produto.preco);
        const atual = Number(produto.preco_atual ?? produto.preco);
        const desconto = original > atual ? Math.round(((original - atual) / original) * 100) : 0;
        return slideDeProduto(produto, {
          etiqueta: "Promoção de hoje",
          destaque: `por ${formatarPreco(atual)}`,
          texto: `De ${formatarPreco(original)} por ${formatarPreco(atual)} enquanto durar a promoção.`,
          nota: desconto ? `${desconto}% mais barato` : "",
        });
      })
    : produtos.value
        .filter((produto) => produto.destaque)
        .slice(0, MAXIMO_DESTAQUES_NO_BANNER)
        .map((produto) =>
          slideDeProduto(produto, {
            etiqueta: "Destaque da casa",
            destaque: "sem fila.",
            texto: "Peça agora pelo app e retire no balcão mostrando o QR Code.",
            nota: "direto do balcão",
          }),
        );

  return [
    ...slides,
    {
      id: "como-funciona",
      etiqueta: "Como funciona",
      titulo: ["Pediu,", "pagou,"],
      destaque: "mostrou.",
      texto:
        "Pix, cartão ou dinheiro na retirada. Quando ficar pronto, você recebe o aviso e mostra o QR Code no balcão.",
      nota: "é só mostrar no balcão",
      ilustracao: "qr",
      imagem: null,
      acao: { tipo: "rota", rotulo: "Ver meus pedidos", rota: "pedidos" },
    },
  ];
});

async function alternarFavorito(produto) {
  if (!produto?.id) return;
  const estavaFavoritado = favorites.tem(produto.id);

  try {
    await favorites.alternar(produto);
    mostrarToast(
      estavaFavoritado
        ? `${produto.nome} removido dos favoritos.`
        : `${produto.nome} adicionado aos favoritos.`,
    );
  } catch {
    mostrarToast("Não foi possível atualizar seus favoritos.");
  }
}

async function obterDetalhes(produto) {
  if (!produto?.id) return null;
  if (detalhesCache.has(produto.id)) return detalhesCache.get(produto.id);

  const detalhe = await catalogService.obterProduto(produto.id);
  detalhesCache.set(produto.id, detalhe);
  return detalhe;
}

async function abrirProduto(produto) {
  if (!produto?.id) return;
  modalAberto.value = true;
  carregandoDetalhe.value = true;
  produtoDetalhado.value = null;

  try {
    produtoDetalhado.value = await obterDetalhes(produto);
  } catch {
    produtoDetalhado.value = null;
  } finally {
    carregandoDetalhe.value = false;
  }
}

function fecharModal() {
  modalAberto.value = false;
  produtoDetalhado.value = null;
}

async function adicionarAoCarrinho(produto) {
  if (!produto?.id || produtoAdicionando.value) return;
  produtoAdicionando.value = produto.id;

  try {
    const detalhe = await obterDetalhes(produto);
    const estoque = Number(detalhe?.estoque ?? 0);

    if (estoque <= 0) {
      mostrarToast(`${produto.nome} está sem estoque no momento.`);
      return;
    }

    const itemAtual = cart.itens.find((item) => item.produto.id === produto.id);
    if ((itemAtual?.quantidade || 0) >= estoque) {
      mostrarToast(`Você já adicionou todo o estoque disponível de ${produto.nome}.`);
      return;
    }

    cart.adicionar({ ...produto, ...detalhe }, 1);
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
  } catch {
    mostrarToast("Não foi possível verificar a disponibilidade do produto.");
  } finally {
    produtoAdicionando.value = null;
  }
}

async function adicionarDoModal({ produto, quantidade }) {
  if (!produto || adicionandoModal.value) return;
  adicionandoModal.value = true;

  try {
    const estoque = Number(produto.estoque || 0);
    const itemAtual = cart.itens.find((item) => item.produto.id === produto.id);
    const novaQuantidade = (itemAtual?.quantidade || 0) + quantidade;

    if (novaQuantidade > estoque) {
      mostrarToast(
        `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}.`,
      );
      return;
    }

    cart.adicionar(produto, quantidade);
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
    fecharModal();
  } finally {
    adicionandoModal.value = false;
  }
}

function mostrarToast(mensagem) {
  toast.value = mensagem;
  window.clearTimeout(timeoutToast);
  timeoutToast = window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

async function carregarProdutos() {
  carregandoProdutos.value = true;
  erroProdutos.value = false;

  try {
    produtos.value = await catalogService.listarProdutosAtivos();
  } catch {
    produtos.value = [];
    erroProdutos.value = true;
  } finally {
    carregandoProdutos.value = false;
  }
}

async function carregarPromocoes() {
  carregandoPromos.value = true;

  try {
    promocoes.value = await catalogService.listarPromocoes();
  } catch {
    // Sem a lista de promoções, o banner usa os destaques da casa.
    promocoes.value = [];
  } finally {
    carregandoPromos.value = false;
  }
}

onMounted(() => {
  favorites.carregar().catch(() => {});
  Promise.allSettled([carregarProdutos(), carregarPromocoes()]);
});

onBeforeUnmount(() => {
  window.clearTimeout(timeoutToast);
});
</script>

<style scoped>
.home {
  --pp-home-action-duration: 450ms;
  width: min(100%, 1240px);
  margin: 0 auto;
  color: var(--student-text);
}
/* Só os controles da Home herdam o tempo comum; conteúdo e outras rotas não mudam. */
.home :deep(:is(button, a, .pp-card-action__fill)) {
  transition-duration: var(--pp-home-action-duration);
  transition-timing-function: var(--pp-ease);
}
.home :deep(:is(.home-promotion__favorito, .home-promotion__detalhes, .home__botao-secundario)) {
  transition-property: color, border-color, background-color;
}
.home :deep(:is(.home-section-header__action, .home-footer__links a, .home-promotion__detalhes)) {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: transparent;
  transition-property: text-decoration-color, color;
}
.home :deep(:is(.home-section-header__action, .home-footer__links a, .home-promotion__detalhes):focus-visible) {
  text-decoration-color: currentColor;
}
@media (hover: hover) {
  .home :deep(:is(.home-section-header__action, .home-footer__links a, .home-promotion__detalhes):hover) {
    text-decoration-color: currentColor;
  }
}
.home :deep(:is(button, a):is(:active, :disabled, [aria-disabled="true"], .is-loading)),
.home :deep(.pp-card-action:is(:disabled, [aria-disabled="true"], .is-loading) > .pp-card-action__fill) {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .home :deep(:is(button, a, .pp-card-action__fill)) { transition: none; }
}
.home__intro {
  margin-bottom: 20px;
}
.home__intro h1 {
  margin: 0;
  font-size: 28px;
}
.home__intro p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 14px;
}
.home__secao {
  margin-top: var(--pp-home-section-space);
}
.home__grade {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.home__skeleton {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-card-lg);
  background: var(--student-surface);
}
.home__skeleton span {
  height: 14px;
  border-radius: 6px;
  background: var(--pp-creme-2);
  animation: home-pulso 1.2s ease-in-out infinite;
}
.home__skeleton .home__skeleton-img {
  height: auto;
  aspect-ratio: 1.18 / 1;
  border-radius: 14px;
}
.home__skeleton .home__skeleton-curto {
  width: 45%;
}
@keyframes home-pulso {
  50% {
    opacity: 0.55;
  }
}
.home__estado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-card-lg);
  background: var(--student-surface);
  color: var(--student-accent);
  text-align: center;
}
.home__estado strong {
  color: var(--student-text);
  font-size: 16px;
}
.home__estado p {
  margin: 0 0 8px;
  color: var(--student-muted);
  font-size: 14px;
}
.home__botao-secundario {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--student-border-strong);
  border-radius: var(--pp-radius-full);
  background: var(--student-surface);
  color: var(--student-text);
  font-weight: 700;
  cursor: pointer;
}
.home__toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-marrom);
  color: var(--pp-creme);
  font-size: 14px;
  font-weight: 600;
  box-shadow: var(--pp-sombra-card);
  transform: translateX(-50%);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
@media (max-width: 1100px) {
  .home__grade {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .home__intro h1 {
    font-size: 23px;
  }
  .home__grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .home__toast {
    bottom: calc(64px + 80px + env(safe-area-inset-bottom));
    max-width: calc(100vw - 32px);
  }
}
</style>
