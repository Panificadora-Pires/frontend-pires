<template>
  <div class="order-items-preview">
    <div
      v-for="item in itensVisiveis"
      :key="item.id || `${item.produto}-${item.produto_nome}`"
      class="order-items-preview__item"
    >
      <span class="order-items-preview__quantity">{{ item.quantidade }}×</span>
      <span class="order-items-preview__name">{{ item.produto_nome }}</span>
      <span class="order-items-preview__subtotal">
        {{ formatarMoeda(item.subtotal) }}
      </span>
    </div>

    <span v-if="restantes" class="order-items-preview__more">
      + {{ restantes }} {{ restantes === 1 ? 'item' : 'itens' }} no pedido
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  itens: {
    type: Array,
    default: () => [],
  },
  limite: {
    type: Number,
    default: 3,
  },
})

const itensVisiveis = computed(() => props.itens.slice(0, props.limite))
const restantes = computed(() => Math.max(0, props.itens.length - props.limite))

function formatarMoeda(valor) {
  const numero = Number(valor || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0)
}
</script>

<style scoped>
.order-items-preview {
  display: grid;
  gap: 9px;
}

.order-items-preview__item {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: #655d56;
  font-size: 12px;
}

.order-items-preview__quantity {
  color: #b17a26;
  font-weight: 800;
}

.order-items-preview__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.order-items-preview__subtotal {
  color: #81776e;
  font-size: 11px;
  font-weight: 650;
}

.order-items-preview__more {
  margin-top: 1px;
  color: #a09992;
  font-size: 10px;
  font-weight: 650;
}

@media (max-width: 560px) {
  .order-items-preview__item {
    grid-template-columns: 30px minmax(0, 1fr);
  }

  .order-items-preview__subtotal {
    display: none;
  }
}
</style>
