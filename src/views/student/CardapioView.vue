<template>
  <div class="menu-page">
    <header class="menu-page__header">
      <div>
        <h1>Cardápio</h1>
        <p>Escolha seu lanche</p>
      </div>
      <label class="menu-page__search">
        <Search :size="20" aria-hidden="true" />
        <input v-model="busca" type="search" aria-label="Buscar no cardápio"
          placeholder="Buscar no cardápio" autocomplete="off" />
        <button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''">
          <X :size="18" aria-hidden="true" />
        </button>
      </label>
    </header>

    <section class="menu-page__toolbar" aria-label="Busca e filtros">
      <div ref="categoriasTrilha" class="menu-page__categories" role="group" aria-label="Filtrar por categoria">
        <div class="menu-page__category-track">
          <button type="button" :class="{ 'is-active': categoriaAtiva === null }"
            :aria-pressed="categoriaAtiva === null" @click="categoriaAtiva = null">Todos</button>
          <button v-for="categoria in categorias" :key="categoria.id" type="button"
            :class="{ 'is-active': categoriaAtiva === categoria.id }"
            :aria-pressed="categoriaAtiva === categoria.id" @click="categoriaAtiva = categoria.id">
            {{ categoria.nome }}
          </button>
          <span class="menu-page__category-indicator" :style="indicadorCategoria" aria-hidden="true" />
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

    <section class="menu-page__content" aria-labelledby="menu-page-products-title" :aria-busy="carregando">
      <div class="menu-page__content-head">
        <div>
          <h2 ref="tituloProdutos" id="menu-page-products-title" tabindex="-1">{{ temFiltros ? tituloResultados : (textoContagem || 'Produtos') }}</h2>
          <p v-if="temFiltros && !carregando && !erro" role="status">{{ textoContagem }}</p>
        </div>
        <button v-if="temFiltros" type="button" class="menu-page__clear" @click="limparFiltros">Limpar filtros</button>
      </div>

      <div v-if="carregando" class="menu-page__grid" aria-label="Carregando cardápio">
        <div v-for="index in 8" :key="index" class="menu-page__skeleton" aria-hidden="true"><div /><span /><span /></div>
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
        <button v-if="temFiltros" type="button" @click="limparFiltros">Ver todos os produtos</button>
      </div>
      <div v-else :key="`${categoriaAtiva ?? 'todos'}-${paginaAtual}`" class="menu-page__grid menu-page__grid--products">
        <ProductCard v-for="produto in produtosPagina" :key="produto.id" :produto="produto"
          :favorito="favorites.tem(produto.id)" :favoritando="favorites.estaProcessando(produto.id)"
          :adicionando="produtoAdicionando === produto.id"
          @open="abrirProduto" @favorite="alternarFavorito" @add="adicionarRapido" />
      </div>
      <nav v-if="!carregando && !erro && totalPaginas > 1" class="menu-page__pagination" aria-label="Páginas do cardápio">
        <p role="status" aria-atomic="true">{{ resumoPagina }}</p>
        <div class="menu-page__pages">
          <button type="button" :disabled="paginaAtual === 1" @click="mudarPagina(paginaAtual - 1)">Anterior</button>
          <button v-for="numero in totalPaginas" :key="numero" type="button" :aria-label="`Página ${numero}`"
            :aria-current="paginaAtual === numero ? 'page' : undefined" @click="mudarPagina(numero)">{{ numero }}</button>
          <button type="button" :disabled="paginaAtual === totalPaginas" @click="mudarPagina(paginaAtual + 1)">Próxima</button>
        </div>
      </nav>
    </section>

    <ProductDetailsModal :open="modalAberto" :produto="produtoDetalhado" :loading="carregandoDetalhe" :adding="adicionandoModal" :feedback="toast"
      :favorito="Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))"
      :favoritando="Boolean(produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id))"
      @close="fecharModal" @favorite="alternarFavorito" @add="adicionarDoModal" />
    <Transition name="menu-toast">
      <div v-if="toast" class="menu-page__toast" role="status" aria-live="polite">
        <CheckCircle2 :size="18" aria-hidden="true" />{{ toast }}
      </div>
    </Transition>
  </div>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

const cart = useCartStore();
const favorites = useFavoritesStore();

// Estoque e disponibilidade mudam a cada pedido; o cardápio confere a cada minuto.
const INTERVALO_CARDAPIO_MS = 60_000;
const PRODUTOS_POR_PAGINA = 8;

const categorias = ref([]);
const produtos = ref([]);
const route = useRoute();
// A busca do menu do topo chega por /cardapio?busca=termo.
const router = useRouter();
const tituloProdutos = useTemplateRef("tituloProdutos");
function textoDaUrl(valor) { return typeof valor === "string" ? valor : ""; }
const busca = computed({
  get: () => textoDaUrl(route.query.busca),
  set: (valor) => atualizarFiltros({ busca: valor.trim() }, true),
});
// O mega menu usa o filtro existente por id, sem criar uma nova página.
function categoriaDaUrl(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
const categoriaAtiva = computed({
  get: () => categoriaDaUrl(route.query.categoria),
  set: (valor) => atualizarFiltros({ categoria: valor ? String(valor) : undefined }),
});
// Um único replace evita que limpar os dois filtros restaure parte da URL anterior.
function atualizarFiltros(alteracoes, substituir = false) {
  const query = { ...route.query, ...alteracoes };
  delete query.pagina;
  for (const chave of Object.keys(query)) {
    if (query[chave] === undefined || query[chave] === null || query[chave] === "") delete query[chave];
  }
  return substituir ? router.replace({ query }) : router.push({ query });
}
const filtroRapido = computed({
  get: () => ["promocao", "destaque"].includes(route.query.filtro) ? route.query.filtro : "todos",
  set: (valor) => atualizarFiltros({ filtro: valor === "todos" ? undefined : valor }),
});
const ordenacao = computed({
  get: () => ["nome", "menor-preco", "maior-preco"].includes(route.query.ordenacao) ? route.query.ordenacao : "relevancia",
  set: (valor) => atualizarFiltros({ ordenacao: valor === "relevancia" ? undefined : valor }),
});
const categoriasTrilha = useTemplateRef("categoriasTrilha");
const indicadorCategoria = shallowRef({ width: "0px", transform: "translateX(0px)" });
let observerCategorias;
function alinharCategoria(revelar = false) {
  const trilha = categoriasTrilha.value;
  const ativo = trilha?.querySelector('[aria-pressed="true"]');
  indicadorCategoria.value = { width: `${ativo?.offsetWidth || 0}px`, transform: `translateX(${ativo?.offsetLeft || 0}px)` };
  if (!ativo || !revelar) return;
  const inicio = ativo.offsetLeft;
  const fim = inicio + ativo.offsetWidth;
  if (inicio < trilha.scrollLeft || fim > trilha.scrollLeft + trilha.clientWidth) {
    trilha.scrollTo({ left: inicio - (trilha.clientWidth - ativo.offsetWidth) / 2, behavior: movimentoReduzido() ? "instant" : "smooth" });
  }
}
watch([categoriaAtiva, categorias], async () => { await nextTick(); alinharCategoria(true); }, { flush: "post" });
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

function paginaDaUrl(valor) {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) return 1;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : 1;
}
const totalPaginas = computed(() => Math.max(1, Math.ceil(produtosFiltrados.value.length / PRODUTOS_POR_PAGINA)));
const paginaAtual = computed(() => Math.min(paginaDaUrl(route.query.pagina), totalPaginas.value));
const inicioPagina = computed(() => (paginaAtual.value - 1) * PRODUTOS_POR_PAGINA);
const produtosPagina = computed(() => produtosFiltrados.value.slice(inicioPagina.value, inicioPagina.value + PRODUTOS_POR_PAGINA));
const resumoPagina = computed(() => `${inicioPagina.value + 1}–${Math.min(inicioPagina.value + PRODUTOS_POR_PAGINA, produtosFiltrados.value.length)} de ${produtosFiltrados.value.length}`);

// Só limitar uma entrada quando a listagem já confirmou a quantidade de resultados.
watch([() => route.query.pagina, totalPaginas, carregando, erro], () => {
  if (carregando.value || erro.value || route.query.pagina === undefined) return;
  const canonica = paginaAtual.value > 1 ? String(paginaAtual.value) : undefined;
  if (route.query.pagina === canonica) return;
  const query = { ...route.query };
  if (canonica) query.pagina = canonica;
  else delete query.pagina;
  router.replace({ query });
}, { immediate: true });

async function mudarPagina(numero) {
  if (numero < 1 || numero > totalPaginas.value || numero === paginaAtual.value) return;
  // Alinhar a grade antes da captura evita somar rolagem suave à transição horizontal.
  tituloProdutos.value?.scrollIntoView({ block: "start", behavior: "instant" });
  const query = { ...route.query };
  if (numero > 1) query.pagina = String(numero);
  else delete query.pagina;
  await router.push({ query });
  await nextTick();
  tituloProdutos.value?.focus({ preventScroll: true });
}

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
  return `${total} ${total === 1 ? "produto" : "produtos"}`;
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

// `carregando` só vale para a primeira carga; as seguintes são silenciosas e,
// se falharem, mantêm o cardápio que já está na tela.
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
    // Detalhes guardados podem ter estoque antigo.
    detalhesCache.clear();
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

async function obterDetalhes(produto) {
  if (!produto?.id) return null;
  if (detalhesCache.has(produto.id)) return detalhesCache.get(produto.id);

  const detalhe = await catalogService.obterProduto(produto.id);
  detalhesCache.set(produto.id, detalhe);
  return detalhe;
}

async function abrirProduto(produto) {
  toast.value = "";
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
  atualizarFiltros({ busca: undefined, categoria: undefined, filtro: undefined, ordenacao: undefined }, true);
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
  observerCategorias = new ResizeObserver(() => alinharCategoria());
  observerCategorias.observe(categoriasTrilha.value);
  document.fonts.ready.then(() => alinharCategoria());
  alinharCategoria();
});

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer);
  observerCategorias?.disconnect();
});
</script>
<style scoped>
.menu-page { --pp-home-action-duration: 450ms; width: min(100%, 1160px); margin: 0 auto; color: var(--pp-marrom); }
.menu-page__header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--pp-space-4); margin-bottom: var(--pp-space-4); }
.menu-page__header h1 { margin: 0; font: 400 clamp(50px, 7vw, 92px)/1.08 var(--pp-font-titulo); letter-spacing: -.025em; }
.menu-page__header p { margin: 7px 0 0; color: var(--pp-dourado-profundo); font: 700 28px/1.2 var(--pp-font-nota); }
.menu-page__search { display: flex; align-items: center; gap: 10px; width: min(310px, 100%); min-height: 48px; padding: 5px 0; border-bottom: 1px solid var(--pp-texto-3); color: var(--pp-texto-2); }
.menu-page__search > svg { flex: none; }
.menu-page__search input { width: 100%; min-width: 0; flex: 1; min-height: 38px; padding: 4px 2px; border: 0; outline: 0; background: transparent; color: var(--pp-marrom); font: 400 15px/1.5 var(--pp-font-body); }
.menu-page__search input::placeholder { color: var(--pp-texto-2); opacity: 1; }
.menu-page__search input::-webkit-search-cancel-button { display: none; }
.menu-page__search button { display: grid; place-items: center; flex: none; width: 44px; height: 44px; margin-block: -3px; padding: 0; border: 0; background: transparent; color: var(--pp-marrom); cursor: pointer; }
.menu-page__toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "categories quick sort"; gap: 8px 20px; align-items: center; border-bottom: 1px solid var(--pp-creme-borda); }
.menu-page__categories { grid-area: categories; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.menu-page__categories::-webkit-scrollbar { display: none; }
.menu-page__category-track { position: relative; display: flex; gap: clamp(16px, 3vw, 38px); width: max-content; min-width: 100%; }
.menu-page__categories button { flex: none; min-height: 44px; padding: 0 3px; border: 0; background: transparent; color: var(--pp-marrom); font: 400 15px/1.5 var(--pp-font-body); cursor: pointer; }
.menu-page__categories button.is-active { font-weight: 700; }
.menu-page__category-indicator { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--pp-dourado-escuro); pointer-events: none; transition: transform 220ms var(--pp-ease), width 220ms var(--pp-ease); }
.menu-page__sort, .menu-page__mobile-filter { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 44px; }
.menu-page__sort { grid-area: sort; }
.menu-page__sort select, .menu-page__mobile-filter select { width: 100%; min-width: 0; min-height: 44px; border: 0; outline: 0; appearance: none; background: transparent; color: var(--pp-marrom); font: 400 14px/1.5 var(--pp-font-body); cursor: pointer; }
.menu-page__sort > svg, .menu-page__mobile-filter > svg { flex: none; pointer-events: none; }
.menu-page__filter-row { grid-area: quick; min-width: 0; }
.menu-page__content { min-width: 0; }
.menu-page__content-head { display: flex; justify-content: space-between; align-items: center; gap: var(--pp-space-2); min-width: 0; min-height: 48px; }
.menu-page__content-head > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; min-width: 0; }
.menu-page__content-head h2 { margin: 0; font: 400 14px/1.5 var(--pp-font-body); color: var(--pp-texto-2); overflow-wrap: anywhere; scroll-margin-top: calc(var(--pp-altura-topo) + var(--pp-space-3)); }
.menu-page__content-head p { margin: 0; color: var(--pp-texto-2); font-size: 14px; line-height: 1.5; }
.menu-page__clear { flex: none; min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--pp-dourado-profundo); font: 600 13px/1.5 var(--pp-font-body); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.menu-page__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: stretch; gap: 24px 16px; }
/* Acabamento restrito ao Card?pio; Home e demais consumidores preservam suas variantes. */
.menu-page :deep(.product-card) { display: grid; grid-template-columns: minmax(0, 1fr) 44px; grid-template-rows: auto 1fr auto; column-gap: 10px; row-gap: 4px; padding: 0 0 12px; border: 0; border-bottom: 1px solid var(--pp-creme-borda); border-radius: 0; background: transparent; color: var(--pp-marrom); box-shadow: none; }
.menu-page :deep(.product-card__media-button) { grid-column: 1 / -1; grid-row: 1; border-radius: 0; }
.menu-page :deep(.catalog-product-image--card) { aspect-ratio: 1.18; }
.menu-page :deep(.product-card__copy) { grid-column: 1; grid-row: 2; align-self: start; padding: 7px 0 0; }
.menu-page :deep(.product-card__category) { display: none; }
.menu-page :deep(.product-card h2) { margin: 0; min-height: 0; font: 700 15px/1.45 var(--pp-font-body); letter-spacing: 0; overflow-wrap: anywhere; }
.menu-page :deep(.product-card__footer) { display: contents; }
.menu-page :deep(.product-card__prices) { grid-column: 1; grid-row: 3; align-self: end; }
.menu-page :deep(.product-card__prices strong) { font-size: 14px; font-weight: 400; line-height: 1.5; color: var(--pp-texto-2); }
.menu-page :deep(.product-card__old-price) { color: var(--pp-texto-2); font-size: 12px; }
.menu-page :deep(.product-card__favorite) { width: 44px; height: 44px; top: 4px; right: 4px; border: 0; box-shadow: none; }
.menu-page :deep(.product-card__add) { grid-column: 2; grid-row: 2 / 4; align-self: start; width: 44px; height: 44px; margin-top: 7px; border: 1px solid var(--pp-texto-3); background: transparent; color: var(--pp-marrom); }
.menu-page :deep(.product-card__badge) { left: 4px; top: 4px; max-width: calc(100% - 56px); font-size: 10px; padding: 5px 7px; }
.menu-page__pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
.menu-page__pagination p { margin: 0; color: var(--pp-texto-2); font-size: 14px; font-variant-numeric: tabular-nums; }
.menu-page__pages { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.menu-page__pages button { min-width: 44px; min-height: 44px; padding: 0 6px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--pp-marrom); font: 400 14px/1.5 var(--pp-font-body); cursor: pointer; }
.menu-page__pages button[aria-current="page"] { border-bottom-color: var(--pp-dourado-escuro); font-weight: 700; }
.menu-page__pages button:disabled { opacity: .45; cursor: default; }
.menu-page__skeleton { padding-bottom: 12px; }
.menu-page__skeleton div { aspect-ratio: 1.18; background: var(--pp-creme-2); }
.menu-page__skeleton span { display: block; height: 14px; margin: 12px 0; background: var(--pp-creme-2); }
.menu-page__skeleton span:last-child { width: 45%; }
.menu-page__state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 24px; text-align: center; }
.menu-page__state > svg { color: var(--pp-texto-2); }
.menu-page__state h2 { margin: 0; font: 600 22px/1.4 var(--pp-font-body); }
.menu-page__state p { max-width: 65ch; margin: 0; color: var(--pp-texto-2); font-size: 16px; line-height: 1.6; }
.menu-page__state button { min-height: 44px; padding: 12px 24px; border: 1px solid var(--pp-creme-borda); border-radius: var(--pp-radius-btn); background: var(--pp-creme-2); color: var(--pp-marrom); font: 600 14px/1.5 var(--pp-font-body); cursor: pointer; }
.menu-page__toast { position: fixed; z-index: 90; bottom: 28px; left: 50%; display: flex; align-items: center; gap: 8px; width: max-content; max-width: calc(100vw - 32px); padding: 12px 24px; border-radius: var(--pp-radius-btn); background: var(--pp-marrom); color: var(--pp-creme); font-size: 14px; line-height: 1.5; transform: translateX(-50%); }
.menu-page button:focus-visible, .menu-page a:focus-visible, .menu-page :deep(.product-card button:focus-visible), .menu-page__content-head h2:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 3px; }
.menu-page__categories button:focus-visible { outline-offset: -3px; }
.menu-page__search:focus-within, .menu-page__sort:focus-within, .menu-page__mobile-filter:focus-within { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 2px; }
.menu-toast-enter-active, .menu-toast-leave-active { transition: opacity 180ms var(--pp-ease); }
.menu-toast-enter-from, .menu-toast-leave-to { opacity: 0; }
@media (hover: hover) {
  .menu-page :deep(.product-card__copy:hover h2) { text-decoration: underline; text-underline-offset: 3px; }
  .menu-page__pages button:hover:not(:disabled):not([aria-current="page"]) { border-bottom-color: var(--pp-creme-borda); }
}
@media (max-width: 1100px) { .menu-page__toolbar { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "categories categories" "quick sort"; gap: 0 12px; } }
@media (min-width: 761px) and (max-width: 1000px) { .menu-page__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) {
  .menu-page__header { display: grid; gap: 12px; margin-bottom: 10px; }
  .menu-page__header h1 { font-size: clamp(50px, 12vw, 70px); }
  .menu-page__header p { font-size: 23px; }
  .menu-page__search { width: 100%; }
  .menu-page__category-track { gap: 17px; }
  .menu-page__content-head { min-height: 48px; }
  .menu-page__clear { font-size: 12px; }
  .menu-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }
  .menu-page :deep(.product-card) { column-gap: 6px; }
  .menu-page :deep(.product-card h2) { font-size: 14px; }
  .menu-page__toast { bottom: calc(64px + 80px + env(safe-area-inset-bottom)); }
  .menu-page__pagination { flex-direction: column; align-items: flex-start; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .menu-page__category-indicator, .menu-toast-enter-active, .menu-toast-leave-active { transition: none; }
  .menu-page :deep(.product-card), .menu-page :deep(.product-card__media-button img), .menu-page :deep(.product-card__media-button svg) { transition: none; transform: none; }
}
</style>
