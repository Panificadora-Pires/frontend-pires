<template>
  <div class="bar-chart">
    <div v-if="!items.length" class="bar-chart__empty">Sem dados para exibir.</div>
    <div v-else class="bar-chart__rows">
      <div v-for="(item, index) in items" :key="item.id ?? item.label ?? index" class="bar-chart__row">
        <div class="bar-chart__label">
          <span>{{ item.label }}</span>
          <strong>{{ formatar(item.value) }}</strong>
        </div>
        <div class="bar-chart__track" role="img" :aria-label="`${item.label}: ${formatar(item.value)}`">
          <span class="bar-chart__fill" :style="{ width: `${largura(item.value)}%` }"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  suffix: { type: String, default: '' },
})

const maxValue = computed(() => Math.max(...props.items.map((item) => Number(item.value || 0)), 1))

function largura(value) {
  return Math.max(2, (Number(value || 0) / maxValue.value) * 100)
}

function formatar(value) {
  const formatted = new Intl.NumberFormat('pt-BR').format(Number(value || 0))
  return props.suffix ? `${formatted} ${props.suffix}` : formatted
}
</script>

<style scoped>
.bar-chart__rows { display: grid; gap: 16px; }
.bar-chart__label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
.bar-chart__label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #44403c; font-size: 12px; font-weight: 600; }
.bar-chart__label strong { color: #57534e; font-size: 12px; font-weight: 700; }
.bar-chart__track { height: 8px; overflow: hidden; border-radius: 999px; background: #efeeec; }
.bar-chart__fill { height: 100%; display: block; border-radius: inherit; background: #a16207; }
.bar-chart__empty { min-height: 240px; display: grid; place-items: center; color: #8a8580; font-size: 13px; }
</style>
