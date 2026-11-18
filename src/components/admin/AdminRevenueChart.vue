<template>
  <div ref="container" class="pp-admin-revenue-chart">
    <svg :viewBox="`0 0 ${width} 180`" role="img" :aria-labelledby="titleId">
      <title :id="titleId">Faturamento diário de pedidos retirados, em reais</title>
      <g class="chart-grid"><line v-for="tick in ticks" :key="tick.y" x1="48" :x2="width - 12" :y1="tick.y" :y2="tick.y" /></g>
      <g class="chart-labels"><text v-for="tick in ticks" :key="tick.y" x="0" :y="tick.y + 4">{{ compacto(tick.value) }}</text></g>
      <path class="chart-area" :d="area" /><path class="chart-line" :d="line" />
      <g v-for="(point, index) in positions" :key="point.label">
        <circle :cx="point.x" :cy="point.y" r="3"><title>{{ point.label }}: {{ moeda(point.value) }}</title></circle>
        <text v-if="index % 2 === 0 || index === positions.length - 1" class="chart-labels chart-date" :x="point.x" y="175">{{ point.label }}</text>
      </g>
    </svg>
    <details class="chart-values"><summary>Ver valores por dia</summary><dl><div v-for="point in points" :key="point.label"><dt>{{ point.label }}</dt><dd>{{ moeda(point.value) }}</dd></div></dl></details>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';
const props = defineProps({ points: { type: Array, required: true } });
const titleId = `admin-revenue-${useId()}`;
const container = ref(null);
const width = ref(360);
let observer;
const max = computed(() => {
  const value = Math.max(0, ...props.points.map(p => Number(p.value) || 0));
  if (!value) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
});
const ticks = computed(() => [0, 1, 2, 3].map(i => ({ y: 145 - i * 40, value: max.value * i / 3 })));
const positions = computed(() => props.points.map((p, index) => ({ ...p, x: 48 + index / Math.max(1, props.points.length - 1) * (width.value - 60), y: 145 - Number(p.value || 0) / max.value * 120 })));
const line = computed(() => positions.value.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(''));
const area = computed(() => positions.value.length ? `${line.value}L${positions.value.at(-1).x} 145H48Z` : '');
const moeda = valor => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const compacto = valor => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
onMounted(() => {
  const resize = () => { width.value = Math.max(230, container.value?.clientWidth || 360); };
  resize(); observer = new ResizeObserver(resize); observer.observe(container.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<style scoped>
.pp-admin-revenue-chart{min-width:0}.pp-admin-revenue-chart svg{display:block;width:100%;height:180px;overflow:visible}
.chart-grid line{stroke:var(--pp-admin-border);stroke-width:1}.chart-labels{fill:var(--pp-admin-muted);font:13px var(--pp-font-body,Inter,sans-serif)}
.chart-date{text-anchor:middle}.chart-area{fill:var(--pp-creme-2)}.chart-line{stroke:var(--pp-admin-accent);stroke-width:2;fill:none}
circle{fill:var(--pp-admin-surface);stroke:var(--pp-admin-accent);stroke-width:2}
.chart-values{margin-top:8px;font-size:13px;color:var(--pp-admin-muted)}.chart-values summary{cursor:pointer;min-height:44px;align-content:center;width:max-content;max-width:100%}
.chart-values summary:focus-visible{outline:3px solid var(--pp-admin-accent);outline-offset:3px;border-radius:4px}
.chart-values dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:8px 0 0}.chart-values dd{margin:2px 0 0;color:var(--pp-admin-text);font-variant-numeric:tabular-nums}
</style>
