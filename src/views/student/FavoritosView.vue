<template>
  <div class="favorites-page">
    <header class="favorites-page__header">
      <div>
        <h1>Favoritos</h1>
        <p>Encontre rapidamente os produtos que você salvou.</p>
      </div>

      <div
        v-if="favorites.inicializado"
        class="favorites-page__count"
        aria-label="Quantidade de favoritos"
      >
        <Heart :size="16" fill="currentColor" />
        <strong>{{ favorites.total }}</strong>
        <span>{{
          favorites.total === 1 ? "produto salvo" : "produtos salvos"
        }}</span>
      </div>
    </header>

    <label v-if="favorites.total" class="favorites-page__search">
      <Search :size="19" aria-hidden="true" />
      <input
        v-model="busca"
        type="search"
        placeholder="Buscar nos seus favoritos..."
        autocomplete="off"
      />
      <button
        v-if="busca"
        type="button"
        aria-label="Limpar busca"
        @click="busca = ''"
      >
        <X :size="16" />
      </button>
    </label>

    <div
      v-if="favorites.carregando && !favorites.inicializado"
      class="favorites-page__grid"
      aria-label="Carregando favoritos"
    >
      <div
        v-for="index in 5"
        :key="index"
        class="favorites-page__skeleton"
        aria-hidden="true"
      >
        <div />
        <span />
        <span />
      </div>
    </div>

    <section
      v-else-if="favorites.erro && !favorites.inicializado"
      class="favorites-page__state favorites-page__state--error"
      role="alert"
    >
      <span class="favorites-page__state-icon">
        <CircleAlert :size="30" />
      </span>
      <h2>Não conseguimos carregar seus favoritos.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" @click="recarregar">Tentar novamente</button>
    </section>

    <section v-else-if="!favorites.total" class="favorites-page__state">
      <span
        class="favorites-page__state-icon favorites-page__state-icon--heart"
      >
        <Heart :size="34" />
      </span>
      <h2>Nenhum favorito ainda</h2>
      <p>
        Salve os produtos que você mais gosta para encontrá-los rapidamente
        quando chegar a hora do intervalo.
      </p>
      <RouterLink :to="{ name: 'cardapio' }">
        Explorar cardápio
        <ArrowRight :size="17" />
      </RouterLink>
    </section>

    <section
      v-else-if="!produtosFiltrados.length"
      class="favorites-page__state"
    >
      <span class="favorites-page__state-icon">
        <SearchX :size="30" />
      </span>
      <h2>Nenhum favorito encontrado.</h2>
      <p>Tente buscar por outro nome ou categoria.</p>
      <button type="button" @click="busca = ''">Limpar busca</button>
    </section>

    <section v-else>
      <div class="favorites-page__section-head">
        <div>
          <h2>Produtos salvos</h2>
          <p>
            {{ produtosFiltrados.length }}
            {{
              produtosFiltrados.length === 1
                ? "produto encontrado"
                : "produtos encontrados"
            }}
          </p>
        </div>

        <RouterLink :to="{ name: 'cardapio' }" class="favorites-page__browse">
          Ver cardápio
          <ArrowRight :size="15" />
        </RouterLink>
      </div>

      <div class="favorites-page__grid">
        <ProductCard
          v-for="produto in produtosFiltrados"
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
    </section>

    <ProductDetailsModal
      :open="modalAberto"
      :produto="produtoDetalhado"
      :loading="carregandoDetalhe"
      :adding="adicionandoModal"
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

    <Transition name="favorites-toast">
      <div
        v-if="toast"
        class="favorites-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="18" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Heart,
  Search,
  SearchX,
  X,
} from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";

const cart = useCartStore();
const favorites = useFavoritesStore();

const busca = ref("");
const detalhesCache = new Map();

const modalAberto = ref(false);
const carregandoDetalhe = ref(false);
const produtoDetalhado = ref(null);
const produtoAdicionando = ref(null);
const adicionandoModal = ref(false);
const toast = ref("");
let toastTimer = null;

const produtosFiltrados = computed(() => {
  const termo = normalizarTexto(busca.value);
  const lista = [...favorites.produtos];

  if (!termo) return lista;

  return lista.filter((produto) => {
    const alvo = normalizarTexto(
      `${produto.nome || ""} ${produto.categoria_nome || ""}`,
    );
    return alvo.includes(termo);
  });
});

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

async function recarregar() {
  try {
    await favorites.carregar({ force: true });
  } catch {
  }
}

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
  if (detalhesCache.has(produto.id)) {
    return detalhesCache.get(produto.id);
  }

  const detalhe = await catalogService.obterProduto(produto.id);
  detalhesCache.set(produto.id, detalhe);
  return detalhe;
}

async function abrirProduto(produto) {
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

async function adicionarRapido(produto) {
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
      mostrarToast(
        `Você já adicionou todo o estoque disponível de ${produto.nome}.`,
      );
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
        `Há somente ${estoque} ${
          estoque === 1 ? "unidade disponível" : "unidades disponíveis"
        }.`,
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
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2400);
}

onMounted(() => {
  favorites.carregar().catch(() => {});
});

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
.favorites-page {
  width: min(100%, 1320px);
  margin: 0 auto;
  color: #2d2823;
}

.favorites-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 22px;
}

.favorites-page__header h1 {
  margin: 0;
  color: #241f1a;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.05;
  font-weight: 760;
  letter-spacing: -0.035em;
}

.favorites-page__header p {
  margin: 7px 0 0;
  color: #766e67;
  font-size: 13px;
  line-height: 1.45;
}

.favorites-page__count {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 2px;
  color: #6c6259;
  font-size: 11px;
  white-space: nowrap;
}

.favorites-page__count svg {
  color: #a96813;
}

.favorites-page__count strong {
  color: #2b241f;
  font-size: 12px;
}

.favorites-page__count span {
  color: #827970;
}

.favorites-page__search {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  padding: 0 15px;
  border: 1px solid rgba(50, 33, 22, 0.085);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: #827970;
  box-shadow: 0 5px 17px rgba(48, 32, 21, 0.025);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.favorites-page__search:focus-within {
  border-color: rgba(45, 29, 20, 0.32);
  box-shadow: 0 0 0 3px rgba(184, 121, 31, 0.07);
}

.favorites-page__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #302923;
  font: inherit;
  font-size: 12px;
}

.favorites-page__search input::placeholder {
  color: #9d958d;
}

.favorites-page__search button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f5f1ec;
  color: #80776f;
  cursor: pointer;
}

.favorites-page__section-head {
  min-height: 46px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.favorites-page__section-head h2 {
  margin: 0;
  color: #29231e;
  font-size: 17px;
  font-weight: 760;
  letter-spacing: -0.02em;
}

.favorites-page__section-head p {
  margin: 4px 0 0;
  color: #928981;
  font-size: 10.5px;
}

.favorites-page__browse {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #745019;
  font-size: 10.5px;
  font-weight: 760;
  text-decoration: none;
}
.favorites-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  align-items: start;
  gap: 14px;
}

.favorites-page__skeleton {
  min-height: 290px;
  padding: 10px;
  border: 1px solid #e8e2dc;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}

.favorites-page__skeleton div,
.favorites-page__skeleton span {
  display: block;
  border-radius: 10px;
  background: linear-gradient(90deg, #eee9e3 25%, #f6f2ed 45%, #eee9e3 65%);
  background-size: 250% 100%;
  animation: favorites-shimmer 1.3s linear infinite;
}

.favorites-page__skeleton div {
  aspect-ratio: 1.2 / 1;
}

.favorites-page__skeleton span {
  width: 72%;
  height: 12px;
  margin-top: 13px;
}

.favorites-page__skeleton span:last-child {
  width: 45%;
  height: 9px;
  margin-top: 8px;
}

.favorites-page__state {
  min-height: 330px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 38px 20px;
  border: 1px solid #e6e0da;
  border-radius: 14px;
  background: #fff;
  text-align: center;
}

.favorites-page__state-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border-radius: 50%;
  background: #f5f1ec;
  color: #9b6b28;
}

.favorites-page__state-icon--heart {
  background: #fff7eb;
  color: #a96813;
}

.favorites-page__state h2 {
  margin: 0;
  color: #2b251f;
  font-size: 18px;
}

.favorites-page__state p {
  width: min(100%, 420px);
  margin: 8px 0 20px;
  color: #82786f;
  font-size: 12px;
  line-height: 1.55;
}

.favorites-page__state button,
.favorites-page__state a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 1px solid #2d211a;
  border-radius: 10px;
  background: #2d211a;
  color: #fff8ef;
  font: inherit;
  font-size: 11px;
  font-weight: 760;
  text-decoration: none;
  cursor: pointer;
}

.favorites-page__state--error .favorites-page__state-icon {
  background: #fff1ef;
  color: #b94a45;
}

.favorites-page__toast {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 15px;
  border-radius: 11px;
  background: #2d211a;
  color: #fff8ef;
  box-shadow: 0 14px 32px rgba(28, 16, 9, 0.18);
  font-size: 11.5px;
  font-weight: 650;
}

.favorites-toast-enter-active,
.favorites-toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.favorites-toast-enter-from,
.favorites-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes favorites-shimmer {
  to {
    background-position: -150% 0;
  }
}

@media (max-width: 920px) {
  .favorites-page__grid {
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  }
}

@media (max-width: 680px) {
  .favorites-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }

  .favorites-page__header h1 {
    font-size: 28px;
  }

  .favorites-page__header p {
    font-size: 11.5px;
  }

  .favorites-page__count {
    min-height: 28px;
  }

  .favorites-page__search {
    min-height: 46px;
    margin-bottom: 20px;
  }

  .favorites-page__section-head {
    align-items: center;
  }

  .favorites-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .favorites-page__state {
    min-height: 380px;
    padding-inline: 24px;
  }

  .favorites-page__toast {
    right: 16px;
    bottom: 84px;
  }
}

@media (max-width: 390px) {
  .favorites-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
