<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { motion, useReducedMotion } from "motion-v";
import {
  ArrowUpRight,
  Search,
  RotateCw,
  ShoppingBag,
  CircleAlert,
} from "lucide-vue-next";
import OrderCard from "@/components/orders/OrderCard.vue";
import OrderQRCodeModal from "@/components/orders/OrderQRCodeModal.vue";
import OrderChatDrawer from "@/components/chat/OrderChatDrawer.vue";
import BaseRefreshStatus from "@/components/ui/BaseRefreshStatus.vue";
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
// Um pedido novo ou finalizado muda o ritmo das atualizações.
watch(
  () => orders.emAndamento.length,
  () => reagendar(),
);

// Entrada da central de avisos: consultar o estado atual antes de localizar o pedido.
// Não abrir QR nem presumir que o evento antigo ainda representa uma retirada disponível.
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
// Quando o balcão confirma a retirada, o QR deixa de valer: fecha o modal sozinho.
// A ausência na lista atualizada também encerra a exibição e invalida respostas em voo.
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

// O assistente (chatbot) leva para /pedidos?chat=ID: abre a conversa desse pedido e limpa a URL.
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
        <h1>
          Meus pedidos<span class="orders-page__note">Da Pires pra você.</span>
        </h1>
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
          type="button"
          class="orders-page__refresh"
          :disabled="atualizando"
          @click="atualizarAgora"
        >
          <RotateCw :size="15" aria-hidden="true" />{{
            atualizando ? "Atualizando…" : "Atualizar"
          }}
        </button>
      </div>
      <BaseRefreshStatus
        :ultima-atualizacao="ultimaAtualizacao"
        :atualizando="atualizando"
        :erro="erroAtualizacao"
      />
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

<style scoped>
.orders-page {
  max-width: 1120px;
  margin: 12px auto 0;
  padding-bottom: 64px;
  color: var(--pp-marrom);
}
.orders-page :deep(.order-card) {
  scroll-margin-top: calc(var(--pp-altura-topo) + 24px);
}
.orders-page :deep(.order-card:focus-visible) {
  outline: 2px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.orders-page__target-notice {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pp-texto-2);
  margin: 16px 0;
}
.orders-page__intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 30px;
}
.orders-page__intro h1 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 22px;
  font-family: var(--pp-font-titulo);
  font-size: clamp(44px, 5vw, 64px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.1;
  margin: 0 0 14px;
}
.orders-page__note {
  display: inline-block;
  font-family: var(--pp-font-nota);
  color: var(--pp-dourado-profundo);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: 0;
  transform: rotate(-4deg);
  white-space: nowrap;
}
.orders-page__intro p {
  color: var(--pp-texto-2);
  font-size: 15px;
  margin: 0;
}
.orders-page__intro a {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pp-marrom);
  text-decoration: underline;
  text-underline-offset: 5px;
}
.orders-page__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--pp-creme-borda);
}
.orders-page__summary p {
  margin: 18px 0;
  color: var(--pp-texto-2);
  font-size: 13px;
  line-height: 1.6;
}
.orders-page__summary strong {
  color: var(--pp-marrom);
}
.orders-page__refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pp-texto-2);
  font-size: 12px;
  cursor: pointer;
}
.orders-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}
.orders-page__filters {
  display: flex;
  gap: 24px;
}
.orders-page__filters button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 12px;
  min-height: 44px;
  border: 0;
  background: transparent;
  font-size: 13px;
  color: var(--pp-texto-2);
  cursor: pointer;
  white-space: nowrap;
}
.orders-page__filters button[aria-pressed="true"] {
  color: var(--pp-marrom);
  font-weight: 700;
}
.orders-page__filters button > span:not(.orders-page__indicator) {
  font-size: 11px;
  font-weight: 500;
}
.orders-page__indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--pp-gold);
}
.orders-page__search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 260px;
  min-height: 44px;
  border-bottom: 1px solid var(--pp-creme-borda);
  color: var(--pp-texto-2);
}
.orders-page__search input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  outline: none;
  color: var(--pp-marrom);
  font-size: 14px;
}
.orders-page__search:focus-within {
  outline: 2px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.orders-page__search input::placeholder {
  color: var(--pp-texto-3);
}
.orders-page__results {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 52px;
  color: var(--pp-texto-3);
  font-size: 12px;
}
.orders-page__results button {
  min-height: 44px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--pp-dourado-profundo);
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.orders-page__featured > h2 {
  font-size: 14px;
  margin: 4px 0 14px;
  font-weight: 600;
}
.orders-page__collection {
  margin-top: 44px;
}
.orders-page__collection-heading {
  border-bottom: 1px solid var(--pp-creme-borda);
  padding-bottom: 18px;
}
.orders-page__collection-heading h2 {
  font-family: var(--pp-font-titulo);
  font-size: 30px;
  font-weight: 400;
  margin: 0 0 8px;
}
.orders-page__collection-heading p {
  margin: 0;
  font-size: 13px;
  color: var(--pp-texto-2);
  line-height: 1.6;
}
.orders-page__state {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 18px;
  padding: 50px 0 70px;
  max-width: 60ch;
}
.orders-page__state h2 {
  font-family: var(--pp-font-titulo);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 400;
  margin: 0;
}
.orders-page__state p {
  color: var(--pp-texto-2);
  margin: 0;
  line-height: 1.7;
  font-size: 15px;
}
.orders-page__state :is(a, button) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  text-decoration: none;
  cursor: pointer;
}
.orders-page__loading {
  padding: 36px 0;
  color: var(--pp-texto-2);
  font-size: 14px;
}
.orders-page__skeleton {
  height: 350px;
  border-radius: 16px;
  background: var(--pp-creme-2);
  margin-top: 22px;
}
.orders-page :is(button, a):focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (max-width: 760px) {
  .orders-page {
    margin-top: 0;
  }
  .orders-page__intro {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 18px;
  }
  .orders-page__intro h1 {
    font-size: 48px;
    gap: 12px;
  }
  .orders-page__note {
    font-size: 23px;
  }
  .orders-page__toolbar {
    gap: 10px;
  }
  .orders-page__search {
    width: 100%;
    order: -1;
  }
}
@media (max-width: 390px) {
  .orders-page__intro h1 {
    font-size: 44px;
  }
  .orders-page__note {
    font-size: 21px;
  }
  .orders-page__filters {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }
  .orders-page__filters button {
    font-size: 12px;
    gap: 5px;
  }
  .orders-page__summary {
    gap: 12px;
  }
  .orders-page__summary p {
    font-size: 12px;
  }
}
</style>
