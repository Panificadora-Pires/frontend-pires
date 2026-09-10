<template>
  <div class="home">
    <header class="home__header">
      <div class="home__greeting-row">
        <div class="home__greeting">
          <h1>{{ saudacao }}, {{ primeiroNome }}!</h1>
          <p>Confira o cardápio e acompanhe seus pedidos.</p>
        </div>

        <RouterLink
          :to="{ name: 'perfil' }"
          class="home__mobile-avatar"
          aria-label="Abrir perfil"
        >
          <img
            v-if="avatarDisponivel"
            :src="auth.usuario.avatar"
            :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
            @error="avatarComErro = true"
          />
          <template v-else>{{ iniciais }}</template>
        </RouterLink>
      </div>

      <label class="home__search">
        <Search :size="19" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar produtos, categorias..."
          aria-label="Buscar produtos e categorias"
        />
      </label>

      <div class="home__actions">
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="home__icon-btn"
          aria-label="Notificações"
        >
          <Bell :size="20" />
          <span v-if="notifications.naoLidas" class="home__badge">{{
            limitarBadge(notifications.naoLidas)
          }}</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'carrinho' }"
          class="home__icon-btn"
          aria-label="Carrinho"
        >
          <ShoppingCart :size="20" />
          <span v-if="cart.totalItens" class="home__badge">{{
            limitarBadge(cart.totalItens)
          }}</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'perfil' }"
          class="home__avatar"
          aria-label="Abrir perfil"
        >
          <img
            v-if="avatarDisponivel"
            :src="auth.usuario.avatar"
            :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
            @error="avatarComErro = true"
          />
          <template v-else>{{ iniciais }}</template>
        </RouterLink>
      </div>
    </header>

    <nav class="home__categories" aria-label="Categorias do cardápio">
      <button
        type="button"
        class="home__category"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="selecionarCategoria(null)"
      >
        <LayoutGrid :size="18" aria-hidden="true" />
        <span>Todos</span>
      </button>

      <button
        v-for="categoria in categorias"
        :key="categoria.id"
        type="button"
        class="home__category"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="selecionarCategoria(categoria.id)"
      >
        <component
          :is="iconeParaCategoria(categoria.slug || categoria.nome)"
          :size="18"
          aria-hidden="true"
        />
        <span>{{ categoria.nome }}</span>
      </button>
    </nav>

    <section class="home__hero" aria-label="Destaque do dia">
      <div
        v-if="carregandoPromos || carregandoProdutos"
        class="home__hero-card home__skeleton"
        aria-hidden="true"
      />

      <template v-else-if="promoDestaque">
        <Transition name="hero-fade" mode="out-in">
          <article :key="promoDestaque.id" class="home__hero-card">
            <div class="home__hero-content">
              <span class="home__hero-tag">
                <Flame :size="14" aria-hidden="true" />
                Oferta em destaque
              </span>

              <h2>{{ promoDestaque.produto_nome }}</h2>
              <p>Oferta disponível por tempo limitado.</p>

              <div class="home__hero-price">
                <span
                  v-if="
                    promoDestaque.precoOriginal >
                    Number(promoDestaque.preco_promocional)
                  "
                  class="home__hero-price-old"
                >
                  {{ formatarPreco(promoDestaque.precoOriginal) }}
                </span>
                <strong>{{
                  formatarPreco(promoDestaque.preco_promocional)
                }}</strong>
              </div>

              <button
                type="button"
                class="home__hero-btn"
                @click="abrirProduto(promoDestaque.produto)"
              >
                Ver detalhes
                <ChevronRight :size="17" aria-hidden="true" />
              </button>
            </div>

            <div class="home__hero-media">
              <img
                v-if="imagemDisponivel(promoDestaque.produto)"
                :src="imagemProduto(promoDestaque.produto)"
                :alt="promoDestaque.produto_nome"
                fetchpriority="high"
                @error="registrarErroImagem(promoDestaque.produto?.id)"
              />
              <div v-else class="home__hero-fallback" aria-hidden="true">
                <component
                  :is="iconeParaCategoria(promoDestaque.categoriaNome)"
                  :size="84"
                />
              </div>
            </div>
          </article>
        </Transition>

        <div
          v-if="promosAtivas.length > 1"
          class="home__dots"
          aria-label="Selecionar promoção"
        >
          <button
            v-for="(promo, index) in promosAtivas"
            :key="promo.id"
            type="button"
            :class="{ 'is-active': index === promoIndex }"
            :aria-label="`Mostrar promoção ${index + 1}`"
            :aria-current="index === promoIndex ? 'true' : undefined"
            @click="promoIndex = index"
          />
        </div>
      </template>

      <article v-else class="home__hero-card home__hero-card--institutional">
        <div class="home__hero-content">
          <span class="home__hero-tag">
            <ShoppingBag :size="14" aria-hidden="true" />
            Pires Panificadora
          </span>
          <h2>Reserve e retire no balcão.</h2>
          <p>Monte o pedido no site e retire quando estiver pronto.</p>
          <RouterLink :to="{ name: 'cardapio' }" class="home__hero-btn">
            Ver cardápio
            <ChevronRight :size="17" aria-hidden="true" />
          </RouterLink>
        </div>
        <div
          class="home__hero-fallback home__hero-fallback--standalone"
          aria-hidden="true"
        >
          <ShoppingBag :size="82" />
        </div>
      </article>
    </section>

    <section class="home__section" aria-labelledby="titulo-destaques">
      <div class="home__section-head">
        <div>
          <h2 id="titulo-destaques">{{ tituloDestaques }}</h2>
          <p v-if="temFiltroAtivo">
            Resultados com base nos filtros selecionados.
          </p>
        </div>
        <RouterLink :to="{ name: 'cardapio' }">
          Ver todos
          <ChevronRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>

      <div
        v-if="carregandoProdutos"
        class="home__product-row"
        aria-label="Carregando produtos"
      >
        <div
          v-for="index in 5"
          :key="index"
          class="home__product-card home__product-card--skeleton home__skeleton"
        />
      </div>

      <div
        v-else-if="erroProdutos"
        class="home__state home__state--error"
        role="alert"
      >
        <CircleAlert :size="24" aria-hidden="true" />
        <div>
          <strong>Não foi possível carregar o cardápio.</strong>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
        <button type="button" @click="carregarProdutos">
          Tentar novamente
        </button>
      </div>

      <div v-else-if="!destaques.length" class="home__state">
        <SearchX :size="25" aria-hidden="true" />
        <div>
          <strong>Nenhum produto encontrado.</strong>
          <p>Tente mudar a busca ou selecionar outra categoria.</p>
        </div>
      </div>

      <div v-else class="home__product-row">
        <article
          v-for="produto in destaques"
          :key="produto.id"
          class="home__product-card"
        >
          <button
            type="button"
            class="home__fav-btn"
            :class="{ 'is-active': favorites.tem(produto.id) }"
            :aria-label="
              favorites.tem(produto.id)
                ? `Remover ${produto.nome} dos favoritos`
                : `Favoritar ${produto.nome}`
            "
            @click="alternarFavorito(produto)"
          >
            <Heart
              :size="18"
              :fill="favorites.tem(produto.id) ? 'currentColor' : 'none'"
            />
          </button>

          <button
            type="button"
            class="home__product-open"
            :aria-label="`Ver detalhes de ${produto.nome}`"
            @click="abrirProduto(produto)"
          >
            <div class="home__product-image">
              <img
                v-if="imagemDisponivel(produto)"
                :src="imagemProduto(produto)"
                :alt="produto.nome"
                loading="lazy"
                @error="registrarErroImagem(produto.id)"
              />
              <div v-else class="home__product-fallback" aria-hidden="true">
                <component
                  :is="iconeParaCategoria(produto.categoria_nome)"
                  :size="42"
                />
              </div>

              <span v-if="produto.em_promocao" class="home__product-promo"
                >Oferta</span
              >
            </div>

            <div class="home__product-body">
              <h3>{{ produto.nome }}</h3>
              <p>{{ produto.categoria_nome || "Produto" }}</p>
            </div>
          </button>

          <div class="home__product-footer">
            <div class="home__product-prices">
              <span
                v-if="produto.em_promocao"
                class="home__product-price-old"
                >{{ formatarPreco(produto.preco) }}</span
              >
              <strong>{{ formatarPreco(produto.preco_atual) }}</strong>
            </div>

            <button
              type="button"
              class="home__add-btn"
              :disabled="produtoAdicionando === produto.id"
              :aria-label="`Adicionar ${produto.nome} ao carrinho`"
              @click="adicionarAoCarrinho(produto)"
            >
              <LoaderCircle
                v-if="produtoAdicionando === produto.id"
                :size="18"
                class="home__add-spinner"
              />
              <Plus v-else :size="19" />
            </button>
          </div>
        </article>
      </div>
    </section>

    <section
      class="home__section home__section--promos"
      aria-labelledby="titulo-promocoes"
    >
      <div class="home__section-head">
        <div>
          <h2 id="titulo-promocoes">Ofertas</h2>
        </div>
        <RouterLink :to="{ name: 'promocoes' }">
          Ver todas
          <ChevronRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>

      <div
        v-if="carregandoPromos || carregandoProdutos"
        class="home__promo-row"
        aria-label="Carregando promoções"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="home__promo-card home__skeleton"
        />
      </div>

      <div v-else-if="erroPromos" class="home__state home__state--compact">
        <Tag :size="23" aria-hidden="true" />
        <div>
          <strong>As promoções não puderam ser carregadas.</strong>
          <p>O restante do cardápio continua disponível.</p>
        </div>
      </div>

      <div
        v-else-if="!promosAtivas.length"
        class="home__state home__state--compact"
      >
        <Tag :size="23" aria-hidden="true" />
        <div>
          <strong>Nenhuma promoção ativa agora.</strong>
          <p>Quando houver uma oferta vigente, ela aparecerá aqui.</p>
        </div>
      </div>

      <div v-else class="home__promo-row">
        <article
          v-for="promo in promocoesVisiveis"
          :key="promo.id"
          class="home__promo-card"
          role="button"
          tabindex="0"
          :aria-label="`Ver detalhes de ${promo.produto_nome}`"
          @click="abrirProduto(promo.produto)"
          @keydown.enter="abrirProduto(promo.produto)"
          @keydown.space.prevent="abrirProduto(promo.produto)"
        >
          <div class="home__promo-copy">
            <span class="home__promo-category">{{
              promo.categoriaNome || "Oferta"
            }}</span>
            <h3>{{ promo.produto_nome }}</h3>

            <div class="home__promo-prices">
              <strong>{{ formatarPreco(promo.preco_promocional) }}</strong>
              <span
                v-if="promo.precoOriginal > Number(promo.preco_promocional)"
              >
                {{ formatarPreco(promo.precoOriginal) }}
              </span>
            </div>
          </div>

          <div class="home__promo-media">
            <img
              v-if="imagemDisponivel(promo.produto)"
              :src="imagemProduto(promo.produto)"
              :alt="promo.produto_nome"
              loading="lazy"
              @error="registrarErroImagem(promo.produto?.id)"
            />
            <component
              v-else
              :is="iconeParaCategoria(promo.categoriaNome)"
              :size="48"
              aria-hidden="true"
            />
          </div>

          <span v-if="promo.desconto > 0" class="home__promo-discount"
            >-{{ promo.desconto }}%</span
          >
        </article>
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

    <Transition name="toast">
      <div v-if="toast" class="home__toast" role="status" aria-live="polite">
        <Check :size="18" aria-hidden="true" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  Coffee,
  Cookie,
  Croissant,
  Flame,
  Heart,
  LayoutGrid,
  LoaderCircle,
  Package,
  Plus,
  Search,
  SearchX,
  Sandwich,
  ShoppingBag,
  ShoppingCart,
  Tag,
} from "lucide-vue-next";

import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import catalogService, {
  promocaoEstaAtiva,
  resolverUrlMidia,
} from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { useNotificationsStore } from "@/stores/notifications";

const auth = useAuthStore();
const cart = useCartStore();
const favorites = useFavoritesStore();
const notifications = useNotificationsStore();

const busca = ref("");
const categoriaAtiva = ref(null);
const categorias = ref([]);
const produtos = ref([]);
const promocoes = ref([]);
const imagensComErro = ref(new Set());
const avatarComErro = ref(false);

const carregandoProdutos = ref(true);
const carregandoPromos = ref(true);
const erroProdutos = ref(false);
const erroPromos = ref(false);
const modalAberto = ref(false);
const carregandoDetalhe = ref(false);
const produtoDetalhado = ref(null);
const produtoAdicionando = ref(null);
const adicionandoModal = ref(false);
const detalhesCache = new Map();

const promoIndex = ref(0);
const toast = ref("");
let intervaloPromo = null;
let timeoutToast = null;

const primeiroNome = computed(
  () => (auth.usuario?.name || "Aluno").trim().split(/\s+/)[0] || "Aluno",
);

const avatarDisponivel = computed(
  () => Boolean(auth.usuario?.avatar) && !avatarComErro.value,
);

watch(
  () => auth.usuario?.avatar,
  () => {
    avatarComErro.value = false;
  },
);

const saudacao = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
});

const iniciais = computed(() => {
  const nome = auth.usuario?.name || "";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "A"
  );
});

const ICONES_POR_CATEGORIA = {
  salgado: Croissant,
  salgados: Croissant,
  pao: Croissant,
  paes: Croissant,
  doce: Cookie,
  doces: Cookie,
  bebida: Coffee,
  bebidas: Coffee,
  lanche: Sandwich,
  lanches: Sandwich,
  combo: ShoppingBag,
  combos: ShoppingBag,
};

function chaveCategoria(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function iconeParaCategoria(valor) {
  return ICONES_POR_CATEGORIA[chaveCategoria(valor)] || Package;
}

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
}

function selecionarCategoria(id) {
  categoriaAtiva.value = id;
}

function imagemProduto(produto) {
  return resolverUrlMidia(produto?.imagem);
}

function imagemDisponivel(produto) {
  return Boolean(produto?.imagem && !imagensComErro.value.has(produto?.id));
}

function registrarErroImagem(produtoId) {
  if (!produtoId) return;
  imagensComErro.value.add(produtoId);
  imagensComErro.value = new Set(imagensComErro.value);
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

function mostrarToast(mensagem) {
  toast.value = mensagem;
  window.clearTimeout(timeoutToast);
  timeoutToast = window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

const temFiltroAtivo = computed(() =>
  Boolean(categoriaAtiva.value || busca.value.trim()),
);

const produtosFiltrados = computed(() => {
  let lista = produtos.value;

  if (categoriaAtiva.value) {
    lista = lista.filter(
      (produto) => produto.categoria === categoriaAtiva.value,
    );
  }

  const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    lista = lista.filter((produto) => {
      const texto =
        `${produto.nome || ""} ${produto.categoria_nome || ""}`.toLocaleLowerCase(
          "pt-BR",
        );
      return texto.includes(termo);
    });
  }

  return lista;
});

const destaques = computed(() => {
  const lista = produtosFiltrados.value;

  if (temFiltroAtivo.value) {
    return lista.slice(0, 6);
  }

  const marcados = lista.filter((produto) => produto.destaque);
  const restantes = lista.filter((produto) => !produto.destaque);
  return [...marcados, ...restantes].slice(0, 5);
});

const tituloDestaques = computed(() =>
  temFiltroAtivo.value ? "Produtos encontrados" : "Destaques para você",
);

const promosAtivas = computed(() => {
  const mapaProdutos = new Map(
    produtos.value.map((produto) => [produto.id, produto]),
  );

  return promocoes.value
    .filter((promo) => promocaoEstaAtiva(promo))
    .filter((promo) => mapaProdutos.has(promo.produto))
    .map((promo) => {
      const produto = mapaProdutos.get(promo.produto);
      const precoPromocional = Number(promo.preco_promocional || 0);
      const precoOriginal = Number(produto?.preco ?? precoPromocional);
      const desconto =
        precoOriginal > 0 && precoOriginal > precoPromocional
          ? Math.round(
              ((precoOriginal - precoPromocional) / precoOriginal) * 100,
            )
          : 0;

      return {
        ...promo,
        produto,
        precoOriginal,
        desconto,
        categoriaNome: produto?.categoria_nome || "",
      };
    });
});

const promoDestaque = computed(
  () => promosAtivas.value[promoIndex.value] || promosAtivas.value[0] || null,
);
const promocoesVisiveis = computed(() => promosAtivas.value.slice(0, 3));

watch(
  () => promosAtivas.value.length,
  (quantidade) => {
    if (!quantidade) {
      promoIndex.value = 0;
    } else if (promoIndex.value >= quantidade) {
      promoIndex.value = 0;
    }
  },
);

async function carregarCategorias() {
  try {
    categorias.value = await catalogService.listarCategoriasAtivas();
  } catch {
    categorias.value = [];
  }
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
  erroPromos.value = false;

  try {
    promocoes.value = await catalogService.listarPromocoes();
  } catch {
    promocoes.value = [];
    erroPromos.value = true;
  } finally {
    carregandoPromos.value = false;
  }
}

function iniciarCarrossel() {
  window.clearInterval(intervaloPromo);
  intervaloPromo = window.setInterval(() => {
    if (promosAtivas.value.length > 1) {
      promoIndex.value = (promoIndex.value + 1) % promosAtivas.value.length;
    }
  }, 6500);
}

onMounted(() => {
  favorites.carregar().catch(() => {});
  notifications
    .carregar({
      force: !notifications.inicializado,
    })
    .catch(() => {});

  Promise.allSettled([
    carregarCategorias(),
    carregarProdutos(),
    carregarPromocoes(),
  ]);
  iniciarCarrossel();
});

onBeforeUnmount(() => {
  window.clearInterval(intervaloPromo);
  window.clearTimeout(timeoutToast);
});
</script>

<style scoped>
.home {
  width: min(100%, 1280px);
  margin: 0 auto;
  color: var(--student-text);
}
.home__header {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(280px, 420px) auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}
.home__greeting-row {
  min-width: 0;
}
.home__greeting h1 {
  margin: 0;
  font-size: 29px;
  font-weight: 700;
  line-height: 1.15;
}
.home__greeting p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.home__search {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  color: #8a827b;
}
.home__search:focus-within {
  border-color: #c9a466;
  box-shadow: 0 0 0 3px rgba(184, 121, 31, 0.08);
}
.home__search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 13px;
}
.home__actions {
  display: flex;
  align-items: center;
  gap: 5px;
}
.home__icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #605950;
}
.home__badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--student-accent);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}
.home__avatar,
.home__mobile-avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #e7ded3;
  color: #654718;
  font-size: 11px;
  font-weight: 700;
}
.home__avatar img,
.home__mobile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.home__mobile-avatar {
  display: none;
}
.home__categories {
  display: flex;
  gap: 7px;
  margin-bottom: 20px;
  overflow: auto;
  scrollbar-width: none;
}
.home__categories::-webkit-scrollbar {
  display: none;
}
.home__category {
  flex: 0 0 auto;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #625b54;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.home__category:hover {
  border-color: var(--student-border-strong);
}
.home__category.is-active {
  border-color: #c89a51;
  background: var(--student-accent-soft);
  color: #7d5114;
}
.home__hero {
  position: relative;
  margin-bottom: 30px;
}
.home__hero-card {
  min-height: 274px;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--student-shadow);
}
.home__hero-content {
  padding: 36px 38px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}
.home__hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 15px;
  color: #8b5d1a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.home__hero-content h2 {
  margin: 0 0 8px;
  max-width: 560px;
  font-size: 33px;
  line-height: 1.08;
  font-weight: 700;
}
.home__hero-content p {
  margin: 0 0 19px;
  color: var(--student-muted);
  font-size: 14px;
  line-height: 1.55;
}
.home__hero-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 20px;
}
.home__hero-price strong {
  color: var(--student-text);
  font-size: 26px;
}
.home__hero-price-old {
  color: #9e968e;
  font-size: 13px;
  text-decoration: line-through;
}
.home__hero-btn {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 15px;
  border: 1px solid #9e691c;
  border-radius: 8px;
  background: #9e691c;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.home__hero-btn:hover {
  background: #835513;
  border-color: #835513;
}
.home__hero-media {
  min-height: 274px;
  background: #eee9e3;
}
.home__hero-media img {
  width: 100%;
  height: 100%;
  min-height: 274px;
  display: block;
  object-fit: cover;
}
.home__hero-fallback {
  width: 100%;
  height: 100%;
  min-height: 274px;
  display: grid;
  place-items: center;
  color: #b9935a;
  background: #f0ece7;
}
.home__hero-card--institutional {
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
}
.home__hero-fallback--standalone {
  min-height: 274px;
}
.home__dots {
  position: absolute;
  left: 38px;
  bottom: 15px;
  display: flex;
  gap: 6px;
}
.home__dots button {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #d2cbc4;
  cursor: pointer;
}
.home__dots button.is-active {
  width: 18px;
  border-radius: 999px;
  background: var(--student-accent);
}
.home__section {
  margin-top: 30px;
}
.home__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}
.home__section-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.home__section-head p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 12px;
}
.home__section-head > a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #795016;
  font-size: 12px;
  font-weight: 700;
}
.home__product-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.home__product-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.home__product-card:hover {
  border-color: #d6c5ad;
}
.home__product-open {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.home__product-image {
  position: relative;
  aspect-ratio: 1.22/1;
  overflow: hidden;
  background: #f1ede8;
}
.home__product-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.home__product-card:hover .home__product-image img {
  transform: scale(1.025);
}
.home__product-fallback {
  height: 100%;
  display: grid;
  place-items: center;
  color: #bb965f;
}
.home__product-promo {
  position: absolute;
  left: 9px;
  top: 9px;
  padding: 4px 7px;
  border-radius: 5px;
  background: #8e5b16;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.home__fav-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(40, 35, 31, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.93);
  color: #746d66;
  cursor: pointer;
}
.home__fav-btn.is-active {
  color: #9d3e39;
}
.home__product-body {
  padding: 11px 11px 4px;
}
.home__product-body h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.home__product-body p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 10px;
}
.home__product-footer {
  min-height: 55px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px 10px;
}
.home__product-prices {
  display: flex;
  flex-direction: column;
}
.home__product-prices strong {
  font-size: 15px;
  color: var(--student-text);
}
.home__product-price-old {
  color: #9c948c;
  font-size: 9px;
  text-decoration: line-through;
}
.home__add-btn {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  cursor: pointer;
}
.home__add-btn:disabled {
  opacity: 0.55;
}
.home__add-spinner,
.home__spinner {
  animation: student-spin 0.7s linear infinite;
}
.home__promo-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.home__promo-card {
  position: relative;
  min-height: 132px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.home__promo-card:hover {
  border-color: #d3bd9d;
}
.home__promo-copy {
  padding: 17px;
}
.home__promo-category {
  color: var(--student-muted);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.home__promo-copy h3 {
  margin: 6px 0 12px;
  font-size: 15px;
}
.home__promo-prices {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.home__promo-prices strong {
  font-size: 17px;
}
.home__promo-prices span {
  color: #999087;
  font-size: 10px;
  text-decoration: line-through;
}
.home__promo-media {
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #f1ede8;
  color: #bb965f;
}
.home__promo-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.home__promo-discount {
  position: absolute;
  top: 9px;
  right: 9px;
  padding: 4px 6px;
  border-radius: 5px;
  background: #fff;
  color: #8c5916;
  border: 1px solid #e2cfb0;
  font-size: 9px;
  font-weight: 800;
}
.home__state {
  min-height: 108px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  color: var(--student-muted);
}
.home__state strong {
  color: var(--student-text);
  font-size: 13px;
}
.home__state p {
  margin: 3px 0 0;
  font-size: 11px;
}
.home__state button {
  margin-left: auto;
  padding: 8px 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  background: #fff;
  color: var(--student-text);
  font-size: 11px;
  font-weight: 700;
}
.home__state--compact {
  min-height: 86px;
}
.home__skeleton {
  background: linear-gradient(90deg, #eeeae5 25%, #f7f5f2 50%, #eeeae5 75%);
  background-size: 200% 100%;
  animation: student-shimmer 1.25s infinite;
}
.home__product-card--skeleton {
  min-height: 235px;
}
.home__toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 360px;
  padding: 11px 14px;
  border: 1px solid #cadbcd;
  border-radius: 8px;
  background: #f4faf5;
  color: #33583a;
  box-shadow: 0 10px 30px rgba(30, 40, 30, 0.1);
  font-size: 12px;
  font-weight: 600;
}
.hero-fade-enter-active,
.hero-fade-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.15s ease;
}
.hero-fade-enter-from,
.hero-fade-leave-to,
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
@keyframes student-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes student-shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 1180px) {
  .home__product-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .home__promo-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .home__header {
    grid-template-columns: 1fr auto;
  }
  .home__search {
    grid-column: 1/-1;
    grid-row: 2;
  }
  .home__hero-card {
    grid-template-columns: 1fr 42%;
  }
  .home__hero-content {
    padding: 28px;
  }
  .home__product-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .home__header {
    display: block;
  }
  .home__greeting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .home__greeting h1 {
    font-size: 24px;
  }
  .home__actions {
    display: none;
  }
  .home__mobile-avatar {
    display: grid;
    flex: 0 0 auto;
  }
  .home__categories {
    margin: 16px -13px 18px;
    padding: 0 13px;
  }
  .home__hero-card,
  .home__hero-card--institutional {
    grid-template-columns: 1fr;
  }
  .home__hero-media,
  .home__hero-fallback,
  .home__hero-media img,
  .home__hero-fallback--standalone {
    min-height: 190px;
  }
  .home__hero-media {
    grid-row: 1;
  }
  .home__hero-content {
    padding: 22px;
  }
  .home__hero-content h2 {
    font-size: 25px;
  }
  .home__dots {
    left: 22px;
  }
  .home__product-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
  .home__promo-row {
    grid-template-columns: 1fr;
  }
  .home__section {
    margin-top: 24px;
  }
  .home__section-head h2 {
    font-size: 18px;
  }
  .home__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
  }
  .home__promo-card {
    grid-template-columns: minmax(0, 1fr) 96px;
  }
}
</style>
