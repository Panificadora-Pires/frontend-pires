<template>
  <section class="admin-page report-page">
    <header class="report-header">
      <div>
        <h1>Relatórios</h1>
        <p>Vendas, produtos e pagamentos em um panorama do período.</p>
      </div>
    </header>

    <section class="report-filters" aria-labelledby="report-filter-title">
      <h2 id="report-filter-title" class="report-filter-heading">
        Período de análise
      </h2>
      <div class="report-filter-layout">
        <div class="report-shortcuts" aria-label="Intervalos rápidos">
          <button
            v-for="dias in [7, 30, 90]"
            :key="dias"
            type="button"
            :class="{ 'is-active': atalho === dias }"
            :aria-pressed="atalho === dias"
            @click="aplicarAtalho(dias)"
          >
            {{ dias }} dias
          </button>
        </div>
        <form class="report-form" @submit.prevent="gerar">
          <label>
            <span>De</span>
            <input
              v-model="inicio"
              type="date"
              required
              @change="atalho = null"
            />
          </label>
          <label>
            <span>Até</span>
            <input v-model="fim" type="date" required @change="atalho = null" />
          </label>
          <button
            type="submit"
            class="report-generate pp-card-action pp-admin-action--primary"
            data-card-action-radius
            :disabled="store.carregando"
          >
            <CardActionContent>
              <LoaderCircle
                v-if="store.carregando"
                :size="16"
                class="report-spin"
                aria-hidden="true"
              />
              <Search v-else :size="16" aria-hidden="true" />
              {{ store.carregando ? "Consultando…" : "Gerar relatório" }}
            </CardActionContent>
          </button>
        </form>
      </div>
      <p v-if="erroPeriodo" class="report-filter-error" role="alert">
        <CircleAlert :size="16" aria-hidden="true" />{{ erroPeriodo }}
      </p>
    </section>

    <div v-if="store.erro" class="report-alert" role="alert">
      <CircleAlert :size="18" aria-hidden="true" />
      <span>{{ store.erro }}</span>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>

    <div
      v-if="!store.inicializado && !store.erro"
      class="report-loading"
      role="status"
    >
      <LoaderCircle :size="22" class="report-spin" aria-hidden="true" />
      Carregando análise de vendas…
    </div>

    <template v-if="relatorio">
      <div class="report-period-line">
        <div>
          <span>Período analisado</span>
          <strong
            >{{ dataBR(relatorio.periodo.data_inicio) }} a
            {{ dataBR(relatorio.periodo.data_fim) }}</strong
          >
        </div>
        <button
          type="button"
          class="report-export"
          :disabled="store.carregando"
          @click="exportarCsv"
        >
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
            <span class="report-hero__icon"
              ><TrendingUp :size="21" aria-hidden="true"
            /></span>
          </div>
          <svg
            viewBox="0 0 360 90"
            preserveAspectRatio="none"
            class="report-sparkline"
            role="img"
            aria-label="Tendência de faturamento no período; consulte o gráfico detalhado abaixo"
          >
            <path :d="sparkArea" class="report-sparkline__area" />
            <path :d="sparkLine" class="report-sparkline__line" />
          </svg>
          <div class="report-hero__bottom">
            <span
              class="report-change"
              :class="classeVariacao(variacoes.total_vendido)"
            >
              <ArrowUpRight
                v-if="Number(variacoes.total_vendido) > 0"
                :size="16"
                aria-hidden="true"
              />
              <ArrowDownRight
                v-else-if="Number(variacoes.total_vendido) < 0"
                :size="16"
                aria-hidden="true"
              />
              {{ textoVariacao(variacoes.total_vendido) }}
            </span>
            <span
              v-if="
                variacoes.total_vendido !== null &&
                variacoes.total_vendido !== undefined
              "
              >em relação ao período anterior</span
            >
          </div>
        </article>

        <div class="report-small-metrics">
          <article
            v-for="metrica in metricas"
            :key="metrica.chave"
            class="report-small-metric"
            :class="{
              'report-small-metric--wide': metrica.chave === 'itens_vendidos',
            }"
          >
            <span class="report-small-metric__label">{{ metrica.rotulo }}</span>
            <strong>{{
              metrica.formato === "moeda"
                ? moeda(relatorio.resumo[metrica.chave])
                : inteiro(relatorio.resumo[metrica.chave])
            }}</strong>
            <div class="report-small-metric__foot">
              <span
                class="report-small-metric__change"
                :class="classeVariacao(variacoes[metrica.chave])"
              >
                {{ textoVariacao(variacoes[metrica.chave]) }}
              </span>
              <span
                v-if="
                  variacoes[metrica.chave] !== null &&
                  variacoes[metrica.chave] !== undefined
                "
                >vs. período anterior</span
              >
            </div>
          </article>
        </div>
      </section>

      <div class="report-main-grid">
        <section
          class="report-panel report-evolution"
          aria-labelledby="report-evolution-title"
        >
          <header class="report-panel-header">
            <div>
              <h2 id="report-evolution-title">Evolução das vendas</h2>
              <p>Valores registrados por dia de retirada</p>
            </div>
            <div class="report-chart-segment" aria-label="Métrica do gráfico">
              <button
                type="button"
                :class="{ 'is-active': metricaGrafico === 'total_vendido' }"
                :aria-pressed="metricaGrafico === 'total_vendido'"
                @click="metricaGrafico = 'total_vendido'"
              >
                Faturamento
              </button>
              <button
                type="button"
                :class="{ 'is-active': metricaGrafico === 'total_pedidos' }"
                :aria-pressed="metricaGrafico === 'total_pedidos'"
                @click="metricaGrafico = 'total_pedidos'"
              >
                Pedidos
              </button>
            </div>
          </header>
          <div class="report-chart-container">
            <AdminAnalyticsChart
              :points="relatorio.serie_diaria"
              :metrica="metricaGrafico"
              :aria-label="
                metricaGrafico === 'total_vendido'
                  ? 'Faturamento por dia'
                  : 'Pedidos retirados por dia'
              "
            />
          </div>
        </section>

        <section
          class="report-panel report-payments"
          aria-labelledby="report-payments-title"
        >
          <header class="report-panel-header">
            <div>
              <h2 id="report-payments-title">Formas de pagamento</h2>
              <p>Distribuição dos pedidos retirados</p>
            </div>
          </header>
          <div class="report-payment-chart">
            <AdminDonutChart
              :items="pagamentos"
              center-label="pedidos"
              aria-label="Distribuição dos pedidos por forma de pagamento"
            />
          </div>
          <p class="report-panel-note">
            Os valores consideram pedidos retirados, não a conciliação
            financeira.
          </p>
        </section>
      </div>

      <div class="report-bottom-grid">
        <section
          class="report-panel report-ranking"
          aria-labelledby="report-ranking-title"
        >
          <header class="report-panel-header">
            <div>
              <h2 id="report-ranking-title">Produtos mais vendidos</h2>
              <p>Quantidade de unidades retiradas</p>
            </div>
            <span class="report-panel-counter">Top 7</span>
          </header>
          <div v-if="!rankingGrafico.length" class="report-no-data">
            Ainda não há produtos vendidos neste período.
          </div>
          <div v-else class="report-ranking-content">
            <AdminBarChart :items="rankingGrafico" suffix="un." />
          </div>
        </section>

        <section
          class="report-panel report-daily"
          aria-labelledby="report-daily-title"
        >
          <header class="report-panel-header">
            <div>
              <h2 id="report-daily-title">Resumo diário</h2>
              <p>Últimos dias do período selecionado</p>
            </div>
          </header>
          <div class="report-daily-table">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Pedidos</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dia in ultimosDias" :key="dia.data">
                  <td>{{ dataBR(dia.data).slice(0, 5) }}</td>
                  <td>{{ inteiro(dia.total_pedidos) }}</td>
                  <td>{{ moeda(dia.total_vendido) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="report-panel-note">
            A exportação CSV inclui todos os dias do período.
          </p>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Download,
  LoaderCircle,
  Search,
  TrendingUp,
} from "lucide-vue-next";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart.vue";
import AdminBarChart from "@/components/admin/AdminBarChart.vue";
import AdminDonutChart from "@/components/admin/AdminDonutChart.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAdminRelatorios } from "@/composables/useAdminRelatorios";

const {
  aplicarAtalho,
  atalho,
  classeVariacao,
  erroPeriodo,
  exportarCsv,
  fim,
  gerar,
  inicio,
  metricaGrafico,
  metricas,
  pagamentos,
  rankingGrafico,
  relatorio,
  sparkArea,
  sparkLine,
  store,
  tentarNovamente,
  textoVariacao,
  ultimosDias,
  variacoes,
  dataBR,
  inteiro,
  moeda,
} = useAdminRelatorios();
</script>

<style scoped src="./AdminRelatoriosView.css"></style>
