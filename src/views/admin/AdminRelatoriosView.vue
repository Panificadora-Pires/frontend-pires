<template>
  <section class="admin-page report-page">
    <header class="report-header">
      <div>
        <h1>Relatórios</h1>
        <p>Vendas, produtos e pagamentos em um panorama do período.</p>
      </div>
    </header>

    <section class="report-filters" aria-labelledby="report-filter-title">
      <h2 id="report-filter-title" class="report-filter-heading">Período de análise</h2>
      <div class="report-filter-layout">
        <div class="report-shortcuts" aria-label="Intervalos rápidos">
          <button v-for="dias in [7, 30, 90]" :key="dias" type="button"
            :class="{ 'is-active': atalho === dias }" :aria-pressed="atalho === dias"
            @click="aplicarAtalho(dias)">{{ dias }} dias</button>
        </div>
        <form class="report-form" @submit.prevent="gerar">
          <label>
            <span>De</span>
            <input v-model="inicio" type="date" required @change="atalho = null" />
          </label>
          <label>
            <span>Até</span>
            <input v-model="fim" type="date" required @change="atalho = null" />
          </label>
          <button type="submit" class="report-generate pp-card-action pp-admin-action--primary"
            data-card-action-radius :disabled="store.carregando">
            <CardActionContent>
              <LoaderCircle v-if="store.carregando" :size="16" class="report-spin" aria-hidden="true" />
              <Search v-else :size="16" aria-hidden="true" />
              {{ store.carregando ? "Consultando…" : "Gerar relatório" }}
            </CardActionContent>
          </button>
        </form>
      </div>
      <p v-if="erroPeriodo" class="report-filter-error" role="alert"><CircleAlert :size="16" aria-hidden="true" />{{ erroPeriodo }}</p>
    </section>

    <div v-if="store.erro" class="report-alert" role="alert">
      <CircleAlert :size="18" aria-hidden="true" />
      <span>{{ store.erro }}</span>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>

    <div v-if="!store.inicializado && !store.erro" class="report-loading" role="status">
      <LoaderCircle :size="22" class="report-spin" aria-hidden="true" />
      Carregando análise de vendas…
    </div>

    <template v-if="relatorio">
      <div class="report-period-line">
        <div>
          <span>Período analisado</span>
          <strong>{{ dataBR(relatorio.periodo.data_inicio) }} a {{ dataBR(relatorio.periodo.data_fim) }}</strong>
        </div>
        <button type="button" class="report-export" :disabled="store.carregando" @click="exportarCsv">
          <Download :size="16" aria-hidden="true" /> Exportar CSV
        </button>
      </div>

      <section class="report-overview" aria-label="Indicadores do período">
        <article class="report-hero">
          <div class="report-hero__top">
            <div>
              <span class="report-hero__eyebrow">FATURAMENTO DO PERÍODO</span>
              <h2>{{ moeda(relatorio.resumo.total_vendido) }}</h2>
              <p>Pedidos efetivamente retirados</p>
            </div>
            <span class="report-hero__icon"><TrendingUp :size="21" aria-hidden="true" /></span>
          </div>
          <svg viewBox="0 0 360 90" preserveAspectRatio="none" class="report-sparkline" role="img"
            aria-label="Tendência de faturamento no período; consulte o gráfico detalhado abaixo">
            <path :d="sparkArea" class="report-sparkline__area" />
            <path :d="sparkLine" class="report-sparkline__line" />
          </svg>
          <div class="report-hero__bottom">
            <span class="report-change" :class="classeVariacao(variacoes.total_vendido)">
              <ArrowUpRight v-if="Number(variacoes.total_vendido) > 0" :size="16" aria-hidden="true" />
              <ArrowDownRight v-else-if="Number(variacoes.total_vendido) < 0" :size="16" aria-hidden="true" />
              {{ textoVariacao(variacoes.total_vendido) }}
            </span>
            <span>em relação ao período anterior</span>
          </div>
        </article>

        <div class="report-small-metrics">
          <article v-for="metrica in metricas" :key="metrica.chave" class="report-small-metric"
            :class="{ 'report-small-metric--wide': metrica.chave === 'itens_vendidos' }">
            <span class="report-small-metric__label">{{ metrica.rotulo }}</span>
            <strong>{{ metrica.formato === "moeda" ? moeda(relatorio.resumo[metrica.chave]) : inteiro(relatorio.resumo[metrica.chave]) }}</strong>
            <div class="report-small-metric__foot">
              <span class="report-small-metric__change" :class="classeVariacao(variacoes[metrica.chave])">
                {{ textoVariacao(variacoes[metrica.chave]) }}
              </span>
              <span>ante o período anterior</span>
            </div>
          </article>
        </div>
      </section>

      <div class="report-main-grid">
        <section class="report-panel report-evolution" aria-labelledby="report-evolution-title">
          <header class="report-panel-header">
            <div>
              <h2 id="report-evolution-title">Evolução das vendas</h2>
              <p>Valores registrados por dia de retirada</p>
            </div>
            <div class="report-chart-segment" aria-label="Métrica do gráfico">
              <button type="button" :class="{ 'is-active': metricaGrafico === 'total_vendido' }"
                :aria-pressed="metricaGrafico === 'total_vendido'" @click="metricaGrafico = 'total_vendido'">Faturamento</button>
              <button type="button" :class="{ 'is-active': metricaGrafico === 'total_pedidos' }"
                :aria-pressed="metricaGrafico === 'total_pedidos'" @click="metricaGrafico = 'total_pedidos'">Pedidos</button>
            </div>
          </header>
          <div class="report-chart-container">
            <AdminAnalyticsChart :points="relatorio.serie_diaria" :metrica="metricaGrafico"
              :aria-label="metricaGrafico === 'total_vendido' ? 'Faturamento por dia' : 'Pedidos retirados por dia'" />
          </div>
        </section>

        <section class="report-panel report-payments" aria-labelledby="report-payments-title">
          <header class="report-panel-header">
            <div>
              <h2 id="report-payments-title">Formas de pagamento</h2>
              <p>Distribuição dos pedidos retirados</p>
            </div>
          </header>
          <div class="report-payment-chart">
            <AdminDonutChart :items="pagamentos" center-label="pedidos" aria-label="Distribuição dos pedidos por forma de pagamento" />
          </div>
          <p class="report-panel-note">Os valores consideram pedidos retirados, não a conciliação financeira.</p>
        </section>
      </div>

      <div class="report-bottom-grid">
        <section class="report-panel report-ranking" aria-labelledby="report-ranking-title">
          <header class="report-panel-header">
            <div>
              <h2 id="report-ranking-title">Produtos mais vendidos</h2>
              <p>Quantidade de unidades retiradas</p>
            </div>
            <span class="report-panel-counter">Top 7</span>
          </header>
          <div v-if="!rankingGrafico.length" class="report-no-data">Ainda não há produtos vendidos neste período.</div>
          <div v-else class="report-ranking-content">
            <AdminBarChart :items="rankingGrafico" suffix="un." />
          </div>
        </section>

        <section class="report-panel report-daily" aria-labelledby="report-daily-title">
          <header class="report-panel-header">
            <div>
              <h2 id="report-daily-title">Resumo diário</h2>
              <p>Últimos dias do período selecionado</p>
            </div>
          </header>
          <div class="report-daily-table">
            <table>
              <thead><tr><th>Dia</th><th>Pedidos</th><th>Faturamento</th></tr></thead>
              <tbody>
                <tr v-for="dia in ultimosDias" :key="dia.data">
                  <td>{{ dataBR(dia.data).slice(0, 5) }}</td>
                  <td>{{ inteiro(dia.total_pedidos) }}</td>
                  <td>{{ moeda(dia.total_vendido) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="report-panel-note">A exportação CSV inclui todos os dias do período.</p>
        </section>
      </div>

    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import {
  ArrowDownRight, ArrowUpRight, CircleAlert, Download, LoaderCircle,
  Search, TrendingUp,
} from "lucide-vue-next";

import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart.vue";
import AdminBarChart from "@/components/admin/AdminBarChart.vue";
import AdminDonutChart from "@/components/admin/AdminDonutChart.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useAdminRelatoriosStore } from "@/stores/adminRelatorios";
import {
  csvSerieDiaria, dataBR, inteiro, moeda, periodoRapido, porcentagem, validarPeriodo,
} from "@/utils/adminRelatorios";

const store = useAdminRelatoriosStore();
const inicial = periodoRapido(30);
const inicio = ref(inicial.inicio);
const fim = ref(inicial.fim);
const aplicado = ref({ ...inicial });
const atalho = ref(30);
const erroPeriodo = ref("");
const metricaGrafico = ref("total_vendido");
const relatorio = computed(() => store.relatorio);
const variacoes = computed(() => relatorio.value?.comparacao.variacao_percentual || {});
const metricas = [
  { chave: "total_pedidos", rotulo: "Pedidos retirados", formato: "inteiro" },
  { chave: "ticket_medio", rotulo: "Ticket médio", formato: "moeda" },
  { chave: "itens_vendidos", rotulo: "Itens vendidos", formato: "inteiro" },
];
const rankingGrafico = computed(() => store.ranking.map(item => ({
  id: item.produto_id, label: item.produto_nome, value: Number(item.quantidade_vendida),
})));
const pagamentos = computed(() => (relatorio.value?.formas_pagamento || []).map(item => ({
  label: { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }[item.forma_pagamento],
  value: item.total_pedidos,
  color: {
    pix: "var(--pp-verde)", cartao: "var(--pp-dourado-profundo)", dinheiro: "var(--pp-marrom-2)",
  }[item.forma_pagamento],
})));
const ultimosDias = computed(() => (relatorio.value?.serie_diaria || []).slice(-7).reverse());
const valoresSpark = computed(() => (relatorio.value?.serie_diaria || []).map(x => Number(x.total_vendido) || 0));
const posicoesSpark = computed(() => {
  const valores = valoresSpark.value;
  const max = Math.max(1, ...valores);
  return valores.map((valor, i) => ({
    x: 4 + (valores.length === 1 ? .5 : i / (valores.length - 1)) * 352,
    y: 83 - valor / max * 69,
  }));
});
const sparkLine = computed(() => posicoesSpark.value.map((p, i) =>
  (i === 0 ? "M" : "L") + " " + p.x.toFixed(2) + " " + p.y.toFixed(2)
).join(" "));
const sparkArea = computed(() => posicoesSpark.value.length
  ? sparkLine.value + " L " + posicoesSpark.value.at(-1).x.toFixed(2) + " 87 L " + posicoesSpark.value[0].x.toFixed(2) + " 87 Z"
  : "");

function textoVariacao(valor) {
  return valor === null || valor === undefined ? "Sem base de comparação" : porcentagem(valor);
}
function classeVariacao(valor) {
  return {
    "is-positive": valor !== null && valor !== undefined && Number(valor) > 0,
    "is-negative": valor !== null && valor !== undefined && Number(valor) < 0,
  };
}
function carregarSilencioso() {
  return store.carregar({ inicio: aplicado.value.inicio, fim: aplicado.value.fim });
}
const { atualizarAgora } = useAutoRefresh(carregarSilencioso, { intervalo: 60_000 });
async function gerar() {
  erroPeriodo.value = validarPeriodo(inicio.value, fim.value);
  if (erroPeriodo.value) return;
  aplicado.value = { inicio: inicio.value, fim: fim.value };
  try { await store.carregar(aplicado.value); } catch { /* erro tratado pela store */ }
}
function aplicarAtalho(dias) {
  atalho.value = dias;
  const valor = periodoRapido(dias);
  inicio.value = valor.inicio;
  fim.value = valor.fim;
  gerar();
}
function tentarNovamente() {
  atualizarAgora().catch(() => {});
}
function exportarCsv() {
  if (!relatorio.value) return;
  const conteudo = csvSerieDiaria(relatorio.value);
  const arquivo = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pires-relatorio-" + relatorio.value.periodo.data_inicio + "-a-" + relatorio.value.periodo.data_fim + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
onBeforeUnmount(() => store.resetar());
</script>

<style scoped>
.report-page{color:var(--pp-admin-text)}
.report-header{margin-bottom:21px}
.report-header h1{font-size:30px;line-height:1.2;font-weight:650;letter-spacing:-.03em;margin:0 0 6px}
.report-header p{font-size:14px;line-height:1.5;color:var(--pp-admin-muted);margin:0}
.report-filters{padding:17px 20px;background:var(--pp-admin-surface);border:1px solid var(--pp-admin-border);border-radius:13px;margin-bottom:22px}
.report-filter-heading{font-size:13px;margin:0 0 10px;font-weight:650;color:var(--pp-admin-muted)}
.report-filter-layout{display:flex;align-items:end;justify-content:space-between;gap:17px;flex-wrap:wrap}
.report-shortcuts{display:flex;gap:5px;align-self:end;border:1px solid var(--pp-admin-border);background:var(--pp-creme-2);padding:4px;border-radius:10px}
.report-shortcuts button{min-height:36px;padding:7px 13px;border:0;border-radius:7px;background:transparent;color:var(--pp-admin-muted);font:inherit;font-size:13px;font-weight:650;cursor:pointer}
.report-shortcuts button:hover{color:var(--pp-admin-text)}
.report-shortcuts button.is-active{background:var(--pp-admin-surface);color:var(--pp-admin-text);box-shadow:0 2px 7px color-mix(in srgb,var(--pp-marrom) 7%,transparent)}
.report-form{display:flex;align-items:end;gap:9px;flex-wrap:wrap}
.report-form label{display:flex;flex-direction:column;gap:6px;color:var(--pp-admin-muted);font-size:12px;font-weight:650}
.report-form input{min-height:43px;max-width:158px;padding:8px 10px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:13px}
.report-form input:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:2px}
.report-generate{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:43px;padding:9px 14px;border:1px solid var(--pp-admin-text);border-radius:9px;background:var(--pp-admin-text);color:var(--pp-admin-bg);font:inherit;font-size:13px;font-weight:650;cursor:pointer}
.report-generate:disabled{opacity:.6;cursor:wait}
.report-filter-error{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--pp-admin-danger);margin:12px 0 0}
.report-alert{display:flex;align-items:center;gap:11px;padding:13px 15px;border:1px solid var(--pp-admin-border);border-radius:10px;background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger);margin-bottom:17px;font-size:13px}
.report-alert span{flex:1}
.report-alert button{padding:8px 11px;min-height:38px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;cursor:pointer;font-weight:650}
.report-loading{display:flex;align-items:center;justify-content:center;gap:10px;min-height:260px;color:var(--pp-admin-muted);font-size:14px}
.report-spin{animation:report-spin .85s linear infinite}
@keyframes report-spin{to{transform:rotate(360deg)}}
.report-period-line{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}
.report-period-line>div{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.report-period-line>div span{color:var(--pp-admin-muted);font-size:13px}
.report-period-line>div strong{font-size:13px;font-weight:650}
.report-export{display:flex;align-items:center;gap:8px;min-height:40px;padding:8px 12px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:13px;font-weight:650;cursor:pointer}
.report-export:hover{border-color:var(--pp-admin-accent);background:var(--pp-creme-2)}
.report-export:disabled{opacity:.5;cursor:wait}
.report-overview{display:grid;grid-template-columns:minmax(0,1.42fr) minmax(320px,1fr);gap:13px;margin-bottom:17px}
.report-hero{display:flex;flex-direction:column;justify-content:space-between;min-height:300px;min-width:0;border-radius:15px;padding:25px 27px 20px;background:var(--pp-marrom);color:var(--pp-creme)}
.report-hero__top{display:flex;justify-content:space-between;gap:12px}
.report-hero__eyebrow{font-size:12px;letter-spacing:.09em;font-weight:700;color:var(--pp-creme-3)}
.report-hero h2{font-size:clamp(30px,3.1vw,42px);line-height:1.15;letter-spacing:-.035em;font-weight:680;margin:9px 0 5px;font-variant-numeric:tabular-nums}
.report-hero__top p{font-size:13px;color:var(--pp-creme-3);margin:0}
.report-hero__icon{display:grid;place-items:center;flex:none;width:44px;height:44px;border:1px solid color-mix(in srgb,var(--pp-gold) 45%,transparent);border-radius:10px;color:var(--pp-gold)}
.report-sparkline{display:block;width:100%;height:98px;overflow:visible;margin:10px 0}
.report-sparkline__area{fill:color-mix(in srgb,var(--pp-gold) 13%,transparent)}
.report-sparkline__line{fill:none;stroke:var(--pp-gold);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.report-hero__bottom{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12px;color:var(--pp-creme-3)}
.report-change{display:inline-flex;align-items:center;gap:4px;padding:7px 9px;background:color-mix(in srgb,var(--pp-gold) 13%,transparent);color:var(--pp-creme);border-radius:8px;font-size:12px;font-weight:700}
.report-small-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.report-small-metric{display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-width:0;border:1px solid var(--pp-admin-border);border-radius:13px;padding:21px 20px;background:var(--pp-admin-surface)}
.report-small-metric--wide{grid-column:1/-1}
.report-small-metric__label{font-size:13px;color:var(--pp-admin-muted)}
.report-small-metric strong{font-size:clamp(21px,2vw,29px);letter-spacing:-.025em;font-weight:680;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.report-small-metric__foot{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--pp-admin-muted)}
.report-small-metric__change{font-size:12px;font-weight:700;color:var(--pp-admin-accent)}
.report-main-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(320px,.85fr);gap:14px;margin-bottom:17px}
.report-bottom-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.8fr);gap:14px;margin-bottom:18px}
.report-panel{min-width:0;border:1px solid var(--pp-admin-border);border-radius:14px;background:var(--pp-admin-surface);overflow:hidden}
.report-panel-header{display:flex;align-items:flex-start;justify-content:space-between;gap:13px;padding:21px 22px 14px;flex-wrap:wrap}
.report-panel-header h2{font-size:18px;letter-spacing:-.018em;margin:0 0 5px;font-weight:650}
.report-panel-header p{font-size:13px;color:var(--pp-admin-muted);line-height:1.45;margin:0}
.report-chart-segment{display:flex;gap:3px;padding:4px;background:var(--pp-creme-2);border-radius:9px}
.report-chart-segment button{border:0;border-radius:7px;background:transparent;min-height:34px;padding:7px 10px;color:var(--pp-admin-muted);font-size:12px;font-weight:650;cursor:pointer}
.report-chart-segment button.is-active{background:var(--pp-admin-surface);color:var(--pp-admin-text);box-shadow:0 2px 7px color-mix(in srgb,var(--pp-marrom) 7%,transparent)}
.report-chart-container{padding:0 22px 19px}
.report-payment-chart{padding:8px 18px 12px}
.report-payment-chart :deep(.donut-chart){grid-template-columns:1fr;gap:18px;justify-items:center}
.report-payment-chart :deep(.donut-chart__legend){width:100%}
.report-payment-chart :deep(.donut-chart__legend-row),.report-payment-chart :deep(.donut-chart__legend-row strong){font-size:13px}
.report-payment-chart :deep(.donut-chart__center span){font-size:13px}
.report-panel-note{margin:0;padding:12px 20px 18px;font-size:12px;color:var(--pp-admin-muted);line-height:1.55}
.report-panel-counter{font-size:12px;color:var(--pp-admin-muted);font-weight:650;background:var(--pp-creme-2);border-radius:7px;padding:6px 9px}
.report-ranking-content{padding:12px 22px 25px}
.report-ranking-content :deep(.bar-chart__label span),.report-ranking-content :deep(.bar-chart__label strong){font-size:13px}
.report-ranking-content :deep(.bar-chart__fill){background:var(--pp-admin-accent)}
.report-no-data{padding:45px 20px;color:var(--pp-admin-muted);text-align:center;font-size:13px}
.report-daily-table{padding:0 18px}
.report-daily-table table{width:100%;border-collapse:collapse}
.report-daily-table th,.report-daily-table td{padding:12px 7px;border-bottom:1px solid var(--pp-admin-border);font-size:13px;font-variant-numeric:tabular-nums}
.report-daily-table th{text-align:left;color:var(--pp-admin-muted);font-size:12px;font-weight:650}
.report-daily-table td:last-child,.report-daily-table th:last-child{text-align:right}
.report-daily-table td:nth-child(2),.report-daily-table th:nth-child(2){text-align:center}
.report-daily-table tbody tr:last-child td{border-bottom:0}
@media(max-width:1160px){.report-overview,.report-main-grid,.report-bottom-grid{grid-template-columns:1fr}.report-small-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.report-small-metric--wide{grid-column:auto}.report-hero{min-height:290px}.report-main-grid{gap:13px}}
@media(max-width:720px){.report-header h1{font-size:27px}.report-filters{padding:15px}.report-filter-layout{align-items:stretch;flex-direction:column}.report-shortcuts{align-self:stretch;justify-content:space-between}.report-shortcuts button{flex:1}.report-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.report-form input{width:100%;max-width:none}.report-generate{grid-column:1/-1}.report-small-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.report-small-metric--wide{grid-column:1/-1}.report-small-metric{padding:17px}.report-hero{padding:22px;min-height:280px}.report-overview{gap:11px}.report-panel-header{padding:17px 15px 12px}.report-chart-container{padding:0 13px 14px}.report-payment-chart{padding:10px 15px}.report-ranking-content{padding:10px 15px 20px}.report-period-line{align-items:flex-start;flex-wrap:wrap}}
@media(prefers-reduced-motion:reduce){.report-page *{animation:none!important;transition:none!important}}
</style>
