<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { MessageCircle, X } from "lucide-vue-next";
import OrderChatPanel from "@/components/chat/OrderChatPanel.vue";
import { useOrderDialog } from "@/composables/useOrderDialog";

const props = defineProps({ pedido: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const dialogo = ref(null);
const { fechar, fecharNoFundo } = useOrderDialog(dialogo, () => emit("close"));
const idTitulo = `chat-drawer-titulo-${props.pedido.id}`;
// O teclado pode reduzir apenas o viewport visual, sem alterar 100dvh.
function ajustarViewport() {
  const viewport = window.visualViewport;
  dialogo.value?.style.setProperty(
    "--chat-height",
    `${viewport?.height ?? window.innerHeight}px`,
  );
  dialogo.value?.style.setProperty(
    "--chat-top",
    `${viewport?.offsetTop ?? 0}px`,
  );
}
onMounted(() => {
  ajustarViewport();
  window.visualViewport?.addEventListener("resize", ajustarViewport);
  window.visualViewport?.addEventListener("scroll", ajustarViewport);
});
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener("resize", ajustarViewport);
  window.visualViewport?.removeEventListener("scroll", ajustarViewport);
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      class="chat-drawer"
      :aria-labelledby="idTitulo"
      @cancel.prevent="fechar"
      @click="fecharNoFundo"
    >
      <header class="chat-drawer__header">
        <MessageCircle :size="24" aria-hidden="true" />
        <div>
          <h2 :id="idTitulo">Pedido #{{ pedido.id }}</h2>
          <p>Conversa com o balcão da Pires</p>
        </div>
        <button
          type="button"
          autofocus
          class="chat-drawer__close"
          aria-label="Fechar conversa"
          @click="fechar"
        >
          <X :size="20" aria-hidden="true" />
        </button>
      </header>
      <OrderChatPanel
        :key="pedido.id"
        class="chat-drawer__body"
        :pedido-id="pedido.id"
        variante="cliente"
      />
    </dialog>
  </Teleport>
</template>

<style scoped>
.chat-drawer {
  position: fixed;
  inset: var(--chat-top, 0px) 0 auto auto;
  margin: 0;
  padding: 0;
  width: min(480px, 100%);
  max-width: 100%;
  height: var(--chat-height, 100dvh);
  max-height: 100dvh;
  border: 0;
  background: var(--pp-creme);
  color: var(--pp-marrom);
  font-family: var(--pp-font-body);
  box-shadow: var(--pp-shadow-soft);
  overflow: hidden;
}
.chat-drawer[open] {
  display: flex;
  flex-direction: column;
  animation: chat-drawer-enter 280ms var(--pp-ease);
}
.chat-drawer::backdrop {
  background: var(--pp-overlay);
}
.chat-drawer__header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  padding: 24px;
  border-bottom: 1px solid var(--pp-creme-borda);
}
.chat-drawer__header > svg {
  color: var(--pp-dourado-profundo);
}
.chat-drawer__header div {
  flex: 1;
  min-width: 0;
}
.chat-drawer__header h2 {
  font: 400 28px/1.2 var(--pp-font-titulo);
  margin: 0 0 6px;
}
.chat-drawer__header p {
  color: var(--pp-texto-2);
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
.chat-drawer__close {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 50%;
  background: transparent;
  color: var(--pp-marrom);
  cursor: pointer;
}
.chat-drawer__close:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 3px;
}
.chat-drawer__body {
  flex: 1;
  min-height: 0;
}
.chat-drawer :deep(.order-chat--cliente) {
  --chat-surface: var(--pp-creme);
  --chat-surface-soft: var(--pp-creme-2);
  --chat-accent: var(--pp-marrom);
  --chat-accent-hover: var(--pp-marrom-2);
  --chat-accent-soft: var(--pp-creme-3);
}
.chat-drawer :deep(.order-chat__messages) {
  padding: 24px;
  scrollbar-color: var(--pp-creme-borda) var(--pp-creme);
}
.chat-drawer :deep(.order-chat__message) {
  max-width: 88%;
  padding: 14px 16px;
  border-radius: 12px 12px 12px 3px;
}
.chat-drawer :deep(.order-chat__message.is-mine) {
  border-radius: 12px 12px 3px 12px;
}
.chat-drawer :deep(.order-chat__text) {
  font-size: 14px;
  line-height: 1.65;
}
.chat-drawer :deep(.order-chat__composer) {
  padding: 16px 24px max(20px, env(safe-area-inset-bottom));
}
.chat-drawer :deep(.order-chat__send) {
  min-width: 44px;
  min-height: 44px;
}
.chat-drawer :deep(.order-chat__field textarea) {
  font-size: 16px;
}
.chat-drawer :deep(.order-chat__link-btn) {
  min-height: 44px;
}
@keyframes chat-drawer-enter {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@media (max-width: 390px) {
  .chat-drawer__header {
    padding: 20px 16px;
    gap: 10px;
  }
  .chat-drawer :deep(.order-chat__messages) {
    padding: 20px 16px;
  }
  .chat-drawer :deep(.order-chat__composer) {
    padding: 12px 16px max(16px, env(safe-area-inset-bottom));
  }
}
@media (prefers-reduced-motion: reduce) {
  .chat-drawer[open] {
    animation: none;
  }
}
</style>
