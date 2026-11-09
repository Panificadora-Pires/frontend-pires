<script setup>
import { computed } from "vue";
import { MessageCircle, QrCode } from "lucide-vue-next";
import CardActionContent from "@/components/ui/CardActionContent.vue";
const props = defineProps({
  pedido: { type: Object, required: true },
  naoLidas: { type: Number, default: 0 },
});
const emit = defineEmits(["ver-qrcode", "abrir-chat"]);
const rotuloChat = computed(
  () =>
    `Mensagens do pedido #${props.pedido.id}${props.naoLidas ? `: ${props.naoLidas} ${props.naoLidas === 1 ? "mensagem nova" : "mensagens novas"}` : ""}`,
);
</script>
<template>
  <div class="order-card__actions">
    <button
      v-if="pedido.status === 'pronto'"
      type="button"
      class="order-card__qr pp-card-action"
      :aria-label="`Ver QR Code do pedido #${pedido.id}`"
      @click="emit('ver-qrcode', pedido)"
    >
      <CardActionContent
        ><QrCode :size="18" aria-hidden="true" /><span
          >Ver QR Code</span
        ></CardActionContent
      >
    </button>
    <button
      type="button"
      class="order-card__chat pp-card-action"
      :aria-label="rotuloChat"
      @click="emit('abrir-chat', pedido)"
    >
      <CardActionContent
        ><MessageCircle :size="17" aria-hidden="true" /><span>Mensagens</span
        ><span v-if="naoLidas" class="order-card__badge" aria-hidden="true">{{
          naoLidas > 9 ? "9+" : naoLidas
        }}</span></CardActionContent
      >
    </button>
  </div>
</template>
<style scoped>
.order-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.order-card__actions :deep(.pp-card-action__content) {
  gap: 8px;
}
.order-card__actions button {
  min-height: 46px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--pp-creme-borda);
  background: transparent;
  color: var(--pp-marrom);
  cursor: pointer;
  font: 600 13px var(--pp-font-body);
}
.order-card__actions .order-card__qr {
  background: var(--pp-marrom);
  border-color: var(--pp-marrom);
  color: var(--pp-creme);
}
.order-card__badge {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--pp-gold);
  color: var(--pp-marrom);
  font-size: 11px;
}

.order-card__actions button:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (hover: hover) {
  .order-card__actions button:hover {
    border-color: var(--pp-dourado-escuro);
  }
}
@media (max-width: 620px) {
  .order-card__actions button {
    flex: 1;
  }
  /* Reserva a coluna do chatbot quando a ação cruza a faixa fixa. */
  .order-card__actions {
    padding-right: 56px;
  }
}
</style>
