<script setup>
import { computed, ref } from "vue";
import { motion, useReducedMotion } from "motion-v";
import { ChevronDown, PackageCheck } from "lucide-vue-next";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge.vue";
import OrderProgress from "@/components/orders/OrderProgress.vue";
import OrderActions from "@/components/orders/OrderActions.vue";
import { dataPedido, moedaPedido, informacaoStatus } from "@/utils/orders";

const props = defineProps({
  pedido: { type: Object, required: true },
  naoLidas: { type: Number, default: 0 },
  destaque: { type: Boolean, default: false },
});
const emit = defineEmits(["ver-qrcode", "abrir-chat"]);
const aberto = ref(false);
const reduzir = useReducedMotion();
const info = computed(() => informacaoStatus(props.pedido.status));
const totalItens = computed(() =>
  (props.pedido.itens || []).reduce(
    (soma, item) => soma + Number(item.quantidade || 0),
    0,
  ),
);
</script>

<template>
  <article
    class="order-card"
    :class="{
      'order-card--featured': destaque,
      'order-card--ready': pedido.status === 'pronto',
    }"
    :aria-label="`Pedido #${pedido.id}`"
  >
    <div class="order-card__tracking">
      <header class="order-card__header">
        <div>
          <h3>Pedido #{{ pedido.id }}</h3>
          <time :datetime="pedido.data">{{ dataPedido(pedido.data) }}</time>
        </div>
        <OrderStatusBadge
          :status="pedido.status"
          :label="pedido.status_display"
        />
      </header>
      <template v-if="destaque">
        <div class="order-card__message" aria-live="polite" aria-atomic="true">
          <PackageCheck
            v-if="pedido.status === 'pronto'"
            :size="28"
            aria-hidden="true"
          />
          <h4>{{ info.titulo }}</h4>
          <p>{{ info.texto }}</p>
        </div>
        <OrderActions
          :pedido="pedido"
          :nao-lidas="naoLidas"
          @ver-qrcode="emit('ver-qrcode', $event)"
          @abrir-chat="emit('abrir-chat', $event)"
        />
        <OrderProgress :status="pedido.status" />
      </template>
      <p v-else class="order-card__copy">{{ info.texto }}</p>
    </div>
    <div class="order-card__receipt">
      <button
        v-if="!destaque"
        type="button"
        class="order-card__expand"
        :aria-expanded="aberto"
        :aria-controls="`itens-pedido-${pedido.id}`"
        @click="aberto = !aberto"
      >
        {{
          aberto
            ? "Ocultar produtos"
            : `Ver ${totalItens} ${totalItens === 1 ? "item" : "itens"}`
        }}<ChevronDown
          :size="17"
          :class="{ 'is-open': aberto }"
          aria-hidden="true"
        />
      </button>
      <motion.div
        :id="`itens-pedido-${pedido.id}`"
        :initial="false"
        :animate="{
          height: destaque || aberto ? 'auto' : 0,
          opacity: destaque || aberto ? 1 : 0,
        }"
        :transition="{ duration: reduzir ? 0 : 0.24 }"
        :inert="!destaque && !aberto"
        class="order-card__items-wrap"
      >
        <ul class="order-card__items" aria-label="Produtos do pedido">
          <li v-for="item in pedido.itens || []" :key="item.id || item.produto">
            <span class="order-card__quantity">{{ item.quantidade }}×</span
            ><span
              >{{ item.produto_nome
              }}<small>{{ moedaPedido(item.preco_unitario) }} cada</small></span
            ><strong>{{ moedaPedido(item.subtotal) }}</strong>
          </li>
        </ul>
      </motion.div>
      <div class="order-card__total">
        <span>Total do pedido</span
        ><strong>{{ moedaPedido(pedido.total) }}</strong>
      </div>
      <OrderActions
        v-if="!destaque"
        :pedido="pedido"
        :nao-lidas="naoLidas"
        @ver-qrcode="emit('ver-qrcode', $event)"
        @abrir-chat="emit('abrir-chat', $event)"
      />
    </div>
  </article>
</template>

<style scoped>
.order-card {
  padding: 24px 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  column-gap: 48px;
  border-bottom: 1px solid var(--pp-creme-borda);
  color: var(--pp-marrom);
  font-variant-numeric: tabular-nums;
}
.order-card__tracking,
.order-card__receipt {
  min-width: 0;
}
.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}
.order-card__header h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}
.order-card__header time {
  font-size: 12px;
  color: var(--pp-texto-2);
}
.order-card__copy {
  color: var(--pp-texto-2);
  font-size: 13px;
  line-height: 1.6;
  margin: 14px 0 0;
  max-width: 44ch;
}
.order-card__message {
  margin-top: 32px;
  max-width: 47ch;
}
.order-card__message > svg {
  color: var(--pp-verde);
  margin-bottom: 10px;
}
.order-card__message h4 {
  font-family: var(--pp-font-titulo);
  font-size: clamp(32px, 3vw, 44px);
  font-weight: 400;
  line-height: 1.12;
  margin: 0 0 12px;
}
.order-card__message p {
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
}
.order-card__items-wrap {
  overflow: hidden;
}
.order-card__items {
  padding: 0;
  margin: 0;
  list-style: none;
}
.order-card__items li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--pp-creme-3);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.order-card__items small {
  display: block;
  color: var(--pp-texto-3);
  font-size: 11px;
  margin-top: 2px;
}
.order-card__quantity {
  color: var(--pp-texto-3);
}
.order-card__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0;
  font-size: 12px;
  color: var(--pp-texto-2);
}
.order-card__total strong {
  font-size: 22px;
  color: var(--pp-marrom);
}
.order-card__expand {
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--pp-texto-2);
  cursor: pointer;
  text-align: left;
}
.order-card__expand svg {
  transition: transform 220ms var(--pp-ease);
}
.order-card__expand .is-open {
  transform: rotate(180deg);
}
.order-card--featured {
  padding: 36px;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 16px;
  background: var(--pp-creme-2);
  column-gap: 60px;
  row-gap: 0;
  grid-template-areas: "heading receipt" "message receipt" "progress actions";
}
.order-card--featured .order-card__receipt {
  border-left: 1px solid var(--pp-creme-borda);
  padding-left: 36px;
}
.order-card--featured .order-card__total {
  margin: 26px 0 24px;
}
.order-card--featured .order-card__total strong {
  font-size: 30px;
}
.order-card--featured .order-card__actions {
  flex-direction: column;
}
.order-card :is(button):focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}

.order-card--featured .order-card__tracking {
  display: contents;
}
.order-card--featured .order-card__header {
  grid-area: heading;
}
.order-card--featured .order-card__message {
  grid-area: message;
}
.order-card--featured .order-progress {
  grid-area: progress;
}
.order-card--featured .order-card__receipt {
  grid-area: receipt;
}
.order-card--featured .order-card__actions {
  grid-area: actions;
  margin-left: 36px;
}

@media (hover: hover) {
  .order-card__actions button:hover {
    border-color: var(--pp-dourado-escuro);
  }
}
@media (max-width: 800px) {
  .order-card {
    gap: 24px;
  }
  .order-card--featured {
    padding: 26px;
    gap: 28px;
  }
  .order-card--featured .order-card__receipt {
    padding-left: 24px;
  }
}
@media (max-width: 620px) {
  .order-card {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 24px 0;
  }
  .order-card--featured {
    padding: 24px 20px;
    gap: 26px;
  }
  .order-card--featured .order-card__receipt {
    border-left: 0;
    border-top: 1px solid var(--pp-creme-borda);
    padding: 12px 0 0;
  }
  .order-card--featured {
    grid-template-areas: "heading" "message" "actions" "progress" "receipt";
    gap: 0;
  }
  .order-card--featured .order-card__actions {
    margin: 20px 0 0;
  }
  .order-card--featured .order-card__receipt {
    margin-top: 26px;
  }
  .order-card__header {
    flex-wrap: wrap;
    gap: 12px;
  }
  .order-card__message {
    margin-top: 24px;
  }
  .order-card__message h4 {
    font-size: 36px;
  }
  .order-card--featured .order-card__total {
    margin: 20px 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .order-card__expand svg {
    transition: none;
  }
}
</style>
