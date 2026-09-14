<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Relatórios</h1>
        <p class="admin-page-subtitle">
          Acompanhe faturamento, volume de vendas, produtos e formas de
          pagamento por período.
        </p>
      </div>
    </header>

    <section class="report-filter admin-card">
      <div class="report-shortcuts">
        <button
          type="button"
          :class="{ active: atalhoAtivo === '7d' }"
          @click="aplicarAtalho('7d')"
        >
          7 dias
        </button>
        <button
          type="button"
          :class="{ active: atalhoAtivo === '30d' }"
          @click="aplicarAtalho('30d')"
        >
          30 dias
        </button>
        <button
          type="button"
          :class="{ active: atalhoAtivo === 'mes' }"
          @click="aplicarAtalho('mes')"
        >
          Este mês
        </button>
      </div>
      <form class="report-dates" @submit.prevent="carregar">
        <label class="admin-field">
          <span class="admin-field-label">Data inicial</span>
          <input
            v-model="inicio"
            type="date"
            required
            @change="atalhoAtivo = ''"
          />
        </label>
        <label class="admin-field">
          <span class="admin-field-label">Data final</span>
          <input
            v-model="fim"
            type="date"
            required
            @change="atalhoAtivo = ''"
          />
        </label>
        <button class="admin-btn admin-btn--primary" :disabled="carregando">
          <RefreshCw v-if="carregando" :size="16" class="admin-spin" />
          <Search v-else :size="16" />
          Atualizar relatório
        </button>
      </form>
    </section>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />
      <span>{{ erro }}</span>
    </div>

    <div class="admin-kpis report-kpis">
      <article class="admin-kpi">
        <span class="admin-kpi-label">Faturamento</span>
        <strong class="admin-kpi-value">{{
          moeda(relatorio?.total_vendido)
        }}</strong>
        <span class="admin-kpi-caption">Pedidos efetivamente retirados</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Pedidos vendidos</span>
        <strong class="admin-kpi-value">{{
          relatorio?.total_pedidos ?? 0
        }}</strong>
        <span class="admin-kpi-caption">Volume concluído no período</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Ticket médio</span>
        <strong class="admin-kpi-value">{{
          moeda(relatorio?.ticket_medio)
        }}</strong>
        <span class="admin-kpi-caption">Valor médio por pedido</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Itens vendidos</span>
        <strong class="admin-kpi-value">{{ totalItensVendidos }}</strong>
        <span class="admin-kpi-caption">Quantidade somada dos produtos</span>
      </article>
    </div>

    <div class="report-grid report-grid--main">
      <section class="admin-card report-chart-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Faturamento por dia</h2>
            <span class="admin-card-meta">{{ periodoLabel }}</span>
          </div>
        </div>
        <div class="report-chart-body">
          <AdminLineChart
            :points="serieFaturamento"
            currency
            aria-label="Faturamento diário do período"
          />
        </div>
      </section>

      <section class="admin-card report-chart-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Formas de pagamento</h2>
            <span class="admin-card-meta">Pedidos retirados</span>
          </div>
        </div>
        <div class="report-donut-body">
          <AdminDonutChart
            :items="formasPagamento"
            center-label="pedidos"
            aria-label="Distribuição das formas de pagamento"
          />
        </div>
      </section>
    </div>

    <div class="report-grid report-grid--secondary">
      <section class="admin-card report-chart-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Produtos mais vendidos</h2>
            <span class="admin-card-meta">Quantidade de unidades</span>
          </div>
        </div>
        <div class="report-bar-body">
          <AdminBarChart :items="rankingGrafico" suffix="un." />
        </div>
      </section>

      <section class="admin-card report-chart-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Pedidos no período</h2>
            <span class="admin-card-meta">Distribuição por status atual</span>
          </div>
        </div>
        <div class="report-status-list">
          <div
            v-for="item in statusDistribuicao"
            :key="item.label"
            class="report-status-row"
          >
            <div>
              <span
                class="report-status-dot"
                :style="{ background: item.color }"
              ></span
              ><strong>{{ item.label }}</strong>
            </div>
            <span>{{ item.value }}</span>
          </div>
        </div>
      </section>
    </div>

    <section class="admin-card report-ranking-table">
      <div class="admin-card-header">
        <div>
          <h2 class="admin-card-title">Ranking de produtos</h2>
          <span class="admin-card-meta"
            >Até 10 produtos com maior quantidade vendida</span
          >
        </div>
      </div>
      <div v-if="!ranking.length" class="admin-empty">
        Nenhuma venda retirada no período selecionado.
      </div>
      <div v-else class="admin-table-wrap report-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Produto</th>
              <th>Código</th>
              <th>Quantidade vendida</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in ranking" :key="item.produto_id">
              <td>
                <strong>{{ index + 1 }}º</strong>
              </td>
              <td>
                <strong>{{ item.produto_nome }}</strong>
              </td>
              <td>{{ item.produto_codigo }}</td>
              <td>
                <strong>{{ item.quantidade_vendida }} un.</strong>
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
import { CircleAlert, RefreshCw, Search } from "lucide-vue-next";

import AdminBarChart from "@/components/admin/AdminBarChart.vue";
import AdminDonutChart from "@/components/admin/AdminDonutChart.vue";
import AdminLineChart from "@/components/admin/AdminLineChart.vue";
import adminService from "@/services/admin.service";

const agora = new Date();
const inicio = ref("");
const fim = ref("");
const atalhoAtivo = ref("mes");
const relatorio = ref(null);
const ranking = ref([]);
const pedidos = ref([]);
const erro = ref("");
const carregando = ref(false);

function iso(data) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(valor) {
  const [y, m, d] = String(valor).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function adicionarDias(data, dias) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function aplicarAtalho(tipo, executar = true) {
  atalhoAtivo.value = tipo;
  const hoje = new Date();
  fim.value = iso(hoje);
  if (tipo === "7d") inicio.value = iso(adicionarDias(hoje, -6));
  if (tipo === "30d") inicio.value = iso(adicionarDias(hoje, -29));
  if (tipo === "mes")
    inicio.value = iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  if (executar) carregar();
}

const pedidosNoPeriodo = computed(() =>
  pedidos.value.filter((p) => {
    const dia = String(p.data || "").slice(0, 10);
    return dia >= inicio.value && dia <= fim.value;
  }),
);

const pedidosVendidos = computed(() =>
  pedidos.value.filter((p) => {
    if (p.status !== "retirado") return false;
    const diaRetirada = String(p.status_atualizado_em || p.data || "").slice(
      0,
      10,
    );
    return diaRetirada >= inicio.value && diaRetirada <= fim.value;
  }),
);

const totalItensVendidos = computed(() =>
  pedidosVendidos.value.reduce((total, pedido) => {
    return (
      total +
      (pedido.itens || []).reduce(
        (subtotal, item) => subtotal + Number(item.quantidade || 0),
        0,
      )
    );
  }, 0),
);

const periodoLabel = computed(() => {
  if (!inicio.value || !fim.value) return "";
  const fmt = new Intl.DateTimeFormat("pt-BR");
  return `${fmt.format(parseISO(inicio.value))} a ${fmt.format(parseISO(fim.value))}`;
});

const serieFaturamento = computed(() => {
  if (!inicio.value || !fim.value) return [];
  const points = [];
  let atual = parseISO(inicio.value);
  const final = parseISO(fim.value);
  while (atual <= final) {
    const chave = iso(atual);
    const total = pedidosVendidos.value
      .filter(
        (p) =>
          String(p.status_atualizado_em || p.data || "").slice(0, 10) === chave,
      )
      .reduce((sum, p) => sum + Number(p.total || 0), 0);
    points.push({
      label: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(atual),
      value: total,
    });
    atual = adicionarDias(atual, 1);
    if (points.length > 370) break;
  }
  return points;
});

const rankingGrafico = computed(() =>
  ranking.value.slice(0, 7).map((item) => ({
    id: item.produto_id,
    label: item.produto_nome,
    value: Number(item.quantidade_vendida || 0),
  })),
);

const formasPagamento = computed(() => {
  const grupos = [
    { key: "pix", label: "Pix", color: "#15803d" },
    { key: "cartao", label: "Cartão", color: "#2563eb" },
    { key: "dinheiro", label: "Dinheiro", color: "#a16207" },
  ];
  return grupos.map((grupo) => ({
    ...grupo,
    value: pedidosVendidos.value.filter((p) => p.forma_pagamento === grupo.key)
      .length,
  }));
});

const statusDistribuicao = computed(() => {
  const grupos = [
    { key: "pendente", label: "Pendentes", color: "#d97706" },
    { key: "confirmado", label: "Confirmados", color: "#2563eb" },
    { key: "pronto", label: "Prontos", color: "#16a34a" },
    { key: "retirado", label: "Retirados", color: "#57534e" },
    { key: "cancelado", label: "Cancelados", color: "#dc2626" },
  ];
  return grupos.map((grupo) => ({
    ...grupo,
    value: pedidosNoPeriodo.value.filter((p) => p.status === grupo.key).length,
  }));
});

async function carregar() {
  if (!inicio.value || !fim.value || inicio.value > fim.value) {
    erro.value = "Selecione um período válido.";
    return;
  }
  carregando.value = true;
  erro.value = "";
  try {
    const [resumo, maisVendidos, listaPedidos] = await Promise.all([
      adminService.relatorioVendas({
        dataInicio: inicio.value,
        dataFim: fim.value,
      }),
      adminService.maisVendidos({
        dataInicio: inicio.value,
        dataFim: fim.value,
        limite: 10,
      }),
      adminService.listarPedidos(),
    ]);
    relatorio.value = resumo;
    ranking.value = maisVendidos.resultado || [];
    pedidos.value = listaPedidos;
  } catch (error) {
    erro.value =
      error.response?.data?.detail || "Não foi possível gerar o relatório.";
  } finally {
    carregando.value = false;
  }
}

aplicarAtalho("mes", false);
onMounted(carregar);
</script>

<style scoped>
.report-filter {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
  padding: 14px 16px;
}
.report-shortcuts {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--admin-border);
  border-radius: 9px;
  background: var(--admin-surface-subtle);
}
.report-shortcuts button {
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}
.report-shortcuts button.active {
  background: #fff;
  color: var(--admin-text);
  box-shadow: 0 1px 2px rgba(28, 25, 23, 0.08);
}
.report-dates {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 9px;
  flex-wrap: wrap;
}
.report-dates .admin-field input {
  width: 155px;
}
.report-kpis {
  margin-top: 14px;
}
.report-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}
.report-grid--main {
  grid-template-columns: minmax(0, 1.55fr) minmax(330px, 0.75fr);
}
.report-grid--secondary {
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.65fr);
}
.report-chart-card {
  min-width: 0;
  overflow: hidden;
}
.report-chart-body {
  padding: 14px 18px 4px;
}
.report-donut-body {
  padding: 20px;
}
.report-bar-body {
  padding: 20px 18px 22px;
}
.report-status-list {
  padding: 8px 18px 12px;
}
.report-status-row {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #efeeec;
  color: var(--admin-text-soft);
  font-size: 13px;
}
.report-status-row:last-child {
  border-bottom: 0;
}
.report-status-row div {
  display: flex;
  align-items: center;
  gap: 9px;
}
.report-status-row strong {
  color: var(--admin-text);
  font-size: 12px;
}
.report-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.report-ranking-table {
  overflow: hidden;
}
.report-table-wrap {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
@media (max-width: 1100px) {
  .report-grid--main,
  .report-grid--secondary {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 820px) {
  .report-filter {
    align-items: stretch;
    flex-direction: column;
  }
  .report-dates {
    justify-content: flex-start;
  }
}
@media (max-width: 560px) {
  .report-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .report-dates .admin-field input {
    width: 100%;
  }
  .report-dates .admin-btn {
    grid-column: 1 / -1;
  }
}
</style>
