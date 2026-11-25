<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { motion, useReducedMotion } from "motion-v";
import {
  ArrowUpRight,
  Search,
  ShoppingBag,
  CircleAlert,
} from "lucide-vue-next";
import OrderCard from "@/components/orders/OrderCard.vue";
import OrderQRCodeModal from "@/components/orders/OrderQRCodeModal.vue";
import OrderChatDrawer from "@/components/chat/OrderChatDrawer.vue";
import { useOrdersStore } from "@/stores/orders";
import { useChatStore } from "@/stores/chat";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { filtrarPedidos } from "@/utils/orders";

const route = useRoute();
const router = useRouter();
const orders = useOrdersStore();
const chat = useChatStore();
const reduzir = useReducedMotion();
const filtro = ref("todos");
const busca = ref("");
const pedidoQRCodeId = ref(null);
const pedidoChat = ref(null);
const avisoPedido = ref("");
let pedidoLocalizado = null;
const filtros = [
  { valor: "todos", label: "Todos" },
  { valor: "andamento", label: "Em andamento" },
  { valor: "finalizados", label: "Finalizados" },
];
const pedidosFiltrados = computed(() =>
  filtrarPedidos(orders.itens, filtro.value, busca.value),
);
const destaque = computed(() =>
  pedidosFiltrados.value.find((pedido) =>
    ["pendente", "confirmado", "pronto"].includes(pedido.status),
  ),
);
const colecao = computed(() =>
  pedidosFiltrados.value.filter((pedido) => pedido.id !== destaque.value?.id),
);
const pedidoQRCode = computed(
  () =>
    orders.itens.find(
      (pedido) =>
        pedido.id === pedidoQRCodeId.value && pedido.status === "pronto",
    ) || null,
);
const filtrosAtivos = computed(
  () => filtro.value !== "todos" || busca.value.trim(),
);

function quantidadeFiltro(valor) {
  return valor === "todos"
    ? orders.itens.length
    : valor === "andamento"
      ? orders.emAndamento.length
      : orders.finalizados.length;
}
const {
  atualizando,
  ultimaAtualizacao,
  erro: erroAtualizacao,
  atualizarAgora,
  reagendar,
} = useAutoRefresh(
  () => orders.carregar({ force: true, silencioso: orders.inicializado }),
  { intervalo: () => (orders.emAndamento.length ? 10_000 : 60_000) },
);
watch(
  () => orders.emAndamento.length,
  () => reagendar(),
);

watch(
  () => route.query.pedido,
  () => {
    pedidoLocalizado = null;
    avisoPedido.value = "";
    if (route.query.pedido && ultimaAtualizacao.value) atualizarAgora();
  },
);
watch(
  [
    () => route.query.pedido,
    ultimaAtualizacao,
    atualizando,
    () => orders.carregando || orders.atualizandoSilenciosamente,
  ],
  async ([valor, atualizacao, sincronizando, carregando], _, onCleanup) => {
    const id = Number(valor);
    if (
      !/^\d+$/.test(String(valor)) ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      pedidoLocalizado === id ||
      !atualizacao ||
      sincronizando ||
      carregando ||
      erroAtualizacao.value ||
      pedidoChat.value ||
      pedidoQRCode.value
    )
      return;
    let cancelado = false;
    onCleanup(() => {
      cancelado = true;
    });
    pedidoLocalizado = id;
    filtro.value = "todos";
    busca.value = "";
    await nextTick();
    if (cancelado) return;
    const elemento = document.getElementById(`pedido-${id}`);
    if (!elemento) {
      avisoPedido.value =
        "Não encontramos esse pedido nesta lista. Confira os pedidos disponíveis abaixo.";
      return;
    }
    elemento.focus({ preventScroll: true });
    elemento.scrollIntoView({
      behavior: reduzir.value ? "instant" : "smooth",
      block: "start",
    });
  },
  { immediate: true },
);
watch(pedidoQRCode, (pedido) => {
  if (!pedido) pedidoQRCodeId.value = null;
});
function limparFiltros() {
  filtro.value = "todos";
  busca.value = "";
}
function abrirQRCode(pedido) {
  if (pedido?.status === "pronto") {
    pedidoChat.value = null;
    pedidoQRCodeId.value = pedido.id;
  }
}
function abrirChat(pedido) {
  pedidoQRCodeId.value = null;
  pedidoChat.value = pedido;
}

watch(
  [() => route.query.chat, () => orders.inicializado],
  ([chatId, carregado]) => {
    if (!chatId || !carregado) return;
    const pedido = orders.itens.find(
      (item) => Number(item.id) === Number(chatId),
    );
    if (pedido) abrirChat(pedido);
    const { chat: _chat, ...query } = route.query;
    router.replace({ query });
  },
  { immediate: true },
);
</script>

<template>
  <div class="orders-page">
    <header class="orders-page__intro">
      <div>
        <h1>Meus pedidos</h1>
        <span class="orders-page__note">Da Pires pra você.</span>
        <p>Seus pedidos, do preparo à retirada.</p>
      </div>
      <RouterLink :to="{ name: 'cardapio' }"
        >Escolher meu próximo lanche
        <ArrowUpRight :size="18" aria-hidden="true"
      /></RouterLink>
    </header>
    <div
      v-if="!orders.inicializado && !orders.erro"
      class="orders-page__loading"
      role="status"
    >
      <span>Buscando seus pedidos…</span>
      <div class="orders-page__skeleton" />
    </div>
    <section
      v-else-if="orders.erro && !orders.inicializado"
      class="orders-page__state"
      role="alert"
    >
      <CircleAlert :size="32" aria-hidden="true" />
      <h2>Não foi possível carregar seus pedidos</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" @click="atualizarAgora">Tentar novamente</button>
    </section>
    <section v-else-if="!orders.itens.length" class="orders-page__state">
      <ShoppingBag :size="40" aria-hidden="true" />
      <h2>Seu próximo lanche começa aqui.</h2>
      <p>
        Quando fizer um pedido, você acompanha cada etapa e a retirada nesta
        página.
      </p>
      <RouterLink :to="{ name: 'cardapio' }"
        >Explorar o Cardápio <ArrowUpRight :size="18" aria-hidden="true"
      /></RouterLink>
    </section>
    <template v-else>
      <div class="orders-page__summary">
        <p>
          <strong
            >{{ orders.emAndamento.length }}
            {{
              orders.emAndamento.length === 1
                ? "pedido ativo"
                : "pedidos ativos"
            }}</strong
          ><span v-if="orders.prontos.length"
            >,
            {{
              orders.prontos.length === 1
                ? "sendo 1 pronto"
                : `sendo ${orders.prontos.length} prontos`
            }}
            para retirada</span
          ><span v-else>. Acompanhe as atualizações por aqui.</span>
        </p>
        <button
          v-if="erroAtualizacao"
          type="button"
          class="orders-page__retry"
          @click="atualizarAgora"
        >
          Tentar novamente
        </button>
      </div>

      <p v-if="avisoPedido" class="orders-page__target-notice" role="status">
        {{ avisoPedido }}
      </p>
      <div class="orders-page__toolbar">
        <div
          class="orders-page__filters"
          role="group"
          aria-label="Filtrar pedidos"
        >
          <button
            v-for="item in filtros"
            :key="item.valor"
            type="button"
            :aria-pressed="filtro === item.valor"
            @click="filtro = item.valor"
          >
            {{ item.label }} <span>{{ quantidadeFiltro(item.valor) }}</span
            ><motion.span
              v-if="filtro === item.valor"
              class="orders-page__indicator"
              layout-id="orders-filter"
              :transition="{ duration: reduzir ? 0 : 0.22 }"
            />
          </button>
        </div>
        <label class="orders-page__search"
          ><Search :size="18" aria-hidden="true" /><input
            v-model="busca"
            type="search"
            aria-label="Buscar pedido por número ou produto"
            placeholder="Número ou produto"
        /></label>
      </div>
      <div class="orders-page__results" role="status" aria-live="polite">
        {{ pedidosFiltrados.length }}
        {{
          pedidosFiltrados.length === 1
            ? "pedido encontrado"
            : "pedidos encontrados"
        }}<button v-if="filtrosAtivos" type="button" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>
      <section v-if="!pedidosFiltrados.length" class="orders-page__state">
        <Search :size="30" aria-hidden="true" />
        <h2>Nenhum pedido por aqui.</h2>
        <p>Tente outro número, produto ou filtro.</p>
        <button type="button" @click="limparFiltros">Limpar filtros</button>
      </section>
      <template v-else>
        <motion.section
          v-if="destaque"
          :key="destaque.id"
          class="orders-page__featured"
          aria-labelledby="current-order-title"
          :initial="reduzir ? false : { opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: reduzir ? 0 : 0.36, ease: 'easeOut' }"
        >
          <h2 id="current-order-title">
            {{
              destaque.status === "pronto"
                ? "Aguardando sua retirada"
                : "Acompanhe seu pedido"
            }}
          </h2>
          <OrderCard
            :id="`pedido-${destaque.id}`"
            tabindex="-1"
            :pedido="destaque"
            destaque
            :nao-lidas="chat.naoLidasDoPedido(destaque.id)"
            @ver-qrcode="abrirQRCode"
            @abrir-chat="abrirChat"
          />
        </motion.section>
        <motion.section
          v-if="colecao.length"
          :key="filtro"
          class="orders-page__collection"
          aria-labelledby="order-collection-title"
          :initial="reduzir ? false : { opacity: 0.5 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: reduzir ? 0 : 0.2 }"
        >
          <div class="orders-page__collection-heading">
            <h2 id="order-collection-title">
              {{ destaque ? "Outros pedidos e histórico" : "Seu histórico" }}
            </h2>
            <p v-if="!orders.emAndamento.length">
              Todos os seus pedidos foram finalizados. Os detalhes continuam
              aqui.
            </p>
            <p v-else>Produtos, mensagens e detalhes de cada pedido.</p>
          </div>
          <OrderCard
            v-for="pedido in colecao"
            :key="pedido.id"
            :id="`pedido-${pedido.id}`"
            tabindex="-1"
            :pedido="pedido"
            :nao-lidas="chat.naoLidasDoPedido(pedido.id)"
            @ver-qrcode="abrirQRCode"
            @abrir-chat="abrirChat"
          />
        </motion.section>
      </template>
    </template>
    <OrderQRCodeModal
      v-if="pedidoQRCode"
      :key="pedidoQRCode.id"
      :pedido="pedidoQRCode"
      @close="pedidoQRCodeId = null"
    />
    <OrderChatDrawer
      v-if="pedidoChat"
      :key="pedidoChat.id"
      :pedido="pedidoChat"
      @close="pedidoChat = null"
    />
  </div>
</template>

<style scoped src="./PedidosView.css"></style>
