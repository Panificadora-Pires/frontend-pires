<template>
  <div class="line-chart" :class="{ 'line-chart--empty': !temDados }">
    <svg v-if="temDados" class="line-chart__svg" viewBox="0 0 760 280" role="img" :aria-label="ariaLabel">
      <g class="line-chart__grid">
        <template v-for="tick in ticks" :key="tick.y">
          <line :x1="padding.left" :x2="width - padding.right" :y1="tick.y" :y2="tick.y" />
          <text x="6" :y="tick.y + 4">{{ formatarCompacto(tick.value) }}</text>
        </template>
      </g>

      <path class="line-chart__area" :d="areaPath" />
      <path class="line-chart__line" :d="linePath" />

      <g v-for="(point, index) in pontosSvg" :key="`${point.label}-${index}`" class="line-chart__point">
        <circle :cx="point.x" :cy="point.y" r="4">
          <title>{{ point.label }}: {{ formatarValor(point.value) }}</title>
        </circle>
        <text v-if="mostrarLabel(index)" :x="point.x" :y="height - 10" text-anchor="middle">{{ point.label }}</text>
      </g>
    </svg>

    <div v-else class="line-chart__empty">Sem dados suficientes para o período selecionado.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  points: { type: Array, default: () => [] },
  currency: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Gráfico de evolução' },
})

const width = 760
const height = 280
const padding = { top: 20, right: 18, bottom: 36, left: 64 }

const valores = computed(() => props.points.map((p) => Number(p.value || 0)))
const maxValue = computed(() => Math.max(...valores.value, 0))
const escalaMax = computed(() => {
  if (maxValue.value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(maxValue.value))
  return Math.ceil(maxValue.value / magnitude) * magnitude
})

const temDados = computed(() => props.points.length > 0)

const pontosSvg = computed(() => {
  const count = props.points.length
  const usableWidth = width - padding.left - padding.right
  const usableHeight = height - padding.top - padding.bottom

  return props.points.map((point, index) => {
    const x = count === 1
      ? padding.left + usableWidth / 2
      : padding.left + (index / (count - 1)) * usableWidth
    const value = Number(point.value || 0)
    const y = padding.top + usableHeight - (value / escalaMax.value) * usableHeight
    return { ...point, value, x, y }
  })
})

const linePath = computed(() => {
  if (!pontosSvg.value.length) return ''
  return pontosSvg.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
})

const areaPath = computed(() => {
  if (!pontosSvg.value.length) return ''
  const baseY = height - padding.bottom
  const first = pontosSvg.value[0]
  const last = pontosSvg.value[pontosSvg.value.length - 1]
  return `${linePath.value} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`
})

const ticks = computed(() => {
  const usableHeight = height - padding.top - padding.bottom
  return Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    return {
      value: escalaMax.value * (1 - ratio),
      y: padding.top + usableHeight * ratio,
    }
  })
})

function mostrarLabel(index) {
  const total = props.points.length
  if (total <= 8) return true
  const step = Math.ceil(total / 7)
  return index === 0 || index === total - 1 || index % step === 0
}

function formatarValor(value) {
  if (props.currency) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatarCompacto(value) {
  if (props.currency) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
</script>

<style scoped>
.line-chart { width: 100%; min-height: 280px; }
.line-chart__svg { width: 100%; height: auto; display: block; overflow: visible; }
.line-chart__grid line { stroke: #eceae7; stroke-width: 1; }
.line-chart__grid text { fill: #8a8580; font-size: 10px; font-family: inherit; }
.line-chart__area { fill: rgba(161, 98, 7, .07); }
.line-chart__line { fill: none; stroke: #a16207; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.line-chart__point circle { fill: #fff; stroke: #a16207; stroke-width: 2; }
.line-chart__point text { fill: #8a8580; font-size: 10px; font-family: inherit; }
.line-chart__empty { min-height: 280px; display: grid; place-items: center; color: #8a8580; font-size: 13px; }
</style>
