<template>
  <div class="analytics-chart">
    <div
      ref="graficoRef"
      class="analytics-chart__interactive"
      role="group"
      tabindex="0"
      :aria-label="ariaLabel + '. Use as setas para consultar os dias.'"
      @keydown="aoTeclado"
    >
      <svg
        ref="svgRef"
        viewBox="0 0 820 280"
        preserveAspectRatio="none"
        class="analytics-chart__svg"
        role="img"
        :aria-labelledby="tituloId"
        @pointermove="aoMover"
        @pointerleave="aoSair"
      >
        <title :id="tituloId">{{ ariaLabel }}</title>
        <g class="analytics-chart__grid">
          <g v-for="tick in marcas" :key="tick.y">
            <line x1="68" x2="805" :y1="tick.y" :y2="tick.y" />
            <text x="9" :y="tick.y + 4">{{ compacto(tick.valor) }}</text>
          </g>
        </g>
        <path
          v-if="posicoes.length"
          class="analytics-chart__area"
          :d="caminhoArea"
        />
        <path
          v-if="posicoes.length"
          class="analytics-chart__line"
          :d="caminhoLinha"
        />
        <g v-if="pontoAtivo" class="analytics-chart__focus">
          <line :x1="pontoAtivo.x" :x2="pontoAtivo.x" y1="34" y2="237" />
          <circle :cx="pontoAtivo.x" :cy="pontoAtivo.y" r="5" />
        </g>
        <g class="analytics-chart__labels">
          <text
            v-for="ponto in marcadoresData"
            :key="ponto.data"
            :x="ponto.x"
            y="270"
            :text-anchor="ponto.ancora"
          >
            {{ dataCurta(ponto.data) }}
          </text>
        </g>
      </svg>
      <div
        v-if="pontoAtivo"
        class="analytics-chart__tooltip"
        :style="{
          left: Math.max(12, Math.min(88, (pontoAtivo.x / 820) * 100)) + '%',
        }"
        aria-hidden="true"
      >
        <span>{{ dataLonga(pontoAtivo.data) }}</span>
        <strong>{{ formatar(pontoAtivo.valor) }}</strong>
      </div>
      <div v-if="!temVendas" class="analytics-chart__zero">
        Sem vendas concluídas neste período
      </div>
    </div>
    <div class="analytics-chart__hint">
      Passe o mouse sobre a curva ou use as setas do teclado para consultar cada
      dia.
    </div>
    <div class="analytics-chart__sr" aria-live="polite">
      {{ mensagemAcessivel }}
    </div>
    <details class="analytics-chart__details">
      <summary>Ver valores diários em tabela</summary>
      <div class="analytics-chart__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>
                {{ metrica === "total_pedidos" ? "Pedidos" : "Faturamento" }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ponto in points" :key="ponto.data">
              <td>{{ dataLonga(ponto.data) }}</td>
              <td>{{ formatar(Number(ponto[metrica])) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed, ref, useId, watch } from "vue";

const props = defineProps({
  points: { type: Array, required: true },
  metrica: {
    type: String,
    default: "total_vendido",
    validator: (valor) => ["total_vendido", "total_pedidos"].includes(valor),
  },
  ariaLabel: { type: String, default: "Evolução de vendas" },
});
const tituloId = "analytics-chart-" + useId();
const graficoRef = ref(null);
const svgRef = ref(null);
const indiceAtivo = ref(null);
const LARGURA = 820;
const LADO_ESQUERDO = 68;
const LADO_DIREITO = 805;
const BASE = 237;
const TOPO = 34;
const valores = computed(() =>
  props.points.map((ponto) => Math.max(0, Number(ponto[props.metrica]) || 0)),
);
const escalaMaxima = computed(() => {
  const maximo = Math.max(0, ...valores.value);
  return maximo ? maximo * 1.12 : 1;
});
const temVendas = computed(() => valores.value.some((v) => v > 0));
const posicoes = computed(() =>
  props.points.map((ponto, indice) => ({
    data: ponto.data,
    valor: valores.value[indice],
    x:
      LADO_ESQUERDO +
      (props.points.length === 1 ? 0.5 : indice / (props.points.length - 1)) *
        (LADO_DIREITO - LADO_ESQUERDO),
    y: BASE - (valores.value[indice] / escalaMaxima.value) * (BASE - TOPO),
  })),
);
const caminhoLinha = computed(() =>
  posicoes.value
    .map(
      (ponto, indice) =>
        (indice === 0 ? "M " : "L ") +
        ponto.x.toFixed(2) +
        " " +
        ponto.y.toFixed(2),
    )
    .join(" "),
);
const caminhoArea = computed(() =>
  posicoes.value.length
    ? caminhoLinha.value +
      " L " +
      posicoes.value.at(-1).x.toFixed(2) +
      " " +
      BASE +
      " L " +
      posicoes.value[0].x.toFixed(2) +
      " " +
      BASE +
      " Z"
    : "",
);
const marcas = computed(() =>
  [0, 1, 2, 3].map((i) => ({
    y: BASE - (i / 3) * (BASE - TOPO),
    valor: (i / 3) * escalaMaxima.value,
  })),
);
const marcadoresData = computed(() => {
  const pontos = posicoes.value;
  if (!pontos.length) return [];
  const indices = new Set([0, pontos.length - 1]);
  const qtd = Math.min(5, pontos.length);
  for (let i = 1; i < qtd - 1; i++)
    indices.add(Math.round((i * (pontos.length - 1)) / (qtd - 1)));
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => ({
      ...pontos[i],
      ancora: i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle",
    }));
});
const pontoAtivo = computed(() =>
  indiceAtivo.value === null ? null : posicoes.value[indiceAtivo.value] || null,
);
const mensagemAcessivel = computed(() =>
  pontoAtivo.value
    ? dataLonga(pontoAtivo.value.data) + ": " + formatar(pontoAtivo.value.valor)
    : "",
);
watch(
  () => [props.points, props.metrica],
  () => {
    indiceAtivo.value = null;
  },
);

function formatar(valor) {
  return props.metrica === "total_pedidos"
    ? new Intl.NumberFormat("pt-BR").format(valor)
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);
}
function compacto(valor) {
  return props.metrica === "total_pedidos"
    ? new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 0,
      }).format(valor)
    : new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(valor);
}
function dataCurta(valor) {
  return valor.slice(8, 10) + "/" + valor.slice(5, 7);
}
function dataLonga(valor) {
  return dataCurta(valor) + "/" + valor.slice(0, 4);
}

function aoMover(evento) {
  if (!svgRef.value || !posicoes.value.length) return;
  const limites = svgRef.value.getBoundingClientRect();
  const x =
    ((evento.clientX - limites.left) / Math.max(1, limites.width)) * LARGURA;
  indiceAtivo.value = Math.max(
    0,
    Math.min(
      posicoes.value.length - 1,
      Math.round(
        ((x - LADO_ESQUERDO) / (LADO_DIREITO - LADO_ESQUERDO)) *
          (posicoes.value.length - 1),
      ),
    ),
  );
}
function aoSair() {
  if (document.activeElement !== graficoRef.value) indiceAtivo.value = null;
}
function aoTeclado(evento) {
  if (
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key) ||
    !posicoes.value.length
  )
    return;
  evento.preventDefault();
  const ultimo = posicoes.value.length - 1;
  if (evento.key === "Home") indiceAtivo.value = 0;
  else if (evento.key === "End") indiceAtivo.value = ultimo;
  else
    indiceAtivo.value = Math.max(
      0,
      Math.min(
        ultimo,
        (indiceAtivo.value ?? ultimo) + (evento.key === "ArrowRight" ? 1 : -1),
      ),
    );
}
</script>

<style scoped src="./AdminAnalyticsChart.css"></style>
