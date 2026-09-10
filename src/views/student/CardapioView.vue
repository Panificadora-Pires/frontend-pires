<template>
  <div class="menu-page">
    <header class="menu-page__header">
      <div>
        <span class="menu-page__eyebrow">Pires Panificadora</span>
        <h1>Cardápio</h1>
        <p>Consulte os produtos disponíveis e adicione itens ao carrinho.</p>
      </div>

      <RouterLink :to="{ name: 'carrinho' }" class="menu-page__cart-summary">
        <span class="menu-page__cart-icon">
          <ShoppingCart :size="20" />
          <span v-if="cart.totalItens" class="menu-page__cart-badge">{{
            limitarBadge(cart.totalItens)
          }}</span>
        </span>
        <span>
          <small>Meu carrinho</small>
          <strong>{{
            cart.totalItens
              ? `${cart.totalItens} ${cart.totalItens === 1 ? "item" : "itens"}`
              : "Está vazio"
          }}</strong>
        </span>
        <ChevronRight :size="18" />
      </RouterLink>
    </header>

    <section class="menu-page__toolbar" aria-label="Busca e filtros">
      <label class="menu-page__search">
        <Search :size="19" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar por produto ou categoria..."
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

      <div class="menu-page__sort">
        <SlidersHorizontal :size="17" aria-hidden="true" />
        <select v-model="ordenacao" aria-label="Ordenar produtos">
          <option value="relevancia">Relevância</option>
          <option value="nome">Nome A–Z</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select>
        <ChevronDown :size="15" aria-hidden="true" />
      </div>
    </section>

    <nav class="menu-page__categories" aria-label="Filtrar por categoria">
      <button
        type="button"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="categoriaAtiva = null"
      >
        <LayoutGrid :size="17" />
        Todos
      </button>

      <button
        v-for="categoria in categorias"
        :key="categoria.id"
        type="button"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="categoriaAtiva = categoria.id"
      >
        {{ categoria.nome }}
      </button>
    </nav>

    <div class="menu-page__filter-row">
      <div class="menu-page__quick-filters" aria-label="Filtros rápidos">
        <button
          type="button"
          :class="{ 'is-active': filtroRapido === 'todos' }"
          @click="filtroRapido = 'todos'"
        >
          Todos os produtos
        </button>
        <button
          type="button"
          :class="{ 'is-active': filtroRapido === 'promocao' }"
          @click="filtroRapido = 'promocao'"
        >
          <Tag :size="14" /> Em promoção
        </button>
        <button
          type="button"
          :class="{ 'is-active': filtroRapido === 'destaque' }"
          @click="filtroRapido = 'destaque'"
        >
          <Sparkles :size="14" /> Destaques
        </button>
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

    <section
      class="menu-page__content"
      aria-labelledby="menu-page-products-title"
    >
      <div class="menu-page__content-head">
        <div>
          <h2 id="menu-page-products-title">{{ tituloResultados }}</h2>
          <p v-if="!carregando">{{ textoContagem }}</p>
        </div>

        <span
          v-if="!carregando && produtosFiltrados.length"
          class="menu-page__result-badge"
        >
          {{ produtosFiltrados.length }}
        </span>
      </div>

      <div
        v-if="carregando"
        class="menu-page__grid"
        aria-label="Carregando cardápio"
      >
        <div
          v-for="index in 10"
          :key="index"
          class="menu-page__skeleton"
          aria-hidden="true"
        >
          <div />
          <span />
          <span />
        </div>
      </div>

      <div
        v-else-if="erro"
        class="menu-page__state menu-page__state--error"
        role="alert"
      >
        <span class="menu-page__state-icon"><CircleAlert :size="28" /></span>
        <div>
          <h2>Não conseguimos carregar o cardápio.</h2>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
        <button type="button" @click="carregarDados">Tentar novamente</button>
      </div>

      <div v-else-if="!produtosFiltrados.length" class="menu-page__state">
        <span class="menu-page__state-icon"><SearchX :size="28" /></span>
        <div>
          <h2>Nenhum produto encontrado.</h2>
          <p>Tente outra busca ou remova alguns filtros.</p>
        </div>
        <button v-if="temFiltros" type="button" @click="limparFiltros">
          Ver todos os produtos
        </button>
      </div>

      <div v-else class="menu-page__grid">
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

    <Transition name="menu-toast">
      <div
        v-if="toast"
        class="menu-page__toast"
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  LayoutGrid,
  Search,
  SearchX,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";

const cart = useCartStore();
const favorites = useFavoritesStore();

const categorias = ref([]);
const produtos = ref([]);
const busca = ref("");
const categoriaAtiva = ref(null);
const filtroRapido = ref("todos");
const ordenacao = ref("relevancia");
const detalhesCache = new Map();

const carregando = ref(true);
const erro = ref(false);
const modalAberto = ref(false);
const carregandoDetalhe = ref(false);
const produtoDetalhado = ref(null);
const produtoAdicionando = ref(null);
const adicionandoModal = ref(false);
const toast = ref("");
let toastTimer = null;

const temFiltros = computed(() =>
  Boolean(
    busca.value.trim() ||
    categoriaAtiva.value !== null ||
    filtroRapido.value !== "todos" ||
    ordenacao.value !== "relevancia",
  ),
);

const produtosFiltrados = computed(() => {
  let lista = [...produtos.value];

  if (categoriaAtiva.value !== null) {
    lista = lista.filter(
      (produto) => produto.categoria === categoriaAtiva.value,
    );
  }

  if (filtroRapido.value === "promocao") {
    lista = lista.filter((produto) => produto.em_promocao);
  } else if (filtroRapido.value === "destaque") {
    lista = lista.filter((produto) => produto.destaque);
  }

  const termo = normalizarTexto(busca.value);
  if (termo) {
    lista = lista.filter((produto) => {
      const alvo = normalizarTexto(
        `${produto.nome || ""} ${produto.categoria_nome || ""}`,
      );
      return alvo.includes(termo);
    });
  }

  if (ordenacao.value === "nome") {
    lista.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
    );
  } else if (ordenacao.value === "menor-preco") {
    lista.sort((a, b) => precoProduto(a) - precoProduto(b));
  } else if (ordenacao.value === "maior-preco") {
    lista.sort((a, b) => precoProduto(b) - precoProduto(a));
  } else {
    lista.sort((a, b) => {
      const scoreA =
        Number(Boolean(a.destaque)) * 2 + Number(Boolean(a.em_promocao));
      const scoreB =
        Number(Boolean(b.destaque)) * 2 + Number(Boolean(b.em_promocao));
      if (scoreA !== scoreB) return scoreB - scoreA;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });
  }

  return lista;
});

const tituloResultados = computed(() => {
  const categoria = categorias.value.find(
    (item) => item.id === categoriaAtiva.value,
  );

  if (busca.value.trim()) return `Resultados para “${busca.value.trim()}”`;
  if (filtroRapido.value === "promocao") return "Produtos em promoção";
  if (filtroRapido.value === "destaque") return "Destaques da Pires";
  if (categoria) return categoria.nome;
  return "Todos os produtos";
});

const textoContagem = computed(() => {
  const total = produtosFiltrados.value.length;
  if (!total) return "";
  return `${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"}`;
});

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function precoProduto(produto) {
  return Number(produto?.preco_atual ?? produto?.preco ?? 0);
}

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
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

async function carregarDados() {
  carregando.value = true;
  erro.value = false;

  try {
    const [categoriasData, produtosData] = await Promise.all([
      catalogService.listarCategoriasAtivas(),
      catalogService.listarProdutosAtivos(),
    ]);

    categorias.value = categoriasData;
    produtos.value = produtosData;
  } catch {
    erro.value = true;
    categorias.value = [];
    produtos.value = [];
  } finally {
    carregando.value = false;
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
  if (produtoAdicionando.value) return;
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

function limparFiltros() {
  busca.value = "";
  categoriaAtiva.value = null;
  filtroRapido.value = "todos";
  ordenacao.value = "relevancia";
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
  carregarDados();
});

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
.menu-page {
  width: min(100%, 1240px);
  margin: 0 auto;
  color: var(--student-text);
}
.menu-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 22px;
  margin-bottom: 22px;
}
.menu-page__eyebrow {
  display: none;
}
.menu-page__header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
}
.menu-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.menu-page__cart-summary {
  min-width: 188px;
  height: 52px;
  display: grid;
  grid-template-columns: 36px 1fr 16px;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: var(--student-text);
}
.menu-page__cart-icon {
  position: relative;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f3efe9;
  color: #6a4a1f;
}
.menu-page__cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--student-accent);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}
.menu-page__cart-summary small {
  display: block;
  color: var(--student-muted);
  font-size: 9px;
}
.menu-page__cart-summary strong {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  font-weight: 700;
}
.menu-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 205px;
  gap: 10px;
  margin-bottom: 12px;
}
.menu-page__search,
.menu-page__sort {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #867e76;
}
.menu-page__search:focus-within {
  border-color: #c9a466;
  box-shadow: 0 0 0 3px rgba(184, 121, 31, 0.07);
}
.menu-page__search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 12px;
}
.menu-page__search button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  background: transparent;
  color: #8b837a;
  cursor: pointer;
}
.menu-page__sort select {
  width: 100%;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 11px;
}
.menu-page__categories,
.menu-page__quick-filters {
  display: flex;
  gap: 6px;
  overflow: auto;
  scrollbar-width: none;
}
.menu-page__categories::-webkit-scrollbar,
.menu-page__quick-filters::-webkit-scrollbar {
  display: none;
}
.menu-page__categories {
  margin-bottom: 10px;
}
.menu-page__categories button,
.menu-page__quick-filters button {
  flex: 0 0 auto;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid var(--student-border);
  border-radius: 7px;
  background: #fff;
  color: #6f675f;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.menu-page__categories button.is-active,
.menu-page__quick-filters button.is-active {
  border-color: #c9a466;
  background: var(--student-accent-soft);
  color: #7b5117;
}
.menu-page__filter-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 24px;
}
.menu-page__clear {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #87591a;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.menu-page__content-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
}
.menu-page__content-head h2 {
  margin: 0;
  font-size: 19px;
}
.menu-page__content-head p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 11px;
}
.menu-page__result-badge {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #eee9e2;
  color: #655d55;
  font-size: 10px;
  font-weight: 700;
}
.menu-page__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}
.menu-page__skeleton {
  min-height: 310px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.menu-page__skeleton div {
  height: 190px;
  background: linear-gradient(90deg, #eeeae5, #f7f5f2, #eeeae5);
  background-size: 200% 100%;
  animation: menu-shimmer 1.2s infinite;
}
.menu-page__skeleton span {
  display: block;
  height: 11px;
  margin: 14px 12px 0;
  border-radius: 4px;
  background: #eeeae5;
}
.menu-page__skeleton span:last-child {
  width: 55%;
  margin-top: 8px;
}
.menu-page__state {
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.menu-page__state-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 50%;
  background: #f3efe9;
  color: #8f672b;
}
.menu-page__state h2 {
  margin: 0;
  font-size: 17px;
}
.menu-page__state p {
  margin: 6px 0 14px;
  color: var(--student-muted);
  font-size: 12px;
}
.menu-page__state button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  background: #fff;
  color: var(--student-text);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.menu-page__toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 13px;
  border: 1px solid #cadbcd;
  border-radius: 8px;
  background: #f4faf5;
  color: #33583a;
  box-shadow: 0 10px 30px rgba(30, 40, 30, 0.1);
  font-size: 11px;
  font-weight: 600;
}
.menu-toast-enter-active,
.menu-toast-leave-active {
  transition: opacity 0.15s ease;
}
.menu-toast-enter-from,
.menu-toast-leave-to {
  opacity: 0;
}
@keyframes menu-shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 1120px) {
  .menu-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .menu-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .menu-page__header h1 {
    font-size: 25px;
  }
  .menu-page__cart-summary {
    width: 100%;
    min-width: 0;
  }
  .menu-page__toolbar {
    grid-template-columns: 1fr;
  }
  .menu-page__sort {
    width: 100%;
  }
  .menu-page__categories,
  .menu-page__filter-row {
    margin-left: -18px;
    margin-right: -18px;
    padding-left: 18px;
    padding-right: 18px;
  }
  .menu-page__filter-row {
    display: block;
  }
  .menu-page__quick-filters {
    margin-right: -18px;
    padding-right: 18px;
  }
  .menu-page__clear {
    margin-top: 9px;
  }
  .menu-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
  .menu-page__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
  }
}
</style>
