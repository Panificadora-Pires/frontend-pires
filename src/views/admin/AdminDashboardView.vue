<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Dashboard</h1>
        <p class="admin-page-subtitle">
          Resumo da operação de hoje e dos pedidos que estão em andamento.
        </p>
      </div>
      <div class="admin-actions">
        <button
          type="button"
          class="admin-btn"
          :disabled="carregando"
          @click="carregar"
        >
          <RefreshCw :size="16" :class="{ 'admin-spin': carregando }" />
          Atualizar
        </button>
      </div>
    </header>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />
      <span>{{ erro }}</span>
    </div>

    <div class="admin-kpis">
      <article class="admin-kpi">
        <span class="admin-kpi-label">Pedidos hoje</span>
        <strong class="admin-kpi-value">{{ metricas.pedidosHoje }}</strong>
        <span class="admin-kpi-caption"
          >{{ metricas.pendentes }} aguardando confirmação</span
        >
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Prontos para retirada</span>
        <strong class="admin-kpi-value">{{ metricas.prontos }}</strong>
        <span class="admin-kpi-caption">Pedidos aguardando no balcão</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Faturamento hoje</span>
        <strong class="admin-kpi-value">{{
          formatarMoeda(metricas.faturamentoHoje)
        }}</strong>
        <span class="admin-kpi-caption"
          >{{ metricas.retiradosHoje }} pedidos retirados</span
        >
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Pagamentos pendentes</span>
        <strong class="admin-kpi-value">{{
          metricas.pagamentosPendentes
        }}</strong>
        <span class="admin-kpi-caption">Pendentes ou em processamento</span>
      </article>
    </div>

    <div class="dashboard-grid dashboard-grid--top">
      <section class="admin-card dashboard-sales">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Faturamento dos últimos 7 dias</h2>
            <span class="admin-card-meta">Somente pedidos retirados</span>
          </div>
          <RouterLink :to="{ name: 'admin-relatorios' }" class="dashboard-link"
            >Abrir relatórios <ChevronRight :size="15"
          /></RouterLink>
        </div>
        <div class="dashboard-chart">
          <AdminLineChart
            :points="vendas7dias"
            currency
            aria-label="Faturamento dos últimos sete dias"
          />
        </div>
      </section>

      <aside class="admin-card dashboard-queue">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Fila operacional</h2>
        </div>
        <div class="dashboard-queue__list">
          <RouterLink
            :to="{ name: 'admin-pedidos', query: { status: 'pendente' } }"
            class="dashboard-queue__row"
          >
            <span
              class="dashboard-queue__dot dashboard-queue__dot--warning"
            ></span>
            <div>
              <strong>Pendentes</strong><span>Aguardando confirmação</span>
            </div>
            <b>{{ metricas.pendentes }}</b>
          </RouterLink>
          <RouterLink
            :to="{ name: 'admin-pedidos', query: { status: 'confirmado' } }"
            class="dashboard-queue__row"
          >
            <span
              class="dashboard-queue__dot dashboard-queue__dot--info"
            ></span>
            <div><strong>Confirmados</strong><span>Em preparo</span></div>
            <b>{{ metricas.confirmados }}</b>
          </RouterLink>
          <RouterLink
            :to="{ name: 'admin-pedidos', query: { status: 'pronto' } }"
            class="dashboard-queue__row"
          >
            <span
              class="dashboard-queue__dot dashboard-queue__dot--success"
            ></span>
            <div><strong>Prontos</strong><span>Aguardando retirada</span></div>
            <b>{{ metricas.prontos }}</b>
          </RouterLink>
        </div>
        <div class="dashboard-catalog-summary">
          <div>
            <span>Produtos ativos</span
            ><strong>{{ metricas.produtosAtivos }}</strong>
          </div>
          <div>
            <span>Promoções ativas</span
            ><strong>{{ metricas.promocoesAtivas }}</strong>
          </div>
        </div>
      </aside>
    </div>

    <section class="admin-card dashboard-orders">
      <div class="admin-card-header">
        <div>
          <h2 class="admin-card-title">Pedidos recentes</h2>
          <span class="admin-card-meta">Últimos pedidos registrados</span>
        </div>
        <RouterLink :to="{ name: 'admin-pedidos' }" class="dashboard-link"
          >Ver todos <ChevronRight :size="15"
        /></RouterLink>
      </div>

      <div v-if="carregando && !pedidosRecentes.length" class="admin-loading">
        Carregando pedidos...
      </div>
      <div v-else-if="!pedidosRecentes.length" class="admin-empty">
        <ClipboardList :size="26" />
        <strong>Nenhum pedido registrado</strong>
      </div>
      <div v-else class="admin-table-wrap dashboard-table-wrap">
        <table class="admin-table dashboard-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pedido in pedidosRecentes" :key="pedido.id">
              <td>
                <strong>#{{ pedido.id }}</strong
                ><small>{{ resumoItens(pedido) }}</small>
              </td>
              <td>
                <strong>{{ pedido.usuario_nome || "Cliente" }}</strong>
              </td>
              <td>{{ formatarData(pedido.data) }}</td>
              <td>
                <span class="admin-badge" :class="badgePedido(pedido.status)">{{
                  pedido.status_display || pedido.status
                }}</span>
              </td>
              <td>
                <span>{{
                  pedido.forma_pagamento_display ||
                  pedido.forma_pagamento ||
                  "—"
                }}</span
                ><small>{{
                  pedido.status_pagamento_display ||
                  pedido.status_pagamento ||
                  ""
                }}</small>
              </td>
              <td>
                <strong>{{ formatarMoeda(pedido.total) }}</strong>
              </td>
              <td>
                <RouterLink
                  :to="{
                    name: 'admin-pedido-detalhes',
                    params: { id: pedido.id },
                  }"
                  class="dashboard-link"
                  >Abrir</RouterLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
  ChevronRight,
  CircleAlert,
  ClipboardList,
  RefreshCw,
} from "lucide-vue-next";

import AdminLineChart from "@/components/admin/AdminLineChart.vue";
import adminService from "@/services/admin.service";

const carregando = ref(false);
const erro = ref("");
const pedidos = ref([]);
const produtosAtivos = ref([]);
const promocoes = ref([]);
const relatorioHoje = ref(null);

function dataISO(data = new Date()) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const hojeISO = () => dataISO(new Date());
const pedidosRecentes = computed(() => pedidos.value.slice(0, 8));

const metricas = computed(() => {
  const hoje = hojeISO();
  const pedidosHoje = pedidos.value.filter(
    (pedido) => String(pedido.data || "").slice(0, 10) === hoje,
  );
  return {
    pedidosHoje: pedidosHoje.length,
    pendentes: pedidos.value.filter((p) => p.status === "pendente").length,
    confirmados: pedidos.value.filter((p) => p.status === "confirmado").length,
    prontos: pedidos.value.filter((p) => p.status === "pronto").length,
    retiradosHoje: Number(relatorioHoje.value?.total_pedidos || 0),
    faturamentoHoje: Number(relatorioHoje.value?.total_vendido || 0),
    produtosAtivos: produtosAtivos.value.length,
    promocoesAtivas: promocoes.value.filter(promocaoAtiva).length,
    pagamentosPendentes: pedidos.value.filter((p) =>
      ["pendente", "processando"].includes(p.status_pagamento),
    ).length,
  };
});

const vendas7dias = computed(() => {
  const pontos = [];
  const hoje = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate() - offset,
    );
    const iso = dataISO(dia);
    const total = pedidos.value
      .filter(
        (p) =>
          p.status === "retirado" &&
          String(p.status_atualizado_em || p.data || "").slice(0, 10) === iso,
      )
      .reduce((soma, p) => soma + Number(p.total || 0), 0);
    pontos.push({
      label: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(dia),
      value: total,
    });
  }
  return pontos;
});

function promocaoAtiva(promocao) {
  const hoje = hojeISO();
  return promocao.data_inicio <= hoje && promocao.data_fim >= hoje;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function formatarData(valor) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function resumoItens(pedido) {
  const total = (pedido.itens || []).reduce(
    (soma, item) => soma + Number(item.quantidade || 0),
    0,
  );
  return `${total} ${total === 1 ? "item" : "itens"}`;
}

function badgePedido(status) {
  if (status === "pendente") return "admin-badge--warning";
  if (status === "confirmado") return "admin-badge--info";
  if (status === "pronto") return "admin-badge--success";
  if (status === "cancelado") return "admin-badge--danger";
  return "admin-badge--neutral";
}

async function carregar() {
  carregando.value = true;
  erro.value = "";
  const hoje = hojeISO();
  try {
    const [listaPedidos, listaProdutos, listaPromocoes, relatorio] =
      await Promise.all([
        adminService.listarPedidos(),
        adminService.listarProdutos({ ativo: true }),
        adminService.listarPromocoes(),
        adminService.relatorioVendas({ dataInicio: hoje, dataFim: hoje }),
      ]);
    pedidos.value = listaPedidos;
    produtosAtivos.value = listaProdutos;
    promocoes.value = listaPromocoes;
    relatorioHoje.value = relatorio;
  } catch {
    erro.value = "Não foi possível carregar todos os dados do dashboard.";
  } finally {
    carregando.value = false;
  }
}

onMounted(carregar);
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}
.dashboard-grid--top {
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.75fr);
}
.dashboard-chart {
  padding: 16px 18px 8px;
}
.dashboard-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--admin-accent);
  font-size: 12px;
  font-weight: 700;
}
.dashboard-link:hover {
  color: var(--admin-accent-hover);
}
.dashboard-queue__list {
  padding: 4px 16px 10px;
}
.dashboard-queue__row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  border-bottom: 1px solid #efeeec;
  color: inherit;
}
.dashboard-queue__row:last-child {
  border-bottom: 0;
}
.dashboard-queue__row div strong,
.dashboard-queue__row div span {
  display: block;
}
.dashboard-queue__row div strong {
  color: var(--admin-text);
  font-size: 13px;
}
.dashboard-queue__row div span {
  margin-top: 3px;
  color: var(--admin-muted);
  font-size: 11px;
}
.dashboard-queue__row b {
  color: var(--admin-text);
  font-size: 18px;
}
.dashboard-queue__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dashboard-queue__dot--warning {
  background: #d97706;
}
.dashboard-queue__dot--info {
  background: #2563eb;
}
.dashboard-queue__dot--success {
  background: #16a34a;
}
.dashboard-catalog-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 16px 16px;
  border-top: 1px solid var(--admin-border);
  background: var(--admin-surface-subtle);
}
.dashboard-catalog-summary div {
  min-width: 0;
}
.dashboard-catalog-summary span,
.dashboard-catalog-summary strong {
  display: block;
}
.dashboard-catalog-summary span {
  color: var(--admin-muted);
  font-size: 11px;
}
.dashboard-catalog-summary strong {
  margin-top: 4px;
  color: var(--admin-text);
  font-size: 17px;
}
.dashboard-orders {
  overflow: hidden;
}
.dashboard-table-wrap {
  border: 0;
  border-radius: 0 0 var(--admin-radius-lg) var(--admin-radius-lg);
  box-shadow: none;
}
@media (max-width: 1100px) {
  .dashboard-grid--top {
    grid-template-columns: 1fr;
  }
}
</style>
