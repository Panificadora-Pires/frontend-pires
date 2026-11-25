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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
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

const INTERVALO_CARDAPIO_MS = 60_000;
const PRODUTOS_POR_PAGINA = 8;

const categorias = ref([]);
const produtos = ref([]);
const route = useRoute();
const router = useRouter();
const tituloProdutos = useTemplateRef("tituloProdutos");
function textoDaUrl(valor) {
  return typeof valor === "string" ? valor : "";
}
const busca = computed({
  get: () => textoDaUrl(route.query.busca),
  set: (valor) => atualizarFiltros({ busca: valor.trim() }, true),
});
function categoriaDaUrl(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
const categoriaAtiva = computed({
  get: () => categoriaDaUrl(route.query.categoria),
  set: (valor) =>
    atualizarFiltros({ categoria: valor ? String(valor) : undefined }),
});
function atualizarFiltros(alteracoes, substituir = false) {
  const query = { ...route.query, ...alteracoes };
  delete query.pagina;
  for (const chave of Object.keys(query)) {
    if (
      query[chave] === undefined ||
      query[chave] === null ||
      query[chave] === ""
    )
      delete query[chave];
  }
  return substituir ? router.replace({ query }) : router.push({ query });
}
const filtroRapido = computed({
  get: () =>
    ["promocao", "destaque"].includes(route.query.filtro)
      ? route.query.filtro
      : "todos",
  set: (valor) =>
    atualizarFiltros({ filtro: valor === "todos" ? undefined : valor }),
});
const ordenacao = computed({
  get: () =>
    ["nome", "menor-preco", "maior-preco"].includes(route.query.ordenacao)
      ? route.query.ordenacao
      : "relevancia",
  set: (valor) =>
    atualizarFiltros({ ordenacao: valor === "relevancia" ? undefined : valor }),
});
const categoriasTrilha = useTemplateRef("categoriasTrilha");
const indicadorCategoria = shallowRef({
  width: "0px",
  transform: "translateX(0px)",
});
let observerCategorias;
function alinharCategoria(revelar = false) {
  const trilha = categoriasTrilha.value;
  const ativo = trilha?.querySelector('[aria-pressed="true"]');
  indicadorCategoria.value = {
    width: `${ativo?.offsetWidth || 0}px`,
    transform: `translateX(${ativo?.offsetLeft || 0}px)`,
  };
  if (!ativo || !revelar) return;
  const inicio = ativo.offsetLeft;
  const fim = inicio + ativo.offsetWidth;
  if (
    inicio < trilha.scrollLeft ||
    fim > trilha.scrollLeft + trilha.clientWidth
  ) {
    trilha.scrollTo({
      left: inicio - (trilha.clientWidth - ativo.offsetWidth) / 2,
      behavior: movimentoReduzido() ? "instant" : "smooth",
    });
  }
}
watch(
  [categoriaAtiva, categorias],
  async () => {
    await nextTick();
    alinharCategoria(true);
  },
  { flush: "post" },
);
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
let montado = true;
const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
watch(
  () => cart.geracao,
  () => {
    fecharModal();
    carregandoDetalhe.value = false;
    produtoAdicionando.value = null;
    adicionandoModal.value = false;
    toast.value = "";
    detalhesCache.clear();
    window.clearTimeout(toastTimer);
  },
  { flush: "sync" },
);

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
const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(produtosFiltrados.value.length / PRODUTOS_POR_PAGINA)),
);
const paginaAtual = computed(() =>
  Math.min(paginaDaUrl(route.query.pagina), totalPaginas.value),
);
const inicioPagina = computed(
  () => (paginaAtual.value - 1) * PRODUTOS_POR_PAGINA,
);
const produtosPagina = computed(() =>
  produtosFiltrados.value.slice(
    inicioPagina.value,
    inicioPagina.value + PRODUTOS_POR_PAGINA,
  ),
);
const resumoPagina = computed(
  () =>
    `${inicioPagina.value + 1}–${Math.min(inicioPagina.value + PRODUTOS_POR_PAGINA, produtosFiltrados.value.length)} de ${produtosFiltrados.value.length}`,
);

watch(
  [() => route.query.pagina, totalPaginas, carregando, erro],
  () => {
    if (carregando.value || erro.value || route.query.pagina === undefined)
      return;
    const canonica =
      paginaAtual.value > 1 ? String(paginaAtual.value) : undefined;
    if (route.query.pagina === canonica) return;
    const query = { ...route.query };
    if (canonica) query.pagina = canonica;
    else delete query.pagina;
    router.replace({ query });
  },
  { immediate: true },
);

async function mudarPagina(numero) {
  if (numero < 1 || numero > totalPaginas.value || numero === paginaAtual.value)
    return;
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

  const contexto = cart.capturarContexto();
  const detalhe = await catalogService.obterProduto(produto.id);
  if (contextoAtual(contexto)) detalhesCache.set(produto.id, detalhe);
  return detalhe;
}

async function abrirProduto(produto) {
  const contexto = cart.capturarContexto();
  toast.value = "";
  modalAberto.value = true;
  carregandoDetalhe.value = true;
  produtoDetalhado.value = null;

  try {
    const detalhe = await obterDetalhes(produto);
    if (contextoAtual(contexto)) produtoDetalhado.value = detalhe;
  } catch {
    if (contextoAtual(contexto)) produtoDetalhado.value = null;
  } finally {
    if (contextoAtual(contexto)) carregandoDetalhe.value = false;
  }
}

function fecharModal() {
  modalAberto.value = false;
  produtoDetalhado.value = null;
}

async function adicionarRapido(produto) {
  if (produtoAdicionando.value) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;
  produtoAdicionando.value = produto.id;

  try {
    const detalhe = await obterDetalhes(produto);
    if (!contextoAtual(contexto)) return;
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

    if (!cart.adicionar({ ...produto, ...detalhe }, 1, contexto)) return;
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
  } catch {
    if (contextoAtual(contexto))
      mostrarToast("Não foi possível verificar a disponibilidade do produto.");
  } finally {
    if (contextoAtual(contexto)) produtoAdicionando.value = null;
  }
}

async function adicionarDoModal({ produto, quantidade }) {
  if (!produto || adicionandoModal.value) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;
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

    if (!cart.adicionar(produto, quantidade, contexto)) return;
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
    fecharModal();
  } finally {
    adicionandoModal.value = false;
  }
}

function limparFiltros() {
  atualizarFiltros(
    {
      busca: undefined,
      categoria: undefined,
      filtro: undefined,
      ordenacao: undefined,
    },
    true,
  );
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
  montado = false;
  window.clearTimeout(toastTimer);
  observerCategorias?.disconnect();
});
</script>
<style scoped src="./CardapioView.css"></style>
