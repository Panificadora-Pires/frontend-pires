<template>
  <Teleport to="body">
    <div class="chat-drawer" @click.self="fechar">
      <section
        ref="painel"
        class="chat-drawer__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
        @keydown="prenderFoco"
      >
        <header class="chat-drawer__header">
          <span class="chat-drawer__icon">
            <MessageCircle :size="19" aria-hidden="true" />
          </span>
          <div>
            <h2 :id="idTitulo">Pedido #{{ pedido.id }}</h2>
            <p>Conversa com o balcão da Pires</p>
          </div>
          <button
            ref="botaoFechar"
            type="button"
            class="chat-drawer__close"
            aria-label="Fechar conversa"
            @click="fechar"
          >
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <OrderChatPanel
          ref="conversa"
          class="chat-drawer__body"
          :pedido-id="pedido.id"
          variante="cliente"
        />
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { MessageCircle, X } from "lucide-vue-next";

import OrderChatPanel from "@/components/chat/OrderChatPanel.vue";

const props = defineProps({
  pedido: { type: Object, required: true },
});

const emit = defineEmits(["close"]);

const painel = ref(null);
const botaoFechar = ref(null);
const conversa = ref(null);
const idTitulo = `chat-drawer-titulo-${props.pedido.id}`;
let overflowAnterior = "";
let focoAnterior = null;

function fechar() {
  emit("close");
}

function tratarTecla(event) {
  if (event.key === "Escape") fechar();
}

// Mantém o Tab dentro da gaveta enquanto ela está aberta.
function prenderFoco(event) {
  if (event.key !== "Tab" || !painel.value) return;
  const focaveis = painel.value.querySelectorAll(
    'button:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
  );
  if (!focaveis.length) return;
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];

  if (event.shiftKey && document.activeElement === primeiro) {
    event.preventDefault();
    ultimo.focus();
  } else if (!event.shiftKey && document.activeElement === ultimo) {
    event.preventDefault();
    primeiro.focus();
  }
}

onMounted(async () => {
  focoAnterior = document.activeElement;
  overflowAnterior = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", tratarTecla);
  await nextTick();
  botaoFechar.value?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = overflowAnterior;
  window.removeEventListener("keydown", tratarTecla);
  // Devolve o foco para o botão que abriu a conversa.
  focoAnterior?.focus?.();
});
</script>

<style scoped>
.chat-drawer {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  justify-content: flex-end;
  background: var(--pp-overlay);
}
.chat-drawer__panel {
  width: min(420px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--student-surface);
  color: var(--student-text);
  box-shadow: var(--pp-shadow-soft);
  animation: chat-drawer-entrar 0.22s ease-out;
}
@keyframes chat-drawer-entrar {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
}
.chat-drawer__header {
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  padding: var(--pp-space-2) var(--pp-space-3);
  border-bottom: 1px solid var(--student-border);
}
.chat-drawer__icon {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: var(--student-radius-sm);
  background: var(--student-accent-soft);
  color: var(--student-accent-hover);
}
.chat-drawer__header div {
  flex: 1;
  min-width: 0;
}
.chat-drawer__header h2 {
  margin: 0;
  font-size: 16px;
}
.chat-drawer__header p {
  margin: 2px 0 0;
  color: var(--student-muted);
  font-size: 12px;
}
.chat-drawer__close {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--student-border);
  border-radius: 50%;
  background: var(--student-surface);
  color: var(--student-muted);
  cursor: pointer;
}
.chat-drawer__body {
  flex: 1;
  min-height: 0;
}
@media (max-width: 620px) {
  .chat-drawer__panel {
    width: 100%;
    height: 100dvh;
  }
}
</style>
