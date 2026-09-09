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
.order-status {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--pp-radius-full);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.015em;
  white-space: nowrap;
}

.order-status--pendente {
  border-color: rgba(224, 168, 62, 0.2);
  background: #fff6e5;
  color: #a86a0d;
}

.order-status--confirmado {
  border-color: rgba(70, 117, 169, 0.14);
  background: #eef5fb;
  color: #456f9f;
}

.order-status--pronto {
  border-color: rgba(111, 163, 111, 0.18);
  background: #edf7ec;
  color: #527e50;
}

.order-status--retirado {
  border-color: rgba(82, 126, 80, 0.16);
  background: #f1f6f0;
  color: #5a7658;
}

.order-status--cancelado {
  border-color: rgba(224, 96, 90, 0.16);
  background: #fff0ef;
  color: #b24f4a;
}

.order-status--neutro {
  border-color: rgba(43, 43, 43, 0.08);
  background: #f4f1ee;
  color: #6f6862;
}
</style>
