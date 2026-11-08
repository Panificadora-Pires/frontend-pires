<script setup>
import { computed, onMounted } from "vue";
import { motion, useReducedMotion } from "motion-v";
import {
  ArrowUpRight,
  Bell,
  Check,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
} from "lucide-vue-next";
import {
  apresentarNotificacao,
  formatarDataNotificacao,
} from "@/utils/notifications";

const props = defineProps({
  notificacao: { type: Object, required: true },
  processando: { type: Boolean, default: false },
  bloqueada: { type: Boolean, default: false },
  animar: { type: Boolean, default: false },
});
const emit = defineEmits(["marcar-lida", "apareceu"]);
const reduzir = useReducedMotion();
const apresentacao = computed(() => apresentarNotificacao(props.notificacao));
const icone = computed(
  () =>
    ({ retirada: PackageCheck, mensagem: MessageCircle, generica: Bell })[
      apresentacao.value.tipo
    ],
);
// Apenas a montagem de um ID realmente novo recebe entrada; mudanças de leitura não a reiniciam.
const entrada =
  props.animar && !reduzir.value ? { opacity: 0.65, y: 8 } : false;
const tituloId = `notificacao-titulo-${props.notificacao.id}`;
const rotuloLeitura = computed(
  () =>
    `Marcar como lida: ${apresentacao.value.titulo}${props.notificacao.pedido ? `, pedido #${props.notificacao.pedido}` : ""}`,
);
const dataISO = computed(() =>
  Number.isNaN(Date.parse(props.notificacao.criada_em))
    ? undefined
    : props.notificacao.criada_em,
);
onMounted(() => emit("apareceu", props.notificacao.id));
</script>

<template>
  <motion.li
    :id="`notificacao-${notificacao.id}`"
    class="notification-item"
    :class="{ 'is-unread': !notificacao.lida }"
    tabindex="-1"
    :initial="entrada"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: reduzir ? 0 : 0.26, ease: 'easeOut' }"
  >
    <article :aria-labelledby="tituloId" class="notification-item__body">
      <component
        :is="icone"
        class="notification-item__icon"
        :size="24"
        aria-hidden="true"
      />
      <div class="notification-item__content">
        <div class="notification-item__heading">
          <h3 :id="tituloId">{{ apresentacao.titulo }}</h3>
          <span class="notification-item__state"
            ><Check
              v-if="notificacao.lida"
              :size="14"
              aria-hidden="true"
            /><span
              v-else
              class="notification-item__dot"
              aria-hidden="true"
            />{{ notificacao.lida ? "Lida" : "Nova" }}</span
          >
        </div>
        <p class="notification-item__message">{{ notificacao.mensagem }}</p>
        <div class="notification-item__footer">
          <div class="notification-item__actions">
            <RouterLink
              v-if="apresentacao.destino"
              :to="apresentacao.destino"
              class="notification-item__open"
              >{{ apresentacao.acao
              }}<ArrowUpRight :size="16" aria-hidden="true"
            /></RouterLink>
            <button
              v-if="!notificacao.lida"
              type="button"
              class="notification-item__read"
              :disabled="processando || bloqueada"
              :aria-label="rotuloLeitura"
              :aria-busy="processando"
              @click="emit('marcar-lida', notificacao.id)"
            >
              <LoaderCircle
                v-if="processando"
                :size="17"
                class="notification-item__spinner"
                aria-hidden="true"
              /><Check v-else :size="17" aria-hidden="true" /><span
                class="notification-item__read-label"
                >{{ processando ? "Marcando…" : "Marcar como lida" }}</span
              >
            </button>
          </div>
          <time :datetime="dataISO">{{
            formatarDataNotificacao(notificacao.criada_em)
          }}</time>
        </div>
      </div>
    </article>
  </motion.li>
</template>

<style scoped>
.notification-item {
  margin: 0;
  padding: 22px 20px;
  border-bottom: 1px solid var(--pp-creme-borda);
  background: transparent;
  color: var(--pp-marrom);
  transition: background-color 220ms var(--pp-ease);
  scroll-margin-top: calc(var(--pp-altura-topo) + 24px);
}
.notification-item.is-unread {
  background: var(--pp-creme-2);
}
.notification-item__body {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 18px;
}
.notification-item__icon {
  margin-top: 2px;
  color: var(--pp-texto-3);
}
.is-unread .notification-item__icon {
  color: var(--pp-dourado-profundo);
}
.notification-item__content {
  min-width: 0;
}
.notification-item__heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}
.notification-item__heading h3 {
  margin: 0;
  font: 500 17px/1.45 var(--pp-font-body);
  letter-spacing: -0.015em;
}
.is-unread .notification-item__heading h3 {
  font-weight: 700;
}
.notification-item__state {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--pp-texto-3);
  font-size: 11px;
}
.is-unread .notification-item__state {
  color: var(--pp-dourado-profundo);
  font-weight: 700;
}
.notification-item__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.notification-item__message {
  margin: 7px 0 10px;
  max-width: 74ch;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.notification-item__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 20px;
}
.notification-item__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
}
.notification-item__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  color: var(--pp-marrom);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 5px;
}
.notification-item__read {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 8px;
  background: transparent;
  color: var(--pp-texto-2);
  cursor: pointer;
  font: 500 12px var(--pp-font-body);
}
.notification-item__read:disabled {
  cursor: wait;
  opacity: 0.65;
}
.notification-item time {
  color: var(--pp-texto-3);
  font-size: 11px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.notification-item :is(a, button):focus-visible,
.notification-item:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.notification-item__spinner {
  animation: notification-spin 850ms linear infinite;
}
@keyframes notification-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (hover: hover) {
  .notification-item__read:hover:not(:disabled) {
    border-color: var(--pp-dourado-escuro);
    color: var(--pp-marrom);
  }
}
@media (max-width: 620px) {
  .notification-item {
    padding: 20px 12px;
  }
  .notification-item__body {
    grid-template-columns: 21px minmax(0, 1fr);
    gap: 12px;
  }
  .notification-item__icon {
    width: 21px;
    height: 21px;
  }
  .notification-item__heading {
    gap: 10px;
    align-items: flex-start;
  }
  .notification-item__heading h3 {
    font-size: 15px;
  }
  .notification-item__state {
    padding-top: 3px;
    font-size: 10px;
  }
  .notification-item__message {
    font-size: 13px;
  }
  .notification-item__footer {
    align-items: flex-start;
    gap: 8px;
  }
  /* Deixa o corredor do chatbot livre quando ações cruzam a faixa flutuante. */
  .notification-item__actions {
    width: 100%;
    padding-right: 48px;
    gap: 12px;
  }
  .notification-item__read-label {
    display: none;
  }
  .notification-item__open {
    font-size: 12px;
    gap: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .notification-item {
    transition: none;
  }
  .notification-item__spinner {
    animation: none;
  }
}
</style>
