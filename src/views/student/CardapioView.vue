<template>
  <div class="menu-page">
    <header class="menu-page__header">
      <div>
        <h1>Cardápio</h1>
        <p>Escolha seu lanche</p>
      </div>
      <label class="menu-page__search">
        <Search :size="20" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          aria-label="Buscar no cardápio"
          placeholder="Buscar no cardápio"
          autocomplete="off"
        />
        <button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </label>
    </header>

    <section class="menu-page__toolbar" aria-label="Busca e filtros">
      <div
        ref="categoriasTrilha"
        class="menu-page__categories"
        role="group"
        aria-label="Filtrar por categoria"
      >
        <div class="menu-page__category-track">
          <button
            type="button"
            :class="{ 'is-active': categoriaAtiva === null }"
            :aria-pressed="categoriaAtiva === null"
            @click="categoriaAtiva = null"
          >
            Todos
          </button>
          <button
            v-for="categoria in categorias"
            :key="categoria.id"
            type="button"
            :class="{ 'is-active': categoriaAtiva === categoria.id }"
            :aria-pressed="categoriaAtiva === categoria.id"
            @click="categoriaAtiva = categoria.id"
          >
            {{ categoria.nome }}
          </button>
          <span
            class="menu-page__category-indicator"
            :style="indicadorCategoria"
            aria-hidden="true"
          />
        </div>
      </div>

      <div class="menu-page__filter-row">
        <label class="menu-page__mobile-filter">
          <select v-model="filtroRapido" aria-label="Filtrar produtos">
            <option value="todos">Todos</option>
            <option value="promocao">Em promoção</option>
            <option value="destaque">Destaques</option>
          </select>
          <ChevronDown :size="16" aria-hidden="true" />
        </label>
      </div>
      <label class="menu-page__sort">
        <select v-model="ordenacao" aria-label="Ordenar produtos">
          <option value="relevancia">Relevância</option>
          <option value="nome">Nome A–Z</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select>
        <ChevronDown :size="16" aria-hidden="true" />
      </label>
    </section>

    <section
      class="menu-page__content"
      aria-labelledby="menu-page-products-title"
      :aria-busy="carregando"
    >
      <div class="menu-page__content-head">
        <div>
          <h2 ref="tituloProdutos" id="menu-page-products-title" tabindex="-1">
            {{ temFiltros ? tituloResultados : textoContagem || "Produtos" }}
          </h2>
          <p v-if="temFiltros && !carregando && !erro" role="status">
            {{ textoContagem }}
          </p>
        </div>
        <button
          v-if="temFiltros"
          type="button"
          class="menu-page__clear"
          @click="limparFiltros"
        >
          Limpar filtros
        </button>
      </div>

      <div
        v-if="carregando"
        class="menu-page__grid"
        aria-label="Carregando cardápio"
      >
        <div
          v-for="index in 8"
          :key="index"
          class="menu-page__skeleton"
          aria-hidden="true"
        >
          <div />
          <span /><span />
        </div>
      </div>
      <div v-else-if="erro" class="menu-page__state" role="alert">
        <CircleAlert :size="28" aria-hidden="true" />
        <h2>Não conseguimos carregar o cardápio.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" @click="tentarNovamente">Tentar novamente</button>
      </div>
      <div v-else-if="!produtos.length" class="menu-page__state">
        <ShoppingCart :size="28" aria-hidden="true" />
        <h2>O cardápio de hoje ainda não foi publicado.</h2>
        <p>Os produtos aparecem aqui assim que a padaria liberar.</p>
      </div>
      <div v-else-if="!produtosFiltrados.length" class="menu-page__state">
        <SearchX :size="28" aria-hidden="true" />
        <h2>Nenhum produto encontrado.</h2>
        <p>Tente outra busca ou remova alguns filtros.</p>
        <button v-if="temFiltros" type="button" @click="limparFiltros">
          Ver todos os produtos
        </button>
      </div>
      <div
        v-else
        :key="`${categoriaAtiva ?? 'todos'}-${paginaAtual}`"
        class="menu-page__grid menu-page__grid--products"
      >
        <ProductCard
          v-for="produto in produtosPagina"
          :key="produto.id"
          :produto="produto"
          :favorito="favorites.tem(produto.id)"
          :favoritando="favorites.estaProcessando(produto.id)"
          :adicionando="produtoAdicionando === produto.id"
          @open="abrirProduto"
          @favorite="alternarFavorito"
          @add="adicionarRapido"
        />
      </div>
      <nav
        v-if="!carregando && !erro && totalPaginas > 1"
        class="menu-page__pagination"
        aria-label="Páginas do cardápio"
      >
        <p role="status" aria-atomic="true">{{ resumoPagina }}</p>
        <div class="menu-page__pages">
          <button
            type="button"
            :disabled="paginaAtual === 1"
            @click="mudarPagina(paginaAtual - 1)"
          >
            Anterior
          </button>
          <button
            v-for="numero in totalPaginas"
            :key="numero"
            type="button"
            :aria-label="`Página ${numero}`"
            :aria-current="paginaAtual === numero ? 'page' : undefined"
            @click="mudarPagina(numero)"
          >
            {{ numero }}
          </button>
          <button
            type="button"
            :disabled="paginaAtual === totalPaginas"
            @click="mudarPagina(paginaAtual + 1)"
          >
            Próxima
          </button>
        </div>
      </nav>
    </section>

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
    <Transition name="menu-toast">
      <div
        v-if="toast"
        class="menu-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="18" aria-hidden="true" />{{ toast }}
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { onMounted, ref, useTemplateRef } from "vue";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Search,
  SearchX,
  ShoppingCart,
  X,
} from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useCompraCatalogo } from "@/composables/useCompraCatalogo";
import { useFiltrosCardapio } from "@/composables/useFiltrosCardapio";
import { useTrilhaCategorias } from "@/composables/useTrilhaCategorias";
import catalogService from "@/services/catalog.service";
import { useFavoritesStore } from "@/stores/favorites";

const INTERVALO_CARDAPIO_MS = 60_000;

const favorites = useFavoritesStore();
const categorias = ref([]);
const produtos = ref([]);
const carregando = ref(true);
const erro = ref(false);
const tituloProdutos = useTemplateRef("tituloProdutos");

const {
  modalAberto,
  carregandoDetalhe,
  produtoDetalhado,
  produtoAdicionando,
  adicionandoModal,
  toast,
  limparDetalhes,
  alternarFavorito,
  abrirProduto,
  fecharModal,
  adicionarRapido,
  adicionarDoModal,
} = useCompraCatalogo({ duracaoToast: 2400 });

const {
  busca,
  categoriaAtiva,
  filtroRapido,
  ordenacao,
  temFiltros,
  produtosFiltrados,
  totalPaginas,
  paginaAtual,
  produtosPagina,
  resumoPagina,
  mudarPagina,
  tituloResultados,
  textoContagem,
  limparFiltros,
} = useFiltrosCardapio({
  produtos,
  categorias,
  carregando,
  erro,
  tituloProdutos,
});

const categoriasTrilha = useTemplateRef("categoriasTrilha");
const { indicadorCategoria } = useTrilhaCategorias(categoriasTrilha, [
  categoriaAtiva,
  categorias,
]);

let carregouUmaVez = false;

async function carregarDados() {
  const primeiraCarga = !carregouUmaVez;
  if (primeiraCarga) {
    carregando.value = true;
    erro.value = false;
  }

  try {
    const [categoriasData, produtosData] = await Promise.all([
      catalogService.listarCategoriasAtivas(),
      catalogService.listarProdutosAtivos(),
    ]);

    categorias.value = categoriasData;
    produtos.value = produtosData;
    limparDetalhes();
    carregouUmaVez = true;
    erro.value = false;
  } catch (error) {
    if (primeiraCarga) erro.value = true;
    throw error;
  } finally {
    carregando.value = false;
  }
}

const { atualizarAgora } = useAutoRefresh(carregarDados, {
  intervalo: INTERVALO_CARDAPIO_MS,
});

function tentarNovamente() {
  atualizarAgora();
}

onMounted(() => {
  favorites.carregar().catch(() => {});
});
</script>
<style scoped src="./CardapioView.css"></style>
