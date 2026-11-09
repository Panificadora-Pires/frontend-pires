<script setup>
import { computed } from "vue";
import { motion, useReducedMotion } from "motion-v";
import { Check, CircleX } from "lucide-vue-next";
import { etapasPedido } from "@/utils/orders";

const props = defineProps({ status: { type: String, required: true } });
const reduzir = useReducedMotion();
const etapaAtual = computed(() =>
  etapasPedido.findIndex((etapa) => etapa.status === props.status),
);
</script>

<template>
  <p v-if="status === 'cancelado'" class="order-progress__cancelled">
    <CircleX :size="20" aria-hidden="true" /> Fluxo encerrado por cancelamento.
  </p>
  <ol
    v-else-if="etapaAtual >= 0"
    class="order-progress"
    aria-label="Etapas do pedido"
  >
    <li
      v-for="(etapa, indice) in etapasPedido"
      :key="etapa.status"
      :class="{
        'is-complete': indice < etapaAtual,
        'is-current': indice === etapaAtual,
      }"
      :aria-current="indice === etapaAtual ? 'step' : undefined"
    >
      <span class="order-progress__point"
        ><Check v-if="indice < etapaAtual" :size="15" aria-hidden="true" /><span
          v-else
          aria-hidden="true"
          >{{ indice + 1 }}</span
        ></span
      >
      <span
        >{{ etapa.titulo
        }}<span class="order-progress__sr">{{
          indice < etapaAtual
            ? ", concluído"
            : indice === etapaAtual
              ? ", etapa atual"
              : ", aguardando"
        }}</span></span
      >
      <span
        v-if="indice < etapasPedido.length - 1"
        class="order-progress__track"
        aria-hidden="true"
        ><motion.span
          :initial="false"
          :animate="{ scaleX: indice < etapaAtual ? 1 : 0 }"
          :transition="{ duration: reduzir ? 0 : 0.32, ease: 'easeOut' }"
      /></span>
    </li>
  </ol>
</template>

<style scoped>
.order-progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0;
  margin: 30px 0 0;
  list-style: none;
}
.order-progress li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--pp-texto-3);
  font-size: 12px;
  font-weight: 600;
}
.order-progress__point {
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 50%;
  background: var(--pp-creme);
}
.is-complete .order-progress__point {
  background: var(--pp-marrom);
  color: var(--pp-creme);
  border-color: var(--pp-marrom);
}
.is-current .order-progress__point {
  background: var(--pp-gold);
  color: var(--pp-marrom);
  border-color: var(--pp-gold);
}
.is-current {
  color: var(--pp-marrom) !important;
}
.order-progress__track {
  position: absolute;
  top: 14px;
  left: 30px;
  right: 0;
  height: 2px;
  background: var(--pp-creme-borda);
}
.order-progress__track > span {
  display: block;
  height: 100%;
  background: var(--pp-marrom);
  transform-origin: left;
}
.order-progress__cancelled {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--student-danger);
}
.order-progress__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 520px) {
  .order-progress {
    grid-template-columns: 1fr;
    gap: 0;
    margin-top: 24px;
  }
  .order-progress li {
    min-height: 42px;
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
  }
  .order-progress li > span:nth-child(2) {
    padding-top: 7px;
  }
  .order-progress li:last-child {
    min-height: 30px;
  }
  .order-progress__track {
    top: 30px;
    bottom: 0;
    left: 14px;
    right: auto;
    width: 2px;
    height: auto;
  }
}
</style>
