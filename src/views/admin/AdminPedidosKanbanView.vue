<template>
  <section class="admin-page kanban-page">
    <header class="kanban-header">
      <div>
        <p class="kanban-eyebrow">OPERAÇÃO DO BALCÃO</p>
        <h1>Pedidos</h1>
        <p>Acompanhe a produção por etapa, do pedido à retirada.</p>
      </div>
      <div class="kanban-synced" role="status">
        <span class="kanban-live-dot" :class="{ 'is-error': erroGlobal || resumo.erro }" aria-hidden="true"></span>
        <span>{{ erroGlobal || resumo.erro ? "Conexão instável · tentando novamente" : carregando ? "Sincronizando fila…" : "Fila atualizada automaticamente" }}</span>
      </div>
    </header>

    <section class="kanban-overview" aria-label="Resumo operacional">
      <div><span>Em produção</span><strong>{{ totalOperacao === null ? "—" : totalOperacao }}</strong><small>Pedidos ativos na fila</small></div>
      <div><span>Prontos para retirar</span><strong>{{ resumo.resumo?.prontos ?? "—" }}</strong><small>Aguardando no balcão</small></div>
      <div><span>Mensagens novas</span><strong>{{ chat.naoLidasInicializado ? chat.naoLidas.total : "—" }}</strong><small>Conversas com clientes</small></div>
    </section>

    <div class="kanban-toolbar">
      <div class="kanban-modes" role="group" aria-label="Visualização de pedidos">
        <button type="button" :aria-pressed="modo === 'fila'" :class="{ 'is-active': modo === 'fila' }" @click="selecionarModo('fila')">Produção</button>
        <button type="button" :aria-pressed="modo === 'historico'" :class="{ 'is-active': modo === 'historico' }" @click="selecionarModo('historico')">Histórico</button>
      </div>
      <label class="kanban-search">
        <Search :size="17" aria-hidden="true" />
        <span class="sr-only">Buscar pedido, cliente ou produto</span>
        <input v-model="busca" type="search" maxlength="100" autocomplete="off" placeholder="Buscar pedido, cliente ou produto" />
      </label>
      <label class="kanban-payment">
        <span class="sr-only">Filtrar por pagamento</span>
        <select v-model="pagamento">
          <option value="">Todos os pagamentos</option>
          <option value="pendente">Pendente</option>
          <option value="processando">Processando</option>
          <option value="aprovado">Aprovado</option>
          <option value="recusado">Recusado</option>
          <option value="cancelado">Cancelado</option>
          <option value="reembolsado">Reembolsado</option>
          <option value="erro">Erro</option>
        </select>
      </label>
    </div>

    <div v-if="chat.naoLidas.total > 0" class="kanban-messages" role="status">
      <MessageCircle :size="19" aria-hidden="true" />
      <div>
        <strong>{{ chat.naoLidas.total }} {{ chat.naoLidas.total === 1 ? "mensagem não lida" : "mensagens não lidas" }}</strong>
        <div class="kanban-message-links">
          <RouterLink
            v-for="id in pedidosComMensagem"
            :key="id"
            :to="{ name: 'admin-pedido-detalhes', params: { id } }"
          >Pedido #{{ id }} ({{ chat.naoLidasDoPedido(id) }})</RouterLink>
          <span v-if="chat.pedidosComNaoLidas > pedidosComMensagem.length">e outros {{ chat.pedidosComNaoLidas - pedidosComMensagem.length }} pedidos</span>
        </div>
      </div>
    </div>

    <div v-if="erroGlobal || erroAcao || resumo.erro" class="kanban-alert" role="alert">
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
        :aria-current="abaMobile === etapa.status ? 'true' : undefined"
        @click="selecionarAba(etapa.status)"
      >
        <span>{{ etapa.titulo }}</span>
        <strong>{{ totalEtapa(etapa) }}</strong>
      </button>
    </nav>

    <div class="kanban-board" :class="{ 'is-history': modo === 'historico' }">
      <section
        v-for="etapa in etapasVisiveis"
        :key="etapa.status"
        class="kanban-column"
        :class="['stage-' + etapa.status, { 'is-mobile-selected': abaMobile === etapa.status }]"
        :aria-label="etapa.titulo"
        :aria-busy="carregando && !dados[etapa.status].inicializado"
      >
        <header class="kanban-column-head">
          <div class="kanban-column-title">
            <span class="kanban-stage-dot" aria-hidden="true"></span>
            <div><h2>{{ etapa.titulo }}</h2><p>{{ etapa.descricao }}</p></div>
          </div>
          <span class="kanban-count">{{ totalEtapa(etapa) }}</span>
        </header>

        <div v-if="dados[etapa.status].erro" class="kanban-column-error" role="alert">
          {{ dados[etapa.status].erro }}
        </div>
        <div v-if="!dados[etapa.status].inicializado && !dados[etapa.status].erro" class="kanban-placeholder" role="status">
          Carregando pedidos…
        </div>
        <div v-else-if="dados[etapa.status].inicializado && !dados[etapa.status].results.length" class="kanban-empty">
          <ClipboardList :size="24" aria-hidden="true" />
          <strong>Nenhum pedido nesta etapa</strong>
          <span>{{ filtrosAtivos ? "Tente ajustar os filtros." : "A fila está em dia." }}</span>
        </div>

        <div v-if="dados[etapa.status].inicializado" class="kanban-cards">
          <article v-for="pedido in dados[etapa.status].results" :key="pedido.id" class="kanban-card">
            <div class="kanban-card-top">
              <span class="kanban-order-id">#{{ pedido.id }}</span>
              <time :datetime="pedido.data">{{ formatarData(pedido.data) }}</time>
            </div>
            <strong class="kanban-client">{{ pedido.usuario_nome || "Cliente" }}</strong>
            <p class="kanban-items">{{ itensDoPedido(pedido) }}</p>
            <div class="kanban-payment-details">
              <span>{{ pedido.forma_pagamento_display || pedido.forma_pagamento || "Pagamento não informado" }}</span>
              <span class="kanban-payment-pill" :class="'payment-' + pedido.status_pagamento">{{ pedido.status_pagamento_display || pedido.status_pagamento || "—" }}</span>
            </div>
            <div class="kanban-card-bottom">
              <strong>{{ moeda(pedido.total) }}</strong>
              <span v-if="chat.naoLidasDoPedido(pedido.id)" class="kanban-unread"><MessageCircle :size="14" aria-hidden="true" />{{ chat.naoLidasDoPedido(pedido.id) }} nova(s)</span>
            </div>
            <div class="kanban-card-actions">
              <RouterLink :to="{ name: 'admin-pedido-detalhes', params: { id: pedido.id } }">Ver detalhes</RouterLink>
              <button
                v-if="proximaAcao(pedido)"
                type="button"
                :disabled="emAcao === pedido.id"
                @click="avancar(pedido)"
              >{{ emAcao === pedido.id ? "Salvando…" : proximaAcao(pedido).label }}</button>
              <RouterLink v-else-if="pedido.status === 'pronto'" class="kanban-retirada" :to="{ name: 'admin-pedido-detalhes', params: { id: pedido.id } }">Retirada / QR Code</RouterLink>
            </div>
            <p v-if="pedido.status === 'pendente' && !proximaAcao(pedido)" class="kanban-waiting">Aguardando aprovação do pagamento para confirmar.</p>
          </article>
        </div>

        <footer v-if="dados[etapa.status].inicializado && dados[etapa.status].total_pages > 1" class="kanban-page-controls">
          <button type="button" :disabled="paginas[etapa.status] <= 1 || carregando" @click="mudarPagina(etapa.status, -1)" aria-label="Página anterior">Anterior</button>
          <span>Página {{ dados[etapa.status].page }} de {{ dados[etapa.status].total_pages }}</span>
          <button type="button" :disabled="!dados[etapa.status].next || carregando" @click="mudarPagina(etapa.status, 1)" aria-label="Próxima página">Próxima</button>
        </footer>
      </section>
    </div>

    <p class="kanban-footer">Os números da operação vêm do Django. Cada etapa carrega até 12 pedidos por página e é sincronizada automaticamente. Para retirar pedidos, utilize os detalhes e o QR Code.</p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CircleAlert, ClipboardList, MessageCircle, Search } from "lucide-vue-next";

import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { useAdminOrdersStore } from "@/stores/adminOrders";
import { useAdminQueueSummaryStore } from "@/stores/adminQueueSummary";
import { useChatStore } from "@/stores/chat";
import { ETAPAS_FILA, ETAPAS_HISTORICO, TODOS_STATUS, itensDoPedido, proximaAcao } from "@/utils/adminKanban";

const route = useRoute();
const router = useRouter();
const resumo = useAdminQueueSummaryStore();
const pedidosStore = useAdminOrdersStore();
const chat = useChatStore();
const PAGE_SIZE = 12;
const statusInicial = TODOS_STATUS.includes(String(route.query.status)) ? String(route.query.status) : "pendente";
const modo = ref(ETAPAS_HISTORICO.some(etapa => etapa.status === statusInicial) ? "historico" : "fila");
const abaMobile = ref(statusInicial);
const busca = ref("");
const buscaAplicada = ref("");
const pagamento = ref("");
const dados = reactive(Object.fromEntries(TODOS_STATUS.map(status => [status, paginaVazia()])));
const paginas = reactive(Object.fromEntries(TODOS_STATUS.map(status => [status, 1])));
const carregando = ref(false);
const erroGlobal = ref("");
const erroAcao = ref("");
const emAcao = ref(null);
let sequencia = 0;
let debounceBusca = null;

function paginaVazia() {
  return { count: null, results: [], next: null, page: 1, total_pages: 1, inicializado: false, erro: "" };
}
const etapasVisiveis = computed(() => modo.value === "historico" ? ETAPAS_HISTORICO : ETAPAS_FILA);
const totalOperacao = computed(() => {
  if (!resumo.resumo) return null;
  return resumo.resumo.pendentes + resumo.resumo.confirmados + resumo.resumo.prontos;
});
const filtrosAtivos = computed(() => Boolean(buscaAplicada.value || pagamento.value));
const pedidosComMensagem = computed(() => Object.keys(chat.naoLidas.porPedido).slice(0, 5));
function totalEtapa(etapa) {
  const coluna = dados[etapa.status];
  const valor = filtrosAtivos.value ? coluna.count : resumo.resumo?.[etapa.campo] ?? coluna.count;
  return valor === null || valor === undefined ? "—" : valor;
}
function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}
function formatarData(valor) {
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(data);
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
  const estados = etapasVisiveis.value.map(etapa => etapa.status);
  const filtroAtual = { busca: buscaAplicada.value || undefined, pagamento: pagamento.value || undefined };
  try {
    const respostas = await Promise.allSettled(estados.map(status =>
      adminService.listarPedidosPagina({
        page: paginas[status], page_size: PAGE_SIZE, status,
        ...filtroAtual,
      })
    ));
    if (chamada !== sequencia || getSessionVersion() !== versao) return;
    let falhas = false;
    respostas.forEach((resposta, i) => {
      const status = estados[i];
      if (resposta.status === "fulfilled") {
        dados[status] = { ...resposta.value, inicializado: true, erro: "" };
      } else {
        falhas = true;
        dados[status] = { ...dados[status], erro: "Não foi possível atualizar esta etapa." };
      }
    });
    if (falhas) {
      erroGlobal.value = "Parte da fila não foi sincronizada. Os dados exibidos podem estar desatualizados.";
      throw new Error(erroGlobal.value);
    }
  } finally {
    if (chamada === sequencia) carregando.value = false;
  }
}
const atualizacao = useAutoRefresh(carregarColunas, { intervalo: 15_000 });

function aplicarFiltros() {
  sequencia += 1;
  resetarPaginas();
  void carregarColunas().catch(() => {});
}
watch(busca, value => {
  if (debounceBusca) clearTimeout(debounceBusca);
  debounceBusca = setTimeout(() => {
    buscaAplicada.value = value.trim();
    aplicarFiltros();
  }, 350);
});
watch(pagamento, aplicarFiltros);
watch(modo, () => {
  if (!etapasVisiveis.value.some(etapa => etapa.status === abaMobile.value)) {
    abaMobile.value = etapasVisiveis.value[0].status;
  }
  aplicarFiltros();
});
watch(() => route.query.status, value => {
  const status = String(value || "");
  if (!TODOS_STATUS.includes(status)) return;
  abaMobile.value = status;
  modo.value = ETAPAS_HISTORICO.some(etapa => etapa.status === status) ? "historico" : "fila";
});
function selecionarModo(valor) {
  if (modo.value === valor) return;
  modo.value = valor;
  const status = valor === "fila" ? ETAPAS_FILA[0].status : ETAPAS_HISTORICO[0].status;
  selecionarAba(status);
}
function selecionarAba(status) {
  abaMobile.value = status;
  void router.replace({ name: "admin-pedidos", query: { ...route.query, status } });
}
function mudarPagina(status, deslocamento) {
  const proxima = paginas[status] + deslocamento;
  if (proxima < 1 || proxima > dados[status].total_pages) return;
  paginas[status] = proxima;
  void carregarColunas().catch(() => {});
}
async function avancar(pedido) {
  const acao = proximaAcao(pedido);
  if (!acao || emAcao.value !== null) return;
  emAcao.value = pedido.id;
  erroAcao.value = "";
  try {
    await pedidosStore.alterarStatus(pedido.id, acao.status);
    await Promise.allSettled([resumo.carregar(), carregarColunas()]);
  } catch (error) {
    erroAcao.value = mensagemErroApi(error, "Não foi possível atualizar o pedido.");
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
  sequencia += 1;
  if (debounceBusca) clearTimeout(debounceBusca);
});
</script>

<style scoped>
.kanban-page{color:var(--pp-admin-text)}
.kanban-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}
.kanban-header h1{font-size:30px;letter-spacing:-.03em;line-height:1.2;margin:7px 0 6px}
.kanban-header p{margin:0;color:var(--pp-admin-muted);font-size:14px;line-height:1.5}
.kanban-header .kanban-eyebrow{font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--pp-admin-accent)}
.kanban-synced{display:flex;align-items:center;gap:8px;flex:none;color:var(--pp-admin-muted);font-size:12px;padding:10px 0}
.kanban-live-dot{height:7px;width:7px;border-radius:50%;background:var(--pp-admin-success);box-shadow:0 0 0 4px var(--pp-admin-success-bg)}
.kanban-live-dot.is-error{background:var(--pp-admin-danger);box-shadow:0 0 0 4px var(--pp-admin-danger-bg)}
.kanban-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}
.kanban-overview>div{display:flex;flex-direction:column;gap:4px;padding:18px 20px;background:var(--pp-creme-2);border-radius:12px}
.kanban-overview span{font-size:12px;color:var(--pp-admin-muted)}.kanban-overview strong{font-size:27px;font-variant-numeric:tabular-nums}.kanban-overview small{font-size:12px;color:var(--pp-admin-muted)}
.kanban-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.kanban-modes{display:flex;gap:2px;padding:4px;background:var(--pp-creme-2);border-radius:10px}
.kanban-modes button{border:0;background:transparent;color:var(--pp-admin-muted);border-radius:7px;min-height:38px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}
.kanban-modes button.is-active{background:var(--pp-admin-surface);color:var(--pp-admin-text);box-shadow:0 1px 4px #39210e12}
.kanban-search{display:flex;align-items:center;gap:10px;flex:1;min-width:210px;max-width:410px;background:var(--pp-admin-surface);border:1px solid var(--pp-admin-border);border-radius:9px;padding:0 12px;min-height:46px;color:var(--pp-admin-muted)}
.kanban-search input{min-width:0;width:100%;height:44px;background:transparent;border:0;outline:0;color:var(--pp-admin-text);font-size:13px}
.kanban-payment{margin-left:auto}.kanban-payment select{height:46px;min-width:174px;padding:0 12px;background:var(--pp-admin-surface);border:1px solid var(--pp-admin-border);border-radius:9px;color:var(--pp-admin-text)}
.kanban-messages{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--pp-admin-warning-bg);border-radius:10px;margin-bottom:18px;font-size:13px}.kanban-messages>svg{flex:none;color:var(--pp-admin-accent)}
.kanban-messages strong{display:block;margin-bottom:7px}.kanban-message-links{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap}.kanban-message-links a{color:var(--pp-admin-accent);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.kanban-alert{display:flex;align-items:center;gap:10px;padding:13px 15px;background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger);border-radius:9px;margin-bottom:18px;font-size:13px}.kanban-alert span{flex:1}.kanban-alert button{color:inherit;border:1px solid currentColor;background:transparent;padding:9px 12px;border-radius:7px;cursor:pointer}
.kanban-stage-tabs{display:none}
.kanban-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}.kanban-board.is-history{grid-template-columns:repeat(2,minmax(0,1fr))}
.kanban-column{min-width:0;padding:14px;background:var(--pp-creme-2);border:1px solid var(--pp-admin-border);border-radius:14px}
.kanban-column-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 3px 18px}
.kanban-column-title{display:flex;gap:10px;align-items:center;min-width:0}.kanban-column-title h2{font-size:15px;font-weight:650;margin:0 0 3px}.kanban-column-title p{font-size:12px;color:var(--pp-admin-muted);margin:0}
.kanban-stage-dot{width:10px;height:10px;flex:none;border-radius:50%;background:var(--pp-admin-accent)}
.stage-confirmado .kanban-stage-dot{background:var(--pp-marrom-2)}.stage-pronto .kanban-stage-dot,.stage-retirado .kanban-stage-dot{background:var(--pp-admin-success)}.stage-cancelado .kanban-stage-dot{background:var(--pp-admin-danger)}
.kanban-count{display:grid;place-items:center;min-width:32px;height:28px;padding:0 7px;border-radius:8px;background:var(--pp-admin-surface);font-size:13px;font-weight:650;font-variant-numeric:tabular-nums}
.kanban-cards{display:grid;gap:10px}
.kanban-card{min-width:0;border:1px solid var(--pp-admin-border);background:var(--pp-admin-surface);border-radius:11px;padding:15px;box-shadow:0 3px 10px #321c0a08}
.kanban-card-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px}.kanban-order-id{font-size:13px;font-weight:750;color:var(--pp-admin-accent)}.kanban-card time{font-size:11px;color:var(--pp-admin-muted)}
.kanban-client{font-size:15px;line-height:1.4;display:block;overflow-wrap:anywhere}.kanban-items{color:var(--pp-admin-muted);font-size:12px;line-height:1.55;margin:7px 0 12px;overflow-wrap:anywhere}
.kanban-payment-details{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--pp-admin-muted);font-size:11px}
.kanban-payment-pill{display:inline-flex;align-items:center;border-radius:6px;padding:4px 6px;background:var(--pp-creme-2);color:var(--pp-admin-text);font-weight:600}
.payment-aprovado{background:var(--pp-admin-success-bg)}.payment-pendente,.payment-processando{background:var(--pp-admin-warning-bg)}.payment-recusado,.payment-erro{background:var(--pp-admin-danger-bg)}
.kanban-card-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid var(--pp-admin-border);margin-top:14px;padding-top:12px}.kanban-card-bottom strong{font-size:16px;font-variant-numeric:tabular-nums}
.kanban-unread{display:inline-flex;align-items:center;gap:4px;color:var(--pp-admin-accent);font-size:11px;font-weight:600}
.kanban-card-actions{display:flex;gap:8px;align-items:center;margin-top:12px}.kanban-card-actions a,.kanban-card-actions button{display:grid;place-items:center;flex:1;min-height:40px;padding:8px 10px;border:1px solid var(--pp-admin-border);border-radius:8px;background:transparent;color:var(--pp-admin-text);text-decoration:none;font-size:12px;font-weight:650;text-align:center;cursor:pointer}
.kanban-card-actions button,.kanban-card-actions .kanban-retirada{background:var(--pp-admin-text);color:var(--pp-admin-bg);border-color:var(--pp-admin-text)}
.kanban-card-actions button:disabled{cursor:wait;opacity:.6}
.kanban-waiting{color:var(--pp-admin-muted);font-size:11px;margin:10px 0 0;line-height:1.5}
.kanban-empty,.kanban-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;min-height:185px;padding:16px;text-align:center;color:var(--pp-admin-muted);font-size:13px}.kanban-empty strong{color:var(--pp-admin-text);font-size:13px}
.kanban-column-error{padding:12px;margin-bottom:12px;color:var(--pp-admin-danger);background:var(--pp-admin-danger-bg);border-radius:8px;font-size:12px}
.kanban-page-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--pp-admin-border);font-size:11px;color:var(--pp-admin-muted);font-variant-numeric:tabular-nums}
.kanban-page-controls button{border:1px solid var(--pp-admin-border);background:var(--pp-admin-surface);padding:8px;border-radius:7px;color:var(--pp-admin-text);font-weight:600;cursor:pointer}.kanban-page-controls button:disabled{opacity:.45;cursor:default}
.kanban-footer{font-size:12px;color:var(--pp-admin-muted);margin:20px 0 0;line-height:1.6}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kanban-page button:focus-visible,.kanban-page a:focus-visible,.kanban-page input:focus-visible,.kanban-page select:focus-visible{outline:3px solid var(--pp-admin-accent);outline-offset:3px}
@media(max-width:1200px){.kanban-board{gap:10px}.kanban-column{padding:10px}.kanban-card{padding:12px}}
@media(max-width:820px){
  .kanban-header{display:block}.kanban-synced{padding:10px 0 0}
  .kanban-overview{gap:8px}.kanban-overview>div{padding:14px}.kanban-overview strong{font-size:22px}
  .kanban-toolbar{display:grid;grid-template-columns:1fr 1fr}.kanban-modes{grid-column:1/-1;justify-content:stretch}.kanban-modes button{flex:1}
  .kanban-search{grid-column:1/-1;max-width:none;min-width:0}.kanban-payment{grid-column:1/-1;margin:0}.kanban-payment select{width:100%}
  .kanban-stage-tabs{display:flex;overflow-x:auto;gap:8px;margin-bottom:12px;padding-bottom:4px}
  .kanban-stage-tabs button{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:max-content;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);min-height:44px;padding:8px 12px;color:var(--pp-admin-text);font-size:13px;cursor:pointer}
  .kanban-stage-tabs button.is-current{border-color:var(--pp-admin-accent);background:var(--pp-admin-warning-bg)}
  .kanban-stage-tabs strong{font-size:13px}
  .kanban-board,.kanban-board.is-history{display:block}.kanban-column{display:none;padding:14px}.kanban-column.is-mobile-selected{display:block}
}
@media(max-width:440px){.kanban-header h1{font-size:27px}.kanban-overview{grid-template-columns:1fr 1fr}.kanban-overview>div:nth-child(3){grid-column:1/-1}.kanban-overview>div:nth-child(3) strong{font-size:22px}.kanban-toolbar{grid-template-columns:1fr}.kanban-card{padding:14px}}
@media(prefers-reduced-motion:reduce){.kanban-page *{transition:none!important;animation:none!important}}
</style>
