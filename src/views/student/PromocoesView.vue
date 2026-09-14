<template>
  <div class="promotions-page">
    <header class="promotions-page__header">
      <div>
        <span class="promotions-page__eyebrow">Ofertas vigentes</span>
        <h1>Promoções</h1>
        <p>Ofertas disponíveis no período atual.</p>
      </div>

      <RouterLink :to="{ name: 'carrinho' }" class="promotions-page__cart">
        <span class="promotions-page__cart-icon">
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="promotions-page__cart-badge">{{
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
        <ChevronRight :size="17" />
      </RouterLink>
    </header>

    <section
      v-if="!carregando && !erro && promocoesAtivas.length"
      class="promotions-page__summary"
    >
      <div>
        <span class="promotions-page__summary-icon"><Tag :size="19" /></span>
        <span>
          <small>Ofertas ativas</small>
          <strong>{{ promocoesAtivas.length }}</strong>
        </span>
      </div>
      <div>
        <span class="promotions-page__summary-icon"
          ><Percent :size="19"
        /></span>
        <span>
          <small>Maior desconto</small>
          <strong>{{ maiorDesconto }}%</strong>
        </span>
      </div>
      <div>
        <span class="promotions-page__summary-icon"
          ><CalendarClock :size="19"
        /></span>
        <span>
          <small>Atualizado</small>
          <strong>Hoje</strong>
        </span>
      </div>
    </section>

    <section
      class="promotions-page__toolbar"
      aria-label="Busca e ordenação de promoções"
    >
      <label class="promotions-page__search">
        <Search :size="18" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar produto em promoção..."
          autocomplete="off"
        />
        <button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="15" />
        </button>
      </label>

      <div class="promotions-page__sort">
        <SlidersHorizontal :size="16" />
        <select v-model="ordenacao" aria-label="Ordenar promoções">
          <option value="desconto">Maior desconto</option>
          <option value="menor-preco">Menor preço</option>
          <option value="termina-primeiro">Termina primeiro</option>
          <option value="nome">Nome A–Z</option>
        </select>
        <ChevronDown :size="14" />
      </div>
    </section>

    <div
      v-if="categoriasPromocionais.length > 1"
      class="promotions-page__categories"
    >
      <button
        type="button"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="categoriaAtiva = null"
      >
        Todas
      </button>
      <button
        v-for="categoria in categoriasPromocionais"
        :key="categoria.id"
        type="button"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="categoriaAtiva = categoria.id"
      >
        {{ categoria.nome }}
      </button>
    </div>

    <section
      class="promotions-page__content"
      aria-labelledby="promotions-title"
    >
      <div class="promotions-page__content-head">
        <div>
          <h2 id="promotions-title">Ofertas disponíveis</h2>
          <p v-if="!carregando && !erro">{{ textoContagem }}</p>
        </div>
      </div>

      <div
        v-if="carregando"
        class="promotions-page__grid"
        aria-label="Carregando promoções"
      >
        <div v-for="index in 8" :key="index" class="promotions-page__skeleton">
          <div />
          <span />
          <span />
        </div>
      </div>

      <div v-else-if="erro" class="promotions-page__state" role="alert">
        <span class="promotions-page__state-icon"
          ><CircleAlert :size="28"
        /></span>
        <h2>Não conseguimos carregar as promoções.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" @click="carregarDados">Tentar novamente</button>
      </div>

      <div v-else-if="!promocoesAtivas.length" class="promotions-page__state">
        <span class="promotions-page__state-icon"><Tag :size="28" /></span>
        <h2>Nenhuma promoção ativa agora.</h2>
        <p>O cardápio completo continua disponível normalmente.</p>
        <RouterLink
          :to="{ name: 'cardapio' }"
          class="promotions-page__state-link"
          >Ver cardápio</RouterLink
        >
      </div>

      <div
        v-else-if="!promocoesFiltradas.length"
        class="promotions-page__state"
      >
        <span class="promotions-page__state-icon"><SearchX :size="28" /></span>
        <h2>Nenhuma oferta encontrada.</h2>
        <p>Tente outra busca ou remova o filtro de categoria.</p>
        <button type="button" @click="limparFiltros">Limpar filtros</button>
      </div>

      <div v-else class="promotions-page__grid">
        <div
          v-for="item in promocoesFiltradas"
          :key="item.promocao.id"
          class="promotions-page__card-wrap"
        >
          <span v-if="item.desconto > 0" class="promotions-page__discount"
            >-{{ item.desconto }}%</span
          >
          <ProductCard
            :produto="item.produto"
            :favorito="favorites.tem(item.produto.id)"
            :favoritando="favorites.estaProcessando(item.produto.id)"
            :adicionando="produtoAdicionando === item.produto.id"
            @open="abrirProduto"
            @favorite="alternarFavorito"
            @add="adicionarRapido"
          />
          <div class="promotions-page__validity">
            <CalendarClock :size="13" />
            {{ textoValidade(item.promocao.data_fim) }}
          </div>
        </div>
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

    <Transition name="promotions-toast">
      <div
        v-if="toast"
        class="promotions-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Percent,
  Search,
  SearchX,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-vue-next";

import ProductCard from "@/components/catalog/ProductCard.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import catalogService, { promocaoEstaAtiva } from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";

const cart = useCartStore();
const favorites = useFavoritesStore();

const produtos = ref([]);
const promocoes = ref([]);
const busca = ref("");
const categoriaAtiva = ref(null);
const ordenacao = ref("desconto");
const carregando = ref(true);
const erro = ref(false);
const produtoAdicionando = ref(null);
const modalAberto = ref(false);
const carregandoDetalhe = ref(false);
const produtoDetalhado = ref(null);
const adicionandoModal = ref(false);
const detalhesCache = new Map();
const toast = ref("");
let toastTimer = null;

const promocoesAtivas = computed(() => {
  const mapaProdutos = new Map(
    produtos.value.map((produto) => [produto.id, produto]),
  );

  return promocoes.value
    .filter((promocao) => promocaoEstaAtiva(promocao))
    .map((promocao) => {
      const produtoBase = mapaProdutos.get(promocao.produto);
      if (!produtoBase) return null;

      const precoOriginal = Number(produtoBase.preco || 0);
      const precoPromocional = Number(promocao.preco_promocional || 0);
      const desconto =
        precoOriginal > precoPromocional && precoOriginal > 0
          ? Math.round(
              ((precoOriginal - precoPromocional) / precoOriginal) * 100,
            )
          : 0;

      return {
        promocao,
        desconto,
        produto: {
          ...produtoBase,
          em_promocao: true,
          preco_atual: promocao.preco_promocional,
          desconto_percentual: desconto,
        },
      };
    })
    .filter(Boolean);
});

const categoriasPromocionais = computed(() => {
  const mapa = new Map();

  promocoesAtivas.value.forEach(({ produto }) => {
    if (produto.categoria && !mapa.has(produto.categoria)) {
      mapa.set(produto.categoria, {
        id: produto.categoria,
        nome: produto.categoria_nome || "Categoria",
      });
    }
  });

  return [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
});

const promocoesFiltradas = computed(() => {
  let lista = [...promocoesAtivas.value];

  if (categoriaAtiva.value !== null) {
    lista = lista.filter(
      ({ produto }) => produto.categoria === categoriaAtiva.value,
    );
  }

  const termo = normalizarTexto(busca.value);
  if (termo) {
    lista = lista.filter(({ produto }) =>
      normalizarTexto(
        `${produto.nome || ""} ${produto.categoria_nome || ""}`,
      ).includes(termo),
    );
  }

  if (ordenacao.value === "menor-preco") {
    lista.sort(
      (a, b) => Number(a.produto.preco_atual) - Number(b.produto.preco_atual),
    );
  } else if (ordenacao.value === "termina-primeiro") {
    lista.sort((a, b) =>
      String(a.promocao.data_fim).localeCompare(String(b.promocao.data_fim)),
    );
  } else if (ordenacao.value === "nome") {
    lista.sort((a, b) =>
      String(a.produto.nome).localeCompare(String(b.produto.nome), "pt-BR"),
    );
  } else {
    lista.sort((a, b) => b.desconto - a.desconto);
  }

  return lista;
});

const maiorDesconto = computed(() =>
  Math.max(0, ...promocoesAtivas.value.map((item) => item.desconto)),
);

const textoContagem = computed(() => {
  const total = promocoesFiltradas.value.length;
  return `${total} ${total === 1 ? "oferta encontrada" : "ofertas encontradas"}`;
});

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
}

function textoValidade(dataFim) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(`${dataFim}T00:00:00`);
  const dias = Math.round((fim - hoje) / 86_400_000);

  if (dias <= 0) return "Termina hoje";
  if (dias === 1) return "Termina amanhã";
  return `Válida por mais ${dias} dias`;
}

async function carregarDados() {
  carregando.value = true;
  erro.value = false;

  try {
    const [produtosData, promocoesData] = await Promise.all([
      catalogService.listarProdutosAtivos(),
      catalogService.listarPromocoes(),
    ]);

    produtos.value = produtosData;
    promocoes.value = promocoesData;
  } catch {
    produtos.value = [];
    promocoes.value = [];
    erro.value = true;
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
  ordenacao.value = "desconto";
}

function mostrarToast(mensagem) {
  toast.value = mensagem;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2300);
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
.promotions-page {
  width: min(100%, 1240px);
  margin: 0 auto;
  color: var(--student-text);
}
.promotions-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 22px;
  margin-bottom: 18px;
}
.promotions-page__eyebrow {
  display: none;
}
.promotions-page__header h1 {
  margin: 0;
  font-size: 30px;
}
.promotions-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.promotions-page__cart {
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
}
.promotions-page__cart-icon {
  position: relative;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f3efe9;
  color: #6a4a1f;
}
.promotions-page__cart-badge {
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
.promotions-page__cart small {
  display: block;
  color: var(--student-muted);
  font-size: 9px;
}
.promotions-page__cart strong {
  font-size: 11px;
}
.promotions-page__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
  border: 1px solid var(--student-border);
  border-radius: 9px;
  background: #fff;
}
.promotions-page__summary > div {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-right: 1px solid var(--student-border);
}
.promotions-page__summary > div:last-child {
  border-right: 0;
}
.promotions-page__summary-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f5efe5;
  color: #916321;
}
.promotions-page__summary small {
  display: block;
  color: var(--student-muted);
  font-size: 9px;
}
.promotions-page__summary strong {
  display: block;
  margin-top: 2px;
  font-size: 15px;
}
.promotions-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 215px;
  gap: 10px;
  margin-bottom: 11px;
}
.promotions-page__search,
.promotions-page__sort {
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
.promotions-page__search input,
.promotions-page__sort select {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 12px;
}
.promotions-page__sort select {
  appearance: none;
}
.promotions-page__search button {
  border: 0;
  background: transparent;
  color: #8b837a;
}
.promotions-page__categories {
  display: flex;
  gap: 6px;
  margin-bottom: 22px;
  overflow: auto;
  scrollbar-width: none;
}
.promotions-page__categories::-webkit-scrollbar {
  display: none;
}
.promotions-page__categories button {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--student-border);
  border-radius: 7px;
  background: #fff;
  color: #6f675f;
  font-size: 11px;
  font-weight: 600;
}
.promotions-page__categories button.is-active {
  border-color: #c9a466;
  background: var(--student-accent-soft);
  color: #7b5117;
}
.promotions-page__content-head {
  margin-bottom: 13px;
}
.promotions-page__content-head h2 {
  margin: 0;
  font-size: 19px;
}
.promotions-page__content-head p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 11px;
}
.promotions-page__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}
.promotions-page__card-wrap {
  position: relative;
}
.promotions-page__discount {
  position: absolute;
  z-index: 4;
  left: 9px;
  top: 9px;
  padding: 4px 6px;
  border-radius: 5px;
  background: #8f5b16;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}
.promotions-page__validity {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 2px 0;
  color: var(--student-muted);
  font-size: 9px;
}
.promotions-page__skeleton {
  min-height: 310px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.promotions-page__skeleton div {
  height: 190px;
  background: #eeeae5;
}
.promotions-page__skeleton span {
  display: block;
  height: 11px;
  margin: 14px 12px 0;
  border-radius: 4px;
  background: #eeeae5;
}
.promotions-page__state {
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
.promotions-page__state-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 50%;
  background: #f3efe9;
  color: #8f672b;
}
.promotions-page__state h2 {
  margin: 0;
  font-size: 17px;
}
.promotions-page__state p {
  margin: 6px 0 14px;
  color: var(--student-muted);
  font-size: 12px;
}
.promotions-page__state button,
.promotions-page__state-link {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  background: #fff;
  color: var(--student-text);
  font-size: 11px;
  font-weight: 700;
}
.promotions-page__toast {
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
  font-size: 11px;
  font-weight: 600;
}
.promotions-toast-enter-active,
.promotions-toast-leave-active {
  transition: opacity 0.15s ease;
}
.promotions-toast-enter-from,
.promotions-toast-leave-to {
  opacity: 0;
}
@media (max-width: 1120px) {
  .promotions-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .promotions-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .promotions-page__header h1 {
    font-size: 25px;
  }
  .promotions-page__cart {
    width: 100%;
    min-width: 0;
  }
  .promotions-page__summary {
    grid-template-columns: 1fr;
  }
  .promotions-page__summary > div {
    min-height: 54px;
    border-right: 0;
    border-bottom: 1px solid var(--student-border);
  }
  .promotions-page__summary > div:last-child {
    border-bottom: 0;
  }
  .promotions-page__toolbar {
    grid-template-columns: 1fr;
  }
  .promotions-page__categories {
    margin-left: -18px;
    margin-right: -18px;
    padding: 0 18px;
  }
  .promotions-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
  .promotions-page__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
  }
}
</style>
