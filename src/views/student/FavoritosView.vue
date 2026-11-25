<script setup>
import { AnimatePresence } from "motion-v";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Heart,
  Search,
  SearchX,
  X,
} from "lucide-vue-next";
import FavoriteProduct from "@/components/favorites/FavoriteProduct.vue";
import FavoriteCollectionItem from "@/components/favorites/FavoriteCollectionItem.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import { useColecaoFavoritos } from "@/composables/useColecaoFavoritos";
import { useFavoritesStore } from "@/stores/favorites";

const favorites = useFavoritesStore();
const {
  busca,
  categoria,
  ordem,
  estado,
  titulo,
  categorias,
  produtosFiltrados,
  temFiltros,
  modalAberto,
  carregandoDetalhe,
  produtoDetalhado,
  produtoAdicionando,
  toast,
  tipoToast,
  adicionandoModal,
  vistos,
  limparFiltros,
  recarregar,
  alternarFavorito,
  abrirProduto,
  fecharModal,
  adicionarRapido,
  adicionarDoModal,
} = useColecaoFavoritos();
</script>

<template>
  <div class="favorites-page">
    <header class="favorites-page__header">
      <div>
        <h1 ref="titulo" tabindex="-1">Favoritos</h1>
        <p class="favorites-page__note">Seus sabores de sempre, por perto.</p>
      </div>
      <div class="favorites-page__summary">
        <p v-if="favorites.inicializado">
          <Heart :size="15" fill="currentColor" aria-hidden="true" /><strong>{{
            favorites.total
          }}</strong>
          {{ favorites.total === 1 ? "produto salvo" : "produtos salvos" }}
        </p>
        <RouterLink :to="{ name: 'cardapio' }"
          >Explorar cardápio <ArrowRight :size="17" aria-hidden="true"
        /></RouterLink>
      </div>
    </header>
    <div
      v-if="favorites.inicializado && favorites.total"
      class="favorites-page__controls"
      :class="{ 'favorites-page__controls--compact': favorites.total <= 2 }"
    >
      <label class="favorites-page__search"
        ><Search :size="19" aria-hidden="true" /><input
          v-model="busca"
          type="search"
          aria-label="Buscar nos favoritos"
          placeholder="Buscar um sabor salvo"
          autocomplete="off" /><button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="17" aria-hidden="true" /></button
      ></label>
      <label class="favorites-page__select"
        ><span>Categoria</span
        ><select v-model="categoria" aria-label="Filtrar por categoria">
          <option value="">Todas</option>
          <option v-for="nome in categorias" :key="nome" :value="nome">
            {{ nome }}
          </option>
        </select></label
      >
      <label class="favorites-page__select"
        ><span>Ordenar</span
        ><select v-model="ordem" aria-label="Ordenar favoritos">
          <option value="selecao">Ordem da seleção</option>
          <option value="nome">Nome A–Z</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select></label
      >
    </div>
    <section
      class="favorites-page__collection"
      aria-label="Sua coleção de favoritos"
      :aria-busy="favorites.carregando"
    >
      <p
        v-if="favorites.inicializado && favorites.erro"
        class="favorites-page__update-error"
        role="status"
      >
        Não foi possível atualizar sua coleção. Seus produtos continuam aqui.
        <button
          type="button"
          :disabled="favorites.carregando"
          @click="recarregar"
        >
          Tentar novamente
        </button>
      </p>
      <div
        v-if="!favorites.inicializado && !favorites.erro"
        class="favorites-page__loading"
        role="status"
      >
        <span>Carregando seus favoritos…</span>
        <div class="favorites-page__skeletons" aria-hidden="true">
          <div v-for="n in 4" :key="n" />
        </div>
      </div>
      <div
        v-else-if="!favorites.inicializado && favorites.erro"
        ref="estado"
        tabindex="-1"
        class="favorites-page__state"
        role="alert"
      >
        <CircleAlert :size="32" aria-hidden="true" />
        <h2>Sua coleção não carregou.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button
          type="button"
          :disabled="favorites.carregando"
          @click="recarregar"
        >
          {{ favorites.carregando ? "Carregando…" : "Tentar novamente" }}
        </button>
      </div>
      <template v-else>
        <div v-if="favorites.total" class="favorites-page__collection-head">
          <p aria-live="polite" aria-atomic="true">
            {{ produtosFiltrados.length }}
            {{
              produtosFiltrados.length === 1
                ? "sabor para o seu intervalo"
                : "sabores para o seu intervalo"
            }}
          </p>
          <button v-if="temFiltros" type="button" @click="limparFiltros">
            Limpar filtros
          </button>
        </div>
        <div
          class="favorites-page__grid"
          :class="{
            'favorites-page__grid--single': produtosFiltrados.length === 1,
            'favorites-page__grid--duo': produtosFiltrados.length === 2,
          }"
        >
          <AnimatePresence mode="popLayout">
            <FavoriteCollectionItem
              v-for="produto in produtosFiltrados"
              :key="produto.id"
              :produto-id="produto.id"
              :animar="!vistos.has(produto.id)"
              @apareceu="vistos.add($event)"
            >
              <FavoriteProduct
                :produto="produto"
                :destaque="produtosFiltrados.length === 1"
                :favoritando="favorites.estaProcessando(produto.id)"
                :adicionando="produtoAdicionando === produto.id"
                @open="abrirProduto"
                @favorite="alternarFavorito"
                @add="adicionarRapido"
              />
            </FavoriteCollectionItem>
          </AnimatePresence>
        </div>
        <div
          v-if="!favorites.total"
          class="favorites-page__state favorites-page__state--empty"
        >
          <svg
            class="favorites-page__illustration"
            viewBox="0 0 200 150"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M30 110h140M45 110l-7-55h124l-7 55M60 110v18m80-18v18"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              d="M65 54c-16-6-17-27-4-32 8-4 16 0 20 7 4-7 12-11 20-7 13 5 12 26-4 32L81 66 65 54Z"
              fill="var(--pp-creme-3)"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M110 53c-6-14 5-28 18-25 10 2 16 14 10 25M67 81h66m-58 13h50"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
          <h2 ref="estado" tabindex="-1">
            Guarde um lugar<br />para os seus preferidos.
          </h2>
          <p>
            Toque no coração dos produtos que você gosta.<br
              class="favorites-page__desktop-break"
            />
            Eles ficam aqui para o próximo intervalo.
          </p>
          <RouterLink :to="{ name: 'cardapio' }"
            >Encontrar meu próximo favorito
            <ArrowRight :size="17" aria-hidden="true"
          /></RouterLink>
        </div>
        <div
          v-else-if="!produtosFiltrados.length"
          ref="estado"
          tabindex="-1"
          class="favorites-page__state"
        >
          <SearchX :size="32" aria-hidden="true" />
          <h2>Esse sabor não está na seleção.</h2>
          <p>Tente outro nome ou veja todos os produtos que você salvou.</p>
          <button type="button" @click="limparFiltros">
            Ver todos os favoritos
          </button>
        </div>
      </template>
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
    <Transition name="favorites-toast"
      ><div
        v-if="toast"
        class="favorites-page__toast"
        :class="{ 'favorites-page__toast--error': tipoToast === 'erro' }"
        :role="tipoToast === 'erro' ? 'alert' : 'status'"
        aria-live="polite"
      >
        <CircleAlert
          v-if="tipoToast === 'erro'"
          :size="19"
          aria-hidden="true"
        /><CheckCircle2 v-else :size="19" aria-hidden="true" />{{ toast }}
      </div></Transition
    >
  </div>
</template>

<style scoped src="./FavoritosView.css"></style>
