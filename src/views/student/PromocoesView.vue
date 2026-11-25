<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Search,
  SearchX,
  Tag,
  X,
} from "lucide-vue-next";
import PromotionCampaign from "@/components/promotions/PromotionCampaign.vue";
import ProductDetailsModal from "@/components/catalog/ProductDetailsModal.vue";
import catalogService from "@/services/catalog.service";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { dataDaPires, selecionarOfertas } from "@/utils/promocoes";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

const cart = useCartStore(),
  favorites = useFavoritesStore();
const produtos = ref([]),
  promocoes = ref([]),
  hoje = ref(dataDaPires());
const busca = ref(""),
  categoriaAtiva = ref(null),
  ordenacao = ref("desconto");
const carregando = ref(true),
  erro = ref(false),
  falhaAtualizacao = ref(false);
const produtoAdicionando = ref(null),
  origemAdicao = ref(null);
const modalAberto = ref(false),
  carregandoDetalhe = ref(false),
  produtoDetalhado = ref(null);
const adicionandoModal = computed(() => origemAdicao.value === "modal");
const toast = ref("");
let toastTimer,
  montado = true,
  carregou = false,
  requisicaoDetalhe = 0,
  observer;
const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
watch(
  () => cart.geracao,
  () => {
    fecharModal();
    produtoAdicionando.value = null;
    origemAdicao.value = null;
    toast.value = "";
    clearTimeout(toastTimer);
  },
  { flush: "sync" },
);
const trilha = useTemplateRef("trilha");
const indicador = ref({ width: "0px", transform: "translateX(0px)" });
const promocoesAtivas = computed(() =>
  selecionarOfertas(produtos.value, promocoes.value, hoje.value),
);
const categoriasPromocionais = computed(() =>
  [
    ...new Map(
      promocoesAtivas.value.map(({ produto }) => [
        produto.categoria,
        { id: produto.categoria, nome: produto.categoria_nome || "Categoria" },
      ]),
    ).values(),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
);
const normalizar = (valor) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
const promocoesFiltradas = computed(() => {
  const termo = normalizar(busca.value);
  const lista = promocoesAtivas.value.filter(
    ({ produto }) =>
      (categoriaAtiva.value === null ||
        produto.categoria === categoriaAtiva.value) &&
      normalizar(`${produto.nome} ${produto.categoria_nome}`).includes(termo),
  );
  const porNome = (a, b) =>
    a.produto.nome.localeCompare(b.produto.nome, "pt-BR");
  return lista.sort((a, b) => {
    if (ordenacao.value === "nome") return porNome(a, b);
    if (ordenacao.value === "menor-preco")
      return (
        Number(a.produto.preco_atual) - Number(b.produto.preco_atual) ||
        porNome(a, b)
      );
    if (ordenacao.value === "termina-primeiro")
      return (
        a.promocao.data_fim.localeCompare(b.promocao.data_fim) || porNome(a, b)
      );
    return b.desconto - a.desconto || porNome(a, b);
  });
});
const destaque = computed(() => promocoesFiltradas.value[0]);
const demais = computed(() => promocoesFiltradas.value.slice(1));
const assinatura = computed(() =>
  promocoesFiltradas.value.map((item) => item.produto.id).join("-"),
);
const temFiltros = computed(() =>
  Boolean(
    busca.value ||
    categoriaAtiva.value !== null ||
    ordenacao.value !== "desconto",
  ),
);
const maiorDesconto = computed(() =>
  Math.max(0, ...promocoesAtivas.value.map((item) => item.desconto)),
);
const textoContagem = computed(
  () =>
    `${promocoesFiltradas.value.length} ${promocoesFiltradas.value.length === 1 ? "oferta" : "ofertas"}`,
);

async function alinharIndicador() {
  await nextTick();
  if (!montado) return;
  const ativo = trilha.value?.querySelector('[aria-pressed="true"]');
  if (!ativo) return;
  indicador.value = {
    width: `${ativo.offsetWidth}px`,
    transform: `translateX(${ativo.offsetLeft}px)`,
  };
  const inicio = ativo.offsetLeft;
  if (
    inicio < trilha.value.scrollLeft ||
    inicio + ativo.offsetWidth >
      trilha.value.scrollLeft + trilha.value.clientWidth
  ) {
    trilha.value.scrollTo({
      left: inicio - (trilha.value.clientWidth - ativo.offsetWidth) / 2,
      behavior: movimentoReduzido() ? "instant" : "smooth",
    });
  }
}
watch([categoriaAtiva, categoriasPromocionais], () => {
  if (
    categoriaAtiva.value !== null &&
    !categoriasPromocionais.value.some((c) => c.id === categoriaAtiva.value)
  )
    categoriaAtiva.value = null;
  alinharIndicador();
});
async function carregarDados() {
  hoje.value = dataDaPires();
  if (!carregou) {
    carregando.value = true;
    erro.value = false;
  }
  try {
    const [lista, ofertas] = await Promise.all([
      catalogService.listarProdutosAtivos(),
      catalogService.listarPromocoes(),
    ]);
    if (!montado) return;
    produtos.value = lista;
    promocoes.value = ofertas;
    carregou = true;
    erro.value = false;
    falhaAtualizacao.value = false;
  } catch {
    if (!carregou) erro.value = true;
    else falhaAtualizacao.value = true;
  } finally {
    carregando.value = false;
  }
}
const { atualizarAgora } = useAutoRefresh(carregarDados, { intervalo: 60_000 });
async function abrirProduto(produto) {
  const pedido = ++requisicaoDetalhe;
  const contexto = cart.capturarContexto();
  toast.value = "";
  modalAberto.value = true;
  carregandoDetalhe.value = true;
  produtoDetalhado.value = null;
  try {
    const detalhe = await catalogService.obterProduto(produto.id);
    if (contextoAtual(contexto) && pedido === requisicaoDetalhe)
      produtoDetalhado.value = detalhe;
  } catch {
  } finally {
    if (contextoAtual(contexto) && pedido === requisicaoDetalhe)
      carregandoDetalhe.value = false;
  }
}
function fecharModal() {
  requisicaoDetalhe++;
  modalAberto.value = false;
  produtoDetalhado.value = null;
  carregandoDetalhe.value = false;
}
async function alternarFavorito(produto) {
  const estava = favorites.tem(produto.id);
  try {
    await favorites.alternar(produto);
    if (montado)
      mostrarToast(
        `${produto.nome} ${estava ? "removido dos favoritos" : "adicionado aos favoritos"}.`,
      );
  } catch {
    if (montado) mostrarToast("Não foi possível atualizar seus favoritos.");
  }
}
async function adicionar(produto, quantidade = 1, origem = "direta") {
  if (
    produtoAdicionando.value !== null ||
    !Number.isSafeInteger(quantidade) ||
    quantidade < 1
  )
    return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;
  produtoAdicionando.value = produto.id;
  origemAdicao.value = origem;
  try {
    const detalhe = await catalogService.obterProduto(produto.id);
    if (!contextoAtual(contexto)) return;
    if (origem === "modal" && produtoDetalhado.value?.id === produto.id)
      produtoDetalhado.value = detalhe;
    if (
      !detalhe.ativo ||
      !detalhe.em_promocao ||
      Number(detalhe.preco_atual) !== Number(produto.preco_atual)
    ) {
      mostrarToast(
        "Esta oferta mudou. Confira o preço e a disponibilidade antes de adicionar.",
      );
      await carregarDados();
      return;
    }
    const estoque = Number(detalhe.estoque || 0);
    const existente = cart.itens.find((item) => item.produto.id === detalhe.id);
    if (estoque <= 0) {
      mostrarToast(`${produto.nome} está sem estoque no momento.`);
      return;
    }
    if ((existente?.quantidade || 0) + quantidade > estoque) {
      mostrarToast(
        `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"} de ${produto.nome}.`,
      );
      return;
    }
    if (existente) existente.produto = detalhe;
    if (!cart.adicionar(detalhe, quantidade, contexto)) return;
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
    if (origem === "modal" && produtoDetalhado.value?.id === produto.id)
      fecharModal();
  } catch {
    if (contextoAtual(contexto))
      mostrarToast("Não foi possível verificar a disponibilidade do produto.");
  } finally {
    if (contextoAtual(contexto)) {
      produtoAdicionando.value = null;
      origemAdicao.value = null;
    }
  }
}
function adicionarDoModal({ produto, quantidade }) {
  return adicionar(produto, quantidade, "modal");
}
function limparFiltros() {
  busca.value = "";
  categoriaAtiva.value = null;
  ordenacao.value = "desconto";
}
function mostrarToast(mensagem) {
  toast.value = mensagem;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 3800);
}
onMounted(() => {
  favorites.carregar().catch(() => {});
  observer = new ResizeObserver(alinharIndicador);
  observer.observe(trilha.value);
  document.fonts.ready.then(alinharIndicador);
});
onBeforeUnmount(() => {
  montado = false;
  requisicaoDetalhe++;
  clearTimeout(toastTimer);
  observer?.disconnect();
});
</script>

<template>
  <div class="promotions-page">
    <header class="promotions-page__header">
      <div>
        <h1>Promoções</h1>
        <p class="promotions-page__note">Seu intervalo, por menos.</p>
      </div>
      <div class="promotions-page__intro">
        <p>
          {{
            !carregando && !erro && !promocoesAtivas.length
              ? "Consulte o cardápio completo da Pires."
              : "Escolha seu lanche entre as ofertas vigentes da Pires."
          }}
        </p>
        <p
          v-if="!carregando && !erro && promocoesAtivas.length"
          class="promotions-page__facts"
        >
          {{ promocoesAtivas.length }}
          {{ promocoesAtivas.length === 1 ? "oferta" : "ofertas" }} · descontos
          de até {{ maiorDesconto }}%
        </p>
      </div>
    </header>
    <section
      class="promotions-page__controls"
      aria-label="Busca e filtros de promoções"
    >
      <label class="promotions-page__search"
        ><Search :size="20" aria-hidden="true" /><input
          v-model="busca"
          type="search"
          aria-label="Buscar nas promoções"
          placeholder="Qual oferta você procura?"
          autocomplete="off" /><button
          v-if="busca"
          type="button"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="18" aria-hidden="true" /></button
      ></label>
      <div
        ref="trilha"
        class="promotions-page__categories"
        role="group"
        aria-label="Categorias em promoção"
      >
        <div class="promotions-page__category-track">
          <button
            type="button"
            :aria-pressed="categoriaAtiva === null"
            @click="categoriaAtiva = null"
          >
            Todas
          </button>
          <button
            v-for="categoria in categoriasPromocionais"
            :key="categoria.id"
            type="button"
            :aria-pressed="categoriaAtiva === categoria.id"
            @click="categoriaAtiva = categoria.id"
          >
            {{ categoria.nome }}
          </button>
          <span
            class="promotions-page__indicator"
            :style="indicador"
            aria-hidden="true"
          />
        </div>
      </div>
      <label class="promotions-page__sort"
        ><select v-model="ordenacao" aria-label="Ordenar promoções">
          <option value="desconto">Maior desconto</option>
          <option value="menor-preco">Menor preço</option>
          <option value="termina-primeiro">Validade</option>
          <option value="nome">Nome A–Z</option></select
        ><ChevronDown :size="16" aria-hidden="true"
      /></label>
    </section>
    <section
      class="promotions-page__content"
      aria-labelledby="promotions-title"
      :aria-busy="carregando"
    >
      <div class="promotions-page__content-head">
        <h2 id="promotions-title" aria-live="polite" aria-atomic="true">
          {{ carregando ? "Carregando ofertas" : textoContagem }}
        </h2>
        <button v-if="temFiltros" type="button" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>
      <p v-if="falhaAtualizacao" role="status">
        Não foi possível atualizar as ofertas. A disponibilidade será conferida
        ao adicionar.
      </p>
      <div
        v-if="carregando"
        class="promotions-page__loading"
        aria-label="Carregando promoções"
      >
        <div class="promotions-page__skeleton" />
        <div class="promotions-page__skeleton" />
      </div>
      <div v-else-if="erro" class="promotions-page__state" role="alert">
        <CircleAlert :size="28" aria-hidden="true" />
        <h2>Não conseguimos carregar as promoções.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-else-if="!promocoesAtivas.length" class="promotions-page__state">
        <Tag :size="28" aria-hidden="true" />
        <h2>Um novo sabor pode estar no cardápio.</h2>
        <p>
          Nenhuma promoção ativa agora. Você ainda pode escolher no cardápio
          completo.
        </p>
        <RouterLink :to="{ name: 'cardapio' }"
          >Ver cardápio <ArrowRight :size="18" aria-hidden="true"
        /></RouterLink>
      </div>
      <div
        v-else-if="!promocoesFiltradas.length"
        class="promotions-page__state"
      >
        <SearchX :size="28" aria-hidden="true" />
        <h2>Nenhuma oferta encontrada.</h2>
        <p>Tente outro produto ou remova os filtros.</p>
        <button type="button" @click="limparFiltros">
          Ver todas as ofertas
        </button>
      </div>
      <Transition
        v-else
        name="offers"
        @leave="(_element, concluir) => concluir()"
      >
        <div
          :key="assinatura"
          class="promotions-page__showcase"
          :class="{ 'promotions-page__showcase--pair': demais.length === 1 }"
        >
          <PromotionCampaign
            :key="destaque.produto.id"
            :item="destaque"
            featured
            :favorito="favorites.tem(destaque.produto.id)"
            :favoritando="favorites.estaProcessando(destaque.produto.id)"
            :adicionando="produtoAdicionando === destaque.produto.id"
            @open="abrirProduto"
            @favorite="alternarFavorito"
            @add="adicionar"
          />
          <section
            v-if="demais.length"
            class="promotions-page__more"
            aria-labelledby="more-offers"
          >
            <h2 id="more-offers">
              {{
                demais.length === 1
                  ? "Também em oferta"
                  : "Mais ofertas para escolher"
              }}
            </h2>
            <div
              class="promotions-page__grid"
              :class="{ 'promotions-page__grid--four': demais.length === 4 }"
            >
              <PromotionCampaign
                v-for="item in demais"
                :key="item.produto.id"
                :item="item"
                :favorito="favorites.tem(item.produto.id)"
                :favoritando="favorites.estaProcessando(item.produto.id)"
                :adicionando="produtoAdicionando === item.produto.id"
                @open="abrirProduto"
                @favorite="alternarFavorito"
                @add="adicionar"
              />
            </div>
          </section>
        </div>
      </Transition>
    </section>
    <section
      v-revelar
      class="promotions-page__how"
      aria-labelledby="how-offers"
    >
      <div>
        <h2 id="how-offers">Seu próximo<br />intervalo começa aqui.</h2>
        <RouterLink :to="{ name: 'cardapio' }"
          >Conhecer o cardápio <ArrowRight :size="18" aria-hidden="true"
        /></RouterLink>
      </div>
      <ol>
        <li>
          <strong>Escolha seu lanche</strong>
          <p>Veja os detalhes e adicione os produtos ao carrinho.</p>
        </li>
        <li>
          <strong>Conclua seu pedido</strong>
          <p>Escolha a forma de pagamento disponível no checkout.</p>
        </li>
        <li>
          <strong>Acompanhe e retire</strong>
          <p>
            Acompanhe o preparo e apresente o QR Code para retirar seu pedido.
          </p>
        </li>
      </ol>
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
    <Transition name="promotions-toast"
      ><div
        v-if="toast"
        class="promotions-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="18" aria-hidden="true" />{{ toast }}
      </div></Transition
    >
  </div>
</template>

<style scoped src="./PromocoesView.css"></style>
