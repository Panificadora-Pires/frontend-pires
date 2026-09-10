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
      + {{ restantes }} {{ restantes === 1 ? "item" : "itens" }} no pedido
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  itens: {
    type: Array,
    default: () => [],
  },
  limite: {
    type: Number,
    default: 3,
  },
});

const itensVisiveis = computed(() => props.itens.slice(0, props.limite));
const restantes = computed(() =>
  Math.max(0, props.itens.length - props.limite),
);

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numero) ? numero : 0);
}
</script>

<style scoped>
.order-items-preview {
  display: grid;
}
.order-items-preview__item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 36px;
  border-bottom: 1px solid #f0ece7;
  font-size: 10px;
}
.order-items-preview__item:last-child {
  border-bottom: 0;
}
.order-items-preview__quantity {
  color: var(--student-muted);
  font-size: 9px;
}
.order-items-preview__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4b443e;
}
.order-items-preview__subtotal {
  color: var(--student-text);
  font-weight: 650;
}
.order-items-preview__more {
  padding: 8px 0;
  color: var(--student-muted);
  font-size: 9px;
}
</style>
