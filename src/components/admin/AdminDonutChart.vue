<template>
  <div class="donut-chart">
    <div class="donut-chart__graphic">
      <svg viewBox="0 0 120 120" role="img" :aria-label="ariaLabel">
        <circle class="donut-chart__base" cx="60" cy="60" r="46" />
        <circle
          v-for="segment in segments"
          :key="segment.label"
          class="donut-chart__segment"
          cx="60"
          cy="60"
          r="46"
          :stroke="segment.color"
          :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
          :stroke-dashoffset="-segment.offset"
        >
          <title>{{ segment.label }}: {{ segment.value }}</title>
        </circle>
      </svg>
      <div class="donut-chart__center">
        <strong>{{ total }}</strong>
        <span>{{ centerLabel }}</span>
      </div>
    </div>

    <div class="donut-chart__legend">
      <div v-for="segment in segments" :key="segment.label" class="donut-chart__legend-row">
        <span class="donut-chart__dot" :style="{ background: segment.color }"></span>
        <span>{{ segment.label }}</span>
        <strong>{{ percentual(segment.value) }}%</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  centerLabel: { type: String, default: 'pedidos' },
  ariaLabel: { type: String, default: 'Distribuição por categoria' },
})

const circumference = 2 * Math.PI * 46
const palette = ['#a16207', '#2563eb', '#15803d', '#7c3aed', '#b91c1c', '#57534e']
const total = computed(() => props.items.reduce((sum, item) => sum + Number(item.value || 0), 0))

const segments = computed(() => {
  let offset = 0
  return props.items
    .filter((item) => Number(item.value || 0) > 0)
    .map((item, index) => {
      const value = Number(item.value || 0)
      const length = total.value ? (value / total.value) * circumference : 0
      const result = {
        ...item,
        value,
        color: item.color || palette[index % palette.length],
        length,
        offset,
      }
      offset += length
      return result
    })
})

function percentual(value) {
  if (!total.value) return 0
  return Math.round((Number(value || 0) / total.value) * 100)
}
</script>

<style scoped>
.donut-chart { display: grid; grid-template-columns: 190px minmax(0, 1fr); align-items: center; gap: 22px; }
.donut-chart__graphic { position: relative; width: 180px; height: 180px; }
.donut-chart__graphic svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-chart__base { fill: none; stroke: #efeeec; stroke-width: 12; }
.donut-chart__segment { fill: none; stroke-width: 12; stroke-linecap: butt; transition: stroke-dasharray 180ms ease; }
.donut-chart__center { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; pointer-events: none; }
.donut-chart__center strong { color: #1c1917; font-size: 25px; line-height: 1; }
.donut-chart__center span { margin-top: 5px; color: #8a8580; font-size: 11px; }
.donut-chart__legend { display: grid; gap: 10px; }
.donut-chart__legend-row { display: grid; grid-template-columns: 10px minmax(0,1fr) auto; align-items: center; gap: 9px; color: #57534e; font-size: 12px; }
.donut-chart__legend-row strong { color: #44403c; font-size: 12px; }
.donut-chart__dot { width: 8px; height: 8px; border-radius: 50%; }
@media (max-width: 600px) { .donut-chart { grid-template-columns: 1fr; justify-items: center; } .donut-chart__legend { width: 100%; } }
</style>
