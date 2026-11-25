<script setup>
import { MessageCircle } from "lucide-vue-next";

import CardActionContent from "@/components/ui/CardActionContent.vue";
import {
  formatarData,
  itensDoPedido,
  moeda,
  proximaAcao,
} from "@/utils/adminKanban";

defineProps({
  pedido: { type: Object, required: true },
  emAcao: { type: [Number, String], default: null },
  naoLidas: { type: Number, default: 0 },
});
const emit = defineEmits(["avancar"]);
</script>

<template>
  <article
    :data-pedido-id="pedido.id"
    class="kanban-card"
  >
    <div class="kanban-card-top">
      <span class="kanban-order-id">#{{ pedido.id }}</span>
      <time :datetime="pedido.data">{{
        formatarData(pedido.data)
      }}</time>
    </div>
    <strong class="kanban-client">{{
      pedido.usuario_nome || "Cliente"
    }}</strong>
    <p class="kanban-items">{{ itensDoPedido(pedido) }}</p>
    <div class="kanban-payment-details">
      <span>{{
        pedido.forma_pagamento_display ||
        pedido.forma_pagamento ||
        "Pagamento não informado"
      }}</span>
      <span
        class="kanban-payment-pill"
        :class="'payment-' + pedido.status_pagamento"
        >{{
          pedido.status_pagamento_display ||
          pedido.status_pagamento ||
          "—"
        }}</span
      >
    </div>
    <div class="kanban-card-bottom">
      <strong>{{ moeda(pedido.total) }}</strong>
      <span
        v-if="naoLidas"
        class="kanban-unread"
        ><MessageCircle :size="14" aria-hidden="true" />{{
          naoLidas
        }}
        nova(s)</span
      >
    </div>
    <div class="kanban-card-actions">
      <RouterLink
        class="pp-card-action pp-admin-action--secondary"
        data-card-action-radius
        :to="{
          name: 'admin-pedido-detalhes',
          params: { id: pedido.id },
        }"
      >
        <CardActionContent>Ver detalhes</CardActionContent>
      </RouterLink>
      <button
        v-if="proximaAcao(pedido)"
        type="button"
        class="pp-card-action pp-admin-action--primary"
        data-card-action-radius
        :disabled="emAcao === pedido.id"
        @click="emit('avancar', pedido, $event)"
      >
        <CardActionContent>{{
          emAcao === pedido.id
            ? "Salvando…"
            : proximaAcao(pedido).label
        }}</CardActionContent>
      </button>
      <RouterLink
        v-else-if="pedido.status === 'pronto'"
        class="kanban-retirada pp-card-action pp-admin-action--secondary"
        data-card-action-radius
        :to="{
          name: 'admin-pedido-detalhes',
          params: { id: pedido.id },
        }"
      >
        <CardActionContent>Retirada / QR Code</CardActionContent>
      </RouterLink>
    </div>
    <p
      v-if="pedido.status === 'pendente' && !proximaAcao(pedido)"
      class="kanban-waiting"
    >
      Aguardando aprovação do pagamento para confirmar.
    </p>
  </article>
</template>

<style scoped src="./AdminKanbanCard.css"></style>
