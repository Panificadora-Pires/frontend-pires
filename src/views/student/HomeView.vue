<template>
  <div class="home">
    <header class="home__intro">
      <h1 id="inicio-home" tabindex="-1">
        {{ saudacao }}, {{ primeiroNome }}!
      </h1>
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
        <div
          v-for="indice in 4"
          :key="indice"
          class="home__skeleton"
          aria-hidden="true"
        >
          <span class="home__skeleton-img" />
          <span />
          <span class="home__skeleton-curto" />
        </div>
      </div>

      <div v-else-if="erroProdutos" class="home__estado" role="alert">
        <CircleAlert :size="26" aria-hidden="true" />
        <strong>Não conseguimos carregar os produtos.</strong>
        <p>Verifique sua conexão e tente novamente.</p>
        <button
          type="button"
          class="home__botao-secundario"
          @click="carregarProdutos"
        >
          Tentar novamente
        </button>
      </div>

      <div v-else-if="!destaques.length" class="home__estado">
        <ShoppingBag :size="26" aria-hidden="true" />
        <strong>O cardápio de hoje ainda não foi publicado.</strong>
        <p>
          Volte daqui a pouco: os produtos aparecem aqui assim que a padaria
          liberar.
        </p>
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

    <HomeGallery class="home__secao" :fotos="fotosBalcao" />
    <HomeFaq class="home__secao" />
    <HomeFooter />

    <ProductDetailsModal
      :open="modalAberto"
      :produto="produtoDetalhado"
      :loading="carregandoDetalhe"
      :adding="adicionandoModal"
      :feedback="toast"
      :favorito="
        Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))
      "
      :favoritando="
        Boolean(
          produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id),
        )
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
import { computed, onMounted, ref, watch } from "vue";
import { Check, CircleAlert, ShoppingBag } from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import HomeBanner from "@/components/home/HomeBanner.vue";
import HomeCategories from "@/components/home/HomeCategories.vue";
import HomeComoFunciona from "@/components/home/HomeComoFunciona.vue";
import HomeFooter from "@/components/home/HomeFooter.vue";
import HomeGallery from "@/components/home/HomeGallery.vue";
import HomeFaq from "@/components/home/HomeFaq.vue";
import HomePromotionFeature from "@/components/home/HomePromotionFeature.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import preparoBalcao from "@/assets/images/home/galeria/preparo.webp";
import vitrineBalcao from "@/assets/images/home/galeria/vitrine.webp";
import retiradaBalcao from "@/assets/images/home/galeria/retirada.webp";
import { useCompraCatalogo } from "@/composables/useCompraCatalogo";
import catalogService, { promocaoEstaAtiva } from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { montarSlidesBanner } from "@/utils/slidesBanner";

const MAXIMO_DESTAQUES = 4;

const fotosBalcao = [
  {
    id: "preparo",
    src: preparoBalcao,
    alt: "Coxinhas douradas em uma bandeja sobre o balcão.",
    legenda: "Coxinhas na bandeja",
    width: 1200,
    height: 896,
  },
  {
    id: "vitrine",
    src: vitrineBalcao,
    alt: "Brigadeiros e pães de queijo em uma vitrine de vidro.",
    legenda: "Brigadeiros e pães de queijo",
    width: 1200,
    height: 896,
  },
  {
    id: "retirada",
    src: retiradaBalcao,
    alt: "Coxinha no prato ao lado de um copo de suco de laranja.",
    legenda: "Coxinha com suco de laranja",
    width: 1200,
    height: 896,
  },
];

const auth = useAuthStore();
const favorites = useFavoritesStore();
const {
  modalAberto,
  carregandoDetalhe,
  produtoDetalhado,
  produtoAdicionando,
  adicionandoModal,
  toast,
  alternarFavorito,
  abrirProduto,
  fecharModal,
  adicionarRapido: adicionarAoCarrinho,
  adicionarDoModal,
} = useCompraCatalogo({ duracaoToast: 2200 });

const produtos = ref([]);
const promocoes = ref([]);
const carregandoProdutos = ref(true);
const carregandoPromos = ref(true);
const erroProdutos = ref(false);

const primeiroNome = computed(
  () => (auth.usuario?.name || "Aluno").trim().split(/\s+/)[0] || "Aluno",
);

const saudacao = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
});

const destaques = computed(() => {
  const marcados = produtos.value.filter((produto) => produto.destaque);
  const restantes = produtos.value.filter((produto) => !produto.destaque);
  return [...marcados, ...restantes].slice(0, MAXIMO_DESTAQUES);
});

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

const promocaoEmDestaque = ref(null);
watch(produtosEmPromocao, async (candidatos, anterior, onCleanup) => {
  let atual = true;
  onCleanup(() => {
    atual = false;
  });
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
      if (!atual) return;
    }
  }
});

const slidesBanner = computed(() =>
  montarSlidesBanner(produtosEmPromocao.value, produtos.value),
);

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
    promocoes.value = [];
  } finally {
    carregandoPromos.value = false;
  }
}

onMounted(() => {
  favorites.carregar().catch(() => {});
  Promise.allSettled([carregarProdutos(), carregarPromocoes()]);
});
</script>

<style scoped src="./HomeView.css"></style>
