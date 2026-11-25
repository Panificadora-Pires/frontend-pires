<template>
  <section class="admin-page kanban-page">
    <header class="kanban-header">
      <div>
        <p class="kanban-eyebrow">OPERAÇÃO DO BALCÃO</p>
        <h1>Pedidos</h1>
        <p>Acompanhe a produção por etapa, do pedido à retirada.</p>
      </div>
    </header>

    <section class="kanban-overview" aria-label="Resumo operacional">
      <div>
        <span>Em produção</span
        ><strong>{{ totalOperacao === null ? "—" : totalOperacao }}</strong
        ><small>Pedidos ativos na fila</small>
      </div>
      <div>
        <span>Prontos para retirar</span
        ><strong>{{ resumo.resumo?.prontos ?? "—" }}</strong
        ><small>Aguardando no balcão</small>
      </div>
      <div>
        <span>Mensagens novas</span
        ><strong>{{
          chat.naoLidasInicializado ? chat.naoLidas.total : "—"
        }}</strong
        ><small>Conversas com clientes</small>
      </div>
    </section>

    <div class="kanban-toolbar">
      <div
        class="kanban-modes"
        role="group"
        aria-label="Visualização de pedidos"
      >
        <button
          type="button"
          :aria-pressed="modo === 'fila'"
          :class="{ 'is-active': modo === 'fila' }"
          @click="selecionarModo('fila')"
        >
          Produção
        </button>
        <button
          type="button"
          :aria-pressed="modo === 'historico'"
          :class="{ 'is-active': modo === 'historico' }"
          @click="selecionarModo('historico')"
        >
          Histórico
        </button>
      </div>
      <div class="kanban-search" role="search">
        <Search :size="17" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          maxlength="100"
          autocomplete="off"
          aria-label="Buscar pedido, cliente ou produto"
          placeholder="Buscar pedido, cliente ou produto"
        />
        <button
          v-if="busca"
          type="button"
          class="kanban-search-clear"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="15" aria-hidden="true" />
        </button>
      </div>
      <AdminPaymentFilter v-model="pagamento" class="kanban-payment" />
    </div>

    <div v-if="chat.naoLidas.total > 0" class="kanban-messages" role="status">
      <MessageCircle :size="19" aria-hidden="true" />
      <div>
        <strong
          >{{ chat.naoLidas.total }}
          {{
            chat.naoLidas.total === 1
              ? "mensagem não lida"
              : "mensagens não lidas"
          }}</strong
        >
        <div class="kanban-message-links">
          <RouterLink
            v-for="id in pedidosComMensagem"
            :key="id"
            :to="{ name: 'admin-pedido-detalhes', params: { id } }"
            >Pedido #{{ id }} ({{ chat.naoLidasDoPedido(id) }})</RouterLink
          >
          <span v-if="chat.pedidosComNaoLidas > pedidosComMensagem.length"
            >e outros
            {{
              chat.pedidosComNaoLidas - pedidosComMensagem.length
            }}
            pedidos</span
          >
        </div>
      </div>
    </div>

    <div
      v-if="erroGlobal || erroAcao || resumo.erro"
      class="kanban-alert"
      role="alert"
    >
      <CircleAlert :size="18" aria-hidden="true" />
      <span>{{ erroAcao || erroGlobal || resumo.erro }}</span>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>

    <nav class="kanban-stage-tabs" aria-label="Selecionar etapa no celular">
      <button
        v-for="etapa in etapasVisiveis"
        :key="etapa.status"
        type="button"
        :class="{ 'is-current': abaMobile === etapa.status }"
        :data-status="etapa.status"
        :aria-current="abaMobile === etapa.status ? 'true' : undefined"
        @click="selecionarAba(etapa.status)"
      >
        <span>{{ etapa.titulo }}</span>
        <strong>{{ totalEtapa(etapa) }}</strong>
      </button>
    </nav>

    <Transition name="kanban-switch" mode="out-in">
      <div
        :key="modo"
        class="kanban-board"
        :class="{ 'is-history': modo === 'historico' }"
      >
        <section
          v-for="etapa in etapasVisiveis"
          :key="etapa.status"
          class="kanban-column"
          :data-status="etapa.status"
          :class="[
            'stage-' + etapa.status,
            { 'is-mobile-selected': abaMobile === etapa.status },
          ]"
          :aria-label="etapa.titulo"
          :aria-busy="carregando && !dados[etapa.status].inicializado"
        >
          <header class="kanban-column-head">
            <div class="kanban-column-title">
              <span class="kanban-stage-dot" aria-hidden="true"></span>
              <div>
                <h2>{{ etapa.titulo }}</h2>
                <p>{{ etapa.descricao }}</p>
              </div>
            </div>
            <span class="kanban-count">{{ totalEtapa(etapa) }}</span>
          </header>

          <div
            v-if="dados[etapa.status].erro"
            class="kanban-column-error"
            role="alert"
          >
            {{ dados[etapa.status].erro }}
          </div>
          <div
            v-if="
              !dados[etapa.status].inicializado && !dados[etapa.status].erro
            "
            class="kanban-placeholder"
            role="status"
          >
            Carregando pedidos…
          </div>
          <div
            v-else-if="
              dados[etapa.status].inicializado &&
              !dados[etapa.status].results.length
            "
            class="kanban-empty"
          >
            <ClipboardList :size="24" aria-hidden="true" />
            <strong>Nenhum pedido nesta etapa</strong>
            <span>{{
              filtrosAtivos
                ? "Tente ajustar os filtros."
                : "A fila está em dia."
            }}</span>
          </div>

          <div v-if="dados[etapa.status].inicializado" class="kanban-cards">
            <article
              v-for="pedido in dados[etapa.status].results"
              :key="pedido.id"
              :data-pedido-id="pedido.id"
              class="kanban-card"
            >
              <div class="kanban-card-top">
                <span class="kanban-order-id">#{{ pedido.id }}</span>
                <time :datetime="pedido.data">{{
                  formatarData(pedido.data)
                }}</time>
              </div>
              <strong class="kanban-client">{{
                pedido.usuario_nome || "Cliente"
              }}</strong>
              <p class="kanban-items">{{ itensDoPedido(pedido) }}</p>
              <div class="kanban-payment-details">
                <span>{{
                  pedido.forma_pagamento_display ||
                  pedido.forma_pagamento ||
                  "Pagamento não informado"
                }}</span>
                <span
                  class="kanban-payment-pill"
                  :class="'payment-' + pedido.status_pagamento"
                  >{{
                    pedido.status_pagamento_display ||
                    pedido.status_pagamento ||
                    "—"
                  }}</span
                >
              </div>
              <div class="kanban-card-bottom">
                <strong>{{ moeda(pedido.total) }}</strong>
                <span
                  v-if="chat.naoLidasDoPedido(pedido.id)"
                  class="kanban-unread"
                  ><MessageCircle :size="14" aria-hidden="true" />{{
                    chat.naoLidasDoPedido(pedido.id)
                  }}
                  nova(s)</span
                >
              </div>
              <div class="kanban-card-actions">
                <RouterLink
                  class="pp-card-action pp-admin-action--secondary"
                  data-card-action-radius
                  :to="{
                    name: 'admin-pedido-detalhes',
                    params: { id: pedido.id },
                  }"
                >
                  <CardActionContent>Ver detalhes</CardActionContent>
                </RouterLink>
                <button
                  v-if="proximaAcao(pedido)"
                  type="button"
                  class="pp-card-action pp-admin-action--primary"
                  data-card-action-radius
                  :disabled="emAcao === pedido.id"
                  @click="avancar(pedido, $event)"
                >
                  <CardActionContent>{{
                    emAcao === pedido.id
                      ? "Salvando…"
                      : proximaAcao(pedido).label
                  }}</CardActionContent>
                </button>
                <RouterLink
                  v-else-if="pedido.status === 'pronto'"
                  class="kanban-retirada pp-card-action pp-admin-action--secondary"
                  data-card-action-radius
                  :to="{
                    name: 'admin-pedido-detalhes',
                    params: { id: pedido.id },
                  }"
                >
                  <CardActionContent>Retirada / QR Code</CardActionContent>
                </RouterLink>
              </div>
              <p
                v-if="pedido.status === 'pendente' && !proximaAcao(pedido)"
                class="kanban-waiting"
              >
                Aguardando aprovação do pagamento para confirmar.
              </p>
            </article>
          </div>

          <footer
            v-if="
              dados[etapa.status].inicializado &&
              dados[etapa.status].total_pages > 1
            "
            class="kanban-page-controls"
          >
            <button
              type="button"
              :disabled="paginas[etapa.status] <= 1 || carregando"
              @click="mudarPagina(etapa.status, -1)"
              aria-label="Página anterior"
            >
              Anterior
            </button>
            <span
              >Página {{ dados[etapa.status].page }} de
              {{ dados[etapa.status].total_pages }}</span
            >
            <button
              type="button"
              :disabled="!dados[etapa.status].next || carregando"
              @click="mudarPagina(etapa.status, 1)"
              aria-label="Próxima página"
            >
              Próxima
            </button>
          </footer>
        </section>
      </div>
    </Transition>

    <p class="kanban-footer">
      Os totais vêm do Django. Cada etapa apresenta até 12 pedidos por página.
      Na retirada, valide o QR Code apresentado pelo cliente.
    </p>
  </section>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CircleAlert,
  ClipboardList,
  MessageCircle,
  Search,
  X,
} from "lucide-vue-next";

import AdminPaymentFilter from "@/components/admin/AdminPaymentFilter.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { REALTIME_ENABLED, realtimeClient } from "@/services/realtime";
import { useAdminOrdersStore } from "@/stores/adminOrders";
import { useAdminQueueSummaryStore } from "@/stores/adminQueueSummary";
import { useChatStore } from "@/stores/chat";
import {
  ETAPAS_FILA,
  ETAPAS_HISTORICO,
  TODOS_STATUS,
  itensDoPedido,
  paginaExpirada,
  proximaAcao,
} from "@/utils/adminKanban";

const route = useRoute();
const router = useRouter();
const resumo = useAdminQueueSummaryStore();
const pedidosStore = useAdminOrdersStore();
const chat = useChatStore();
const PAGE_SIZE = 12;
const statusInicial = TODOS_STATUS.includes(String(route.query.status))
  ? String(route.query.status)
  : "pendente";
const modo = ref(
  ETAPAS_HISTORICO.some((etapa) => etapa.status === statusInicial)
    ? "historico"
    : "fila",
);
const abaMobile = ref(statusInicial);
const busca = ref("");
const buscaAplicada = ref("");
const pagamento = ref("");
const dados = reactive(
  Object.fromEntries(TODOS_STATUS.map((status) => [status, paginaVazia()])),
);
const paginas = reactive(
  Object.fromEntries(TODOS_STATUS.map((status) => [status, 1])),
);
const carregando = ref(false);
const erroGlobal = ref("");
const erroAcao = ref("");
const emAcao = ref(null);
let sequencia = 0;
let debounceBusca = null;

function paginaVazia() {
  return {
    count: null,
    results: [],
    next: null,
    page: 1,
    total_pages: 1,
    inicializado: false,
    erro: "",
  };
}
const etapasVisiveis = computed(() =>
  modo.value === "historico" ? ETAPAS_HISTORICO : ETAPAS_FILA,
);
const totalOperacao = computed(() => {
  if (!resumo.resumo) return null;
  return (
    resumo.resumo.pendentes + resumo.resumo.confirmados + resumo.resumo.prontos
  );
});
const filtrosAtivos = computed(() =>
  Boolean(buscaAplicada.value || pagamento.value),
);
const pedidosComMensagem = computed(() =>
  Object.keys(chat.naoLidas.porPedido).slice(0, 5),
);
function totalEtapa(etapa) {
  const coluna = dados[etapa.status];
  const valor = filtrosAtivos.value
    ? coluna.count
    : (resumo.resumo?.[etapa.campo] ?? coluna.count);
  return valor === null || valor === undefined ? "—" : valor;
}
function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}
function formatarData(valor) {
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}
function resetarPaginas() {
  for (const status of TODOS_STATUS) {
    paginas[status] = 1;
    dados[status] = paginaVazia();
  }
}
async function carregarColunas() {
  const versao = getSessionVersion();
  const chamada = ++sequencia;
  carregando.value = true;
  erroGlobal.value = "";
  const estados = etapasVisiveis.value.map((etapa) => etapa.status);
  const filtroAtual = {
    busca: buscaAplicada.value || undefined,
    pagamento: pagamento.value || undefined,
  };
  try {
    const respostas = await Promise.allSettled(
      estados.map(async (status) => {
        const parametros = {
          page: paginas[status],
          page_size: PAGE_SIZE,
          status,
          ...filtroAtual,
        };
        try {
          return await adminService.listarPedidosPagina(parametros);
        } catch (error) {
          if (
            !paginaExpirada(error, parametros.page) ||
            chamada !== sequencia ||
            getSessionVersion() !== versao
          )
            throw error;
          paginas[status] = 1;
          return adminService.listarPedidosPagina({ ...parametros, page: 1 });
        }
      }),
    );
    if (chamada !== sequencia || getSessionVersion() !== versao) return;
    let falhas = false;
    respostas.forEach((resposta, i) => {
      const status = estados[i];
      if (resposta.status === "fulfilled") {
        dados[status] = { ...resposta.value, inicializado: true, erro: "" };
      } else {
        falhas = true;
        dados[status] = {
          ...dados[status],
          erro: "Não foi possível atualizar esta etapa.",
        };
      }
    });
    if (falhas) {
      erroGlobal.value =
        "Parte da fila não foi sincronizada. Os dados exibidos podem estar desatualizados.";
      throw new Error(erroGlobal.value);
    }
  } finally {
    if (chamada === sequencia) carregando.value = false;
  }
}
const atualizacao = useAutoRefresh(carregarColunas, { intervalo: 15_000 });
let desinscreverRealtime = null;
let timerRealtime = null;
onMounted(() => {
  if (!REALTIME_ENABLED) return;
  desinscreverRealtime = realtimeClient.inscrever((evento) => {
    if (!evento || evento.tipo.startsWith("pedido.")) {
      if (timerRealtime !== null) return;
      timerRealtime = setTimeout(() => {
        timerRealtime = null;
        void atualizacao.atualizarAgora();
      }, 400);
    }
  });
});

function aplicarFiltros() {
  sequencia += 1;
  resetarPaginas();
  void carregarColunas().catch(() => {});
}
watch(busca, (value) => {
  if (debounceBusca) clearTimeout(debounceBusca);
  debounceBusca = setTimeout(() => {
    buscaAplicada.value = value.trim();
    aplicarFiltros();
  }, 350);
});
watch(pagamento, aplicarFiltros);
watch(modo, () => {
  if (!etapasVisiveis.value.some((etapa) => etapa.status === abaMobile.value)) {
    abaMobile.value = etapasVisiveis.value[0].status;
  }
  aplicarFiltros();
});
watch(
  () => route.query.status,
  (value) => {
    const status = String(value || "");
    if (!TODOS_STATUS.includes(status)) return;
    abaMobile.value = status;
    modo.value = ETAPAS_HISTORICO.some((etapa) => etapa.status === status)
      ? "historico"
      : "fila";
  },
);
function selecionarModo(valor) {
  if (modo.value === valor) return;
  modo.value = valor;
  const status =
    valor === "fila" ? ETAPAS_FILA[0].status : ETAPAS_HISTORICO[0].status;
  selecionarAba(status);
}
function selecionarAba(status) {
  abaMobile.value = status;
  void router.replace({
    name: "admin-pedidos",
    query: { ...route.query, status },
  });
}
function mudarPagina(status, deslocamento) {
  const proxima = paginas[status] + deslocamento;
  if (proxima < 1 || proxima > dados[status].total_pages) return;
  paginas[status] = proxima;
  void carregarColunas().catch(() => {});
}
function prepararMovimentoCard(elemento) {
  if (
    !elemento ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  )
    return null;

  const origem = elemento.getBoundingClientRect();
  if (!origem.width || !origem.height) return null;

  const fantasma = elemento.cloneNode(true);
  fantasma.setAttribute("aria-hidden", "true");
  fantasma.inert = true;
  Object.assign(fantasma.style, {
    position: "fixed",
    top: `${origem.top}px`,
    left: `${origem.left}px`,
    width: `${origem.width}px`,
    height: `${origem.height}px`,
    margin: "0",
    pointerEvents: "none",
    zIndex: "1000",
    boxShadow: "0 20px 45px rgba(45, 24, 12, .18)",
    transformOrigin: "top left",
  });

  return {
    montar() {
      document.body.append(fantasma);
    },
    animar(status, id) {
      const coluna = document.querySelector(
        `.kanban-column[data-status="${status}"]`,
      );
      const alvo = coluna?.querySelector(
        `.kanban-card[data-pedido-id="${id}"]`,
      );
      let destino = alvo?.getBoundingClientRect();
      if (!destino?.width)
        destino = coluna
          ?.querySelector(".kanban-column-head")
          ?.getBoundingClientRect();
      if (!destino?.width) {
        destino = document
          .querySelector(`.kanban-stage-tabs button[data-status="${status}"]`)
          ?.getBoundingClientRect();
      }
      if (!destino?.width || !fantasma.animate) {
        fantasma.remove();
        return;
      }
      const dx = destino.left - origem.left;
      const dy = destino.top - origem.top;
      const escala = Math.min(1, destino.width / origem.width);

      const animacao = fantasma.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${escala})`,
            opacity: 0.12,
          },
        ],
        {
          duration: 520,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "forwards",
        },
      );
      animacao.finished.then(
        () => fantasma.remove(),
        () => fantasma.remove(),
      );
      alvo?.animate?.(
        [
          { opacity: 0.5, transform: "scale(.975)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 350, easing: "cubic-bezier(.22, 1, .36, 1)" },
      );
    },
    remover() {
      fantasma.remove();
    },
  };
}
async function avancar(pedido, event) {
  const acao = proximaAcao(pedido);
  if (!acao || emAcao.value !== null) return;
  const movimento = prepararMovimentoCard(
    event?.currentTarget?.closest(".kanban-card"),
  );
  emAcao.value = pedido.id;
  erroAcao.value = "";
  try {
    await pedidosStore.alterarStatus(pedido.id, acao.status);
    movimento?.montar();
    if (window.matchMedia?.("(max-width: 820px)")?.matches) {
      selecionarAba(acao.status);
    }
    await Promise.allSettled([resumo.carregar(), carregarColunas()]);
    await nextTick();
    movimento?.animar(acao.status, pedido.id);
  } catch (error) {
    movimento?.remover();
    erroAcao.value = mensagemErroApi(
      error,
      "Não foi possível atualizar o pedido.",
    );
  } finally {
    emAcao.value = null;
  }
}
function tentarNovamente() {
  erroAcao.value = "";
  void resumo.carregar().catch(() => {});
  void carregarColunas().catch(() => {});
}
onBeforeUnmount(() => {
  desinscreverRealtime?.();
  desinscreverRealtime = null;
  if (timerRealtime !== null) clearTimeout(timerRealtime);
  timerRealtime = null;
  sequencia += 1;
  if (debounceBusca) clearTimeout(debounceBusca);
});
</script>

<style scoped src="./AdminPedidosKanbanView.css"></style>
