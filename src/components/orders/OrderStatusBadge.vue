<template>
  <span class="order-status" :class="`order-status--${config.chave}`">
    <component :is="config.icon" :size="14" aria-hidden="true" />
    <span>{{ config.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import {
  BadgeCheck,
  CircleCheckBig,
  CircleX,
  Clock3,
  PackageCheck,
} from 'lucide-vue-next'

const props = defineProps({
  status: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
})

const mapa = {
  pendente: {
    chave: 'pendente',
    label: 'Pendente',
    icon: Clock3,
  },
  confirmado: {
    chave: 'confirmado',
    label: 'Confirmado',
    icon: BadgeCheck,
  },
  pronto: {
    chave: 'pronto',
    label: 'Pronto',
    icon: PackageCheck,
  },
  retirado: {
    chave: 'retirado',
    label: 'Retirado',
    icon: CircleCheckBig,
  },
  cancelado: {
    chave: 'cancelado',
    label: 'Cancelado',
    icon: CircleX,
  },
}

const config = computed(() => {
  const base = mapa[props.status] || {
    chave: 'neutro',
    label: props.status || 'Status',
    icon: Clock3,
  }

  return {
    ...base,
    label: props.label || base.label,
  }
})
</script>

<style scoped>
.order-status{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:6px;border:1px solid transparent;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.order-status--pendente{background:#fff7e8;border-color:#ead7b0;color:#835f20}.order-status--confirmado{background:#eef3f8;border-color:#cfdae5;color:#506b82}.order-status--pronto{background:#edf5e9;border-color:#cadcc1;color:#547341}.order-status--retirado{background:#f2f2f2;border-color:#dfdfdf;color:#5f5f5f}.order-status--cancelado{background:#fff0ef;border-color:#ebcfcc;color:#984843}.order-status--neutro{background:#f2f0ed;border-color:#e0dcd7;color:#716960}
</style>
