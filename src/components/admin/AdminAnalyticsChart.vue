<template>
  <div class="analytics-chart">
    <div ref="graficoRef" class="analytics-chart__interactive"
      role="group" tabindex="0"
      :aria-label="ariaLabel + '. Use as setas para consultar os dias.'"
      @keydown="aoTeclado">
      <svg ref="svgRef" viewBox="0 0 820 280" preserveAspectRatio="none" class="analytics-chart__svg"
        role="img" :aria-labelledby="tituloId"
        @pointermove="aoMover" @pointerleave="aoSair">
        <title :id="tituloId">{{ ariaLabel }}</title>
        <g class="analytics-chart__grid">
          <g v-for="tick in marcas" :key="tick.y">
            <line x1="68" x2="805" :y1="tick.y" :y2="tick.y" />
            <text x="9" :y="tick.y + 4">{{ compacto(tick.valor) }}</text>
          </g>
        </g>
        <path v-if="posicoes.length" class="analytics-chart__area" :d="caminhoArea" />
        <path v-if="posicoes.length" class="analytics-chart__line" :d="caminhoLinha" />
        <g v-if="pontoAtivo" class="analytics-chart__focus">
          <line :x1="pontoAtivo.x" :x2="pontoAtivo.x" y1="34" y2="237" />
          <circle :cx="pontoAtivo.x" :cy="pontoAtivo.y" r="5" />
        </g>
        <g class="analytics-chart__labels">
          <text v-for="ponto in marcadoresData" :key="ponto.data" :x="ponto.x" y="270"
            :text-anchor="ponto.ancora">{{ dataCurta(ponto.data) }}</text>
        </g>
      </svg>
      <div v-if="pontoAtivo" class="analytics-chart__tooltip"
        :style="{ left: (Math.max(12, Math.min(88, pontoAtivo.x / 820 * 100))) + '%' }" aria-hidden="true">
        <span>{{ dataLonga(pontoAtivo.data) }}</span>
        <strong>{{ formatar(pontoAtivo.valor) }}</strong>
      </div>
      <div v-if="!temVendas" class="analytics-chart__zero">Sem vendas concluídas neste período</div>
    </div>
    <div class="analytics-chart__hint">Passe o mouse sobre a curva ou use as setas do teclado para consultar cada dia.</div>
    <div class="analytics-chart__sr" aria-live="polite">{{ mensagemAcessivel }}</div>
    <details class="analytics-chart__details">
      <summary>Ver valores diários em tabela</summary>
      <div class="analytics-chart__table-wrap">
        <table>
          <thead><tr><th>Data</th><th>{{ metrica === 'total_pedidos' ? 'Pedidos' : 'Faturamento' }}</th></tr></thead>
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
  metrica: { type: String, default: "total_vendido", validator: valor => ["total_vendido", "total_pedidos"].includes(valor) },
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
const valores = computed(() => props.points.map(ponto => Math.max(0, Number(ponto[props.metrica]) || 0)));
const escalaMaxima = computed(() => {
  const maximo = Math.max(0, ...valores.value);
  return maximo ? maximo * 1.12 : 1;
});
const temVendas = computed(() => valores.value.some(v => v > 0));
const posicoes = computed(() => props.points.map((ponto, indice) => ({
  data: ponto.data,
  valor: valores.value[indice],
  x: LADO_ESQUERDO + (props.points.length === 1 ? .5 : indice / (props.points.length - 1)) * (LADO_DIREITO - LADO_ESQUERDO),
  y: BASE - valores.value[indice] / escalaMaxima.value * (BASE - TOPO),
})));
const caminhoLinha = computed(() => posicoes.value.map((ponto, indice) =>
  (indice === 0 ? "M " : "L ") + ponto.x.toFixed(2) + " " + ponto.y.toFixed(2)
).join(" "));
const caminhoArea = computed(() => posicoes.value.length
  ? caminhoLinha.value + " L " + posicoes.value.at(-1).x.toFixed(2) + " " + BASE
    + " L " + posicoes.value[0].x.toFixed(2) + " " + BASE + " Z"
  : "");
const marcas = computed(() => [0, 1, 2, 3].map(i => ({
  y: BASE - i / 3 * (BASE - TOPO),
  valor: i / 3 * escalaMaxima.value,
})));
const marcadoresData = computed(() => {
  const pontos = posicoes.value;
  if (!pontos.length) return [];
  const indices = new Set([0, pontos.length - 1]);
  const qtd = Math.min(5, pontos.length);
  for (let i = 1; i < qtd - 1; i++) indices.add(Math.round(i * (pontos.length - 1) / (qtd - 1)));
  return [...indices].sort((a, b) => a - b).map(i => ({
    ...pontos[i], ancora: i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle",
  }));
});
const pontoAtivo = computed(() => indiceAtivo.value === null ? null : posicoes.value[indiceAtivo.value] || null);
const mensagemAcessivel = computed(() => pontoAtivo.value ? dataLonga(pontoAtivo.value.data) + ": " + formatar(pontoAtivo.value.valor) : "");
watch(() => [props.points, props.metrica], () => { indiceAtivo.value = null; });

function formatar(valor) {
  return props.metrica === "total_pedidos"
    ? new Intl.NumberFormat("pt-BR").format(valor)
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
function compacto(valor) {
  return props.metrica === "total_pedidos"
    ? new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 0 }).format(valor)
    : new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
}
function dataCurta(valor) { return valor.slice(8, 10) + "/" + valor.slice(5, 7); }
function dataLonga(valor) { return dataCurta(valor) + "/" + valor.slice(0, 4); }

function aoMover(evento) {
  if (!svgRef.value || !posicoes.value.length) return;
  const limites = svgRef.value.getBoundingClientRect();
  const x = (evento.clientX - limites.left) / Math.max(1, limites.width) * LARGURA;
  indiceAtivo.value = Math.max(0, Math.min(posicoes.value.length - 1,
    Math.round((x - LADO_ESQUERDO) / (LADO_DIREITO - LADO_ESQUERDO) * (posicoes.value.length - 1))));
}
function aoSair() {
  if (document.activeElement !== graficoRef.value) indiceAtivo.value = null;
}
function aoTeclado(evento) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key) || !posicoes.value.length) return;
  evento.preventDefault();
  const ultimo = posicoes.value.length - 1;
  if (evento.key === "Home") indiceAtivo.value = 0;
  else if (evento.key === "End") indiceAtivo.value = ultimo;
  else indiceAtivo.value = Math.max(0, Math.min(ultimo,
    (indiceAtivo.value ?? ultimo) + (evento.key === "ArrowRight" ? 1 : -1)));
}
</script>

<style scoped>
.analytics-chart{min-width:0;color:var(--pp-admin-text)}
.analytics-chart__interactive{position:relative;min-width:0;outline-offset:4px;border-radius:8px}
.analytics-chart__svg{display:block;width:100%;height:275px;overflow:visible}
.analytics-chart__grid line{stroke:var(--pp-admin-border);stroke-width:1}
.analytics-chart__grid text,.analytics-chart__labels text{fill:var(--pp-admin-muted);font-size:13px;font-family:inherit}
.analytics-chart__area{fill:color-mix(in srgb,var(--pp-admin-accent) 13%,transparent)}
.analytics-chart__line{fill:none;stroke:var(--pp-admin-accent);stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round;animation:analytics-appear 350ms ease-out both}
.analytics-chart__focus line{stroke:var(--pp-admin-accent);stroke-width:1.5;stroke-dasharray:4 5;opacity:.6}
.analytics-chart__focus circle{fill:var(--pp-admin-surface);stroke:var(--pp-admin-accent);stroke-width:3}
.analytics-chart__tooltip{position:absolute;top:0;transform:translateX(-50%);z-index:2;pointer-events:none;display:flex;flex-direction:column;gap:3px;padding:9px 12px;border-radius:10px;background:var(--pp-admin-text);color:var(--pp-admin-bg);white-space:nowrap;box-shadow:0 8px 21px color-mix(in srgb,var(--pp-marrom) 15%,transparent);font-size:12px}
.analytics-chart__tooltip strong{font-size:15px;font-variant-numeric:tabular-nums}
.analytics-chart__zero{position:absolute;top:43%;left:50%;transform:translate(-50%,-50%);font-size:13px;color:var(--pp-admin-muted);background:var(--pp-admin-surface);padding:8px;border-radius:8px;white-space:nowrap}
.analytics-chart__hint{margin:8px 0;font-size:12px;color:var(--pp-admin-muted)}
.analytics-chart__details{margin-top:10px;font-size:13px}
.analytics-chart__details summary{cursor:pointer;min-height:42px;display:list-item;align-content:center;width:max-content;max-width:100%;font-weight:650}
.analytics-chart__table-wrap{max-height:280px;overflow:auto;border:1px solid var(--pp-admin-border);border-radius:9px}
.analytics-chart__details table{width:100%;border-collapse:collapse}
.analytics-chart__details th,.analytics-chart__details td{padding:10px 12px;border-bottom:1px solid var(--pp-admin-border);text-align:left;font-size:13px;font-variant-numeric:tabular-nums}
.analytics-chart__details td:last-child,.analytics-chart__details th:last-child{text-align:right}
.analytics-chart__sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes analytics-appear{from{opacity:0}to{opacity:1}}
@media(max-width:680px){.analytics-chart__svg{height:230px}.analytics-chart__hint{font-size:12px}.analytics-chart__zero{font-size:12px;white-space:normal;text-align:center}}
@media(prefers-reduced-motion:reduce){.analytics-chart__line{animation:none}}
</style>
