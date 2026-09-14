<template>
  <article
    class="order-card"
    :class="`order-card--${pedido.status || 'neutro'}`"
  >
    <header class="order-card__header">
      <div class="order-card__identity">
        <span class="order-card__icon">
          <Package :size="20" aria-hidden="true" />
        </span>
        <div>
          <strong>Pedido #{{ pedido.id }}</strong>
          <span>
            <CalendarDays :size="13" aria-hidden="true" />
            {{ formatarData(pedido.data) }}
          </span>
        </div>
      </div>

      <OrderStatusBadge
        :status="pedido.status"
        :label="pedido.status_display"
      />
    </header>

    <div class="order-card__body">
      <OrderItemsPreview :itens="pedido.itens || []" />
    </div>

    <footer class="order-card__footer">
      <div class="order-card__status-copy">
        <component :is="statusInfo.icon" :size="16" aria-hidden="true" />
        <span>{{ statusInfo.texto }}</span>
      </div>

      <div class="order-card__footer-actions">
        <button
          v-if="pedido.status === 'pronto'"
          type="button"
          class="order-card__qr-button"
          @click="abrirQRCode"
        >
          <QrCode :size="16" aria-hidden="true" />
          <span>Ver QR Code</span>
        </button>

        <div class="order-card__total">
          <span>Total</span>
          <strong>{{ formatarMoeda(pedido.total) }}</strong>
        </div>
      </div>
    </footer>
  </article>
</template>

<script setup>
import { computed } from "vue";
import {
  BadgeCheck,
  CalendarDays,
  CircleCheckBig,
  CircleX,
  Clock3,
  Package,
  PackageCheck,
  QrCode,
} from "lucide-vue-next";

import OrderItemsPreview from "@/components/orders/OrderItemsPreview.vue";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge.vue";

const props = defineProps({
  pedido: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["ver-qrcode"]);

function abrirQRCode() {
  emit("ver-qrcode", props.pedido);
}

const statusInfo = computed(() => {
  const mapa = {
    pendente: {
      icon: Clock3,
      texto: "Seu pedido foi recebido e aguarda confirmação.",
    },
    confirmado: {
      icon: BadgeCheck,
      texto: "A panificadora confirmou seu pedido.",
    },
    pronto: {
      icon: PackageCheck,
      texto: "Seu pedido está pronto para retirada no balcão.",
    },
    retirado: {
      icon: CircleCheckBig,
      texto: "Pedido retirado com sucesso.",
    },
    cancelado: {
      icon: CircleX,
      texto: "Este pedido foi cancelado.",
    },
  };

  return (
    mapa[props.pedido.status] || {
      icon: Clock3,
      texto: "Acompanhe aqui as atualizações do seu pedido.",
    }
  );
});

function formatarData(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numero) ? numero : 0);
}
</script>

<style scoped>
.order-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.15s ease;
}
.order-card:hover {
  border-color: #d6cbbf;
}
.order-card--pronto {
  border-left: 3px solid #719055;
}
.order-card__header {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 15px;
  border-bottom: 1px solid var(--student-border);
}
.order-card__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.order-card__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 7px;
  background: #f2eee8;
  color: #76572b;
}
.order-card--pronto .order-card__icon {
  background: #eef5e9;
  color: #5d7a47;
}
.order-card__identity > div {
  min-width: 0;
}
.order-card__identity strong {
  display: block;
  font-size: 12px;
}
.order-card__identity span:not(.order-card__icon) {
  display: block;
  margin-top: 2px;
  color: var(--student-muted);
  font-size: 9px;
}
.order-card__body {
  padding: 5px 15px;
}
.order-card__footer {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 15px;
  border-top: 1px solid var(--student-border);
  background: #fcfbf9;
}
.order-card__status-copy {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--student-muted);
  font-size: 9px;
  line-height: 1.45;
}
.order-card__status-copy svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #8a8178;
}
.order-card--pronto .order-card__status-copy {
  color: #547045;
}
.order-card__footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.order-card__qr-button {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid #78945f;
  border-radius: 7px;
  background: #f5faf2;
  color: #4f6d3d;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}
.order-card__qr-button:hover {
  background: #eef7e9;
}
.order-card__total {
  text-align: right;
}
.order-card__total span {
  display: block;
  color: var(--student-muted);
  font-size: 8px;
}
.order-card__total strong {
  font-size: 14px;
}
@media (max-width: 620px) {
  .order-card__header {
    align-items: flex-start;
  }
  .order-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
  .order-card__footer-actions {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }
  .order-card__qr-button {
    flex: 1;
    justify-content: center;
  }
  .order-card__total {
    text-align: right;
    margin-left: auto;
  }
}
</style>
