<template>
  <article class="order-card" :class="`order-card--${pedido.status || 'neutro'}`">
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
import { computed } from 'vue'
import {
  BadgeCheck,
  CalendarDays,
  CircleCheckBig,
  CircleX,
  Clock3,
  Package,
  PackageCheck,
  QrCode,
} from 'lucide-vue-next'

import OrderItemsPreview from '@/components/orders/OrderItemsPreview.vue'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge.vue'

const props = defineProps({
  pedido: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['ver-qrcode'])

function abrirQRCode() {
  emit('ver-qrcode', props.pedido)
}

const statusInfo = computed(() => {
  const mapa = {
    pendente: {
      icon: Clock3,
      texto: 'Seu pedido foi recebido e aguarda confirmação.',
    },
    confirmado: {
      icon: BadgeCheck,
      texto: 'A panificadora confirmou seu pedido.',
    },
    pronto: {
      icon: PackageCheck,
      texto: 'Seu pedido está pronto para retirada no balcão.',
    },
    retirado: {
      icon: CircleCheckBig,
      texto: 'Pedido retirado com sucesso.',
    },
    cancelado: {
      icon: CircleX,
      texto: 'Este pedido foi cancelado.',
    },
  }

  return mapa[props.pedido.status] || {
    icon: Clock3,
    texto: 'Acompanhe aqui as atualizações do seu pedido.',
  }
})

function formatarData(valor) {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data)
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numero) ? numero : 0)
}
</script>

<style scoped>
.order-card {
  overflow: hidden;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 8px 26px rgba(49, 31, 18, 0.035);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.order-card:hover {
  transform: translateY(-1px);
  border-color: rgba(185, 124, 20, 0.14);
  box-shadow: 0 12px 32px rgba(49, 31, 18, 0.055);
}

.order-card--pronto {
  border-color: rgba(111, 163, 111, 0.22);
  background:
    linear-gradient(90deg, rgba(111, 163, 111, 0.055), transparent 34%),
    #fff;
}

.order-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 18px 15px;
  border-bottom: 1px solid rgba(44, 28, 17, 0.055);
}

.order-card__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.order-card__icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: #f6f0e9;
  color: #c18727;
}

.order-card--pronto .order-card__icon {
  background: #edf7ec;
  color: #5f8b5c;
}

.order-card__identity > div {
  min-width: 0;
}

.order-card__identity strong {
  display: block;
  color: #2c261f;
  font-size: 14px;
}

.order-card__identity span:not(.order-card__icon) {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  color: #999087;
  font-size: 10px;
}

.order-card__body {
  padding: 16px 18px;
}

.order-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 18px 15px;
  border-top: 1px solid rgba(44, 28, 17, 0.055);
  background: #fcfaf8;
}

.order-card__status-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #857b72;
  font-size: 10.5px;
  line-height: 1.4;
}

.order-card__status-copy svg {
  flex: 0 0 auto;
  color: #b4853c;
}

.order-card--pronto .order-card__status-copy {
  color: #5f795d;
  font-weight: 650;
}

.order-card--pronto .order-card__status-copy svg {
  color: #5f8b5c;
}

.order-card__footer-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.order-card__qr-button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid rgba(111, 163, 111, 0.25);
  border-radius: 11px;
  background: #edf7ec;
  color: #527e50;
  font: inherit;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}

.order-card__qr-button:hover {
  border-color: rgba(111, 163, 111, 0.42);
  background: #e5f2e3;
  transform: translateY(-1px);
}

.order-card__qr-button:focus-visible {
  outline: 3px solid rgba(111, 163, 111, 0.2);
  outline-offset: 2px;
}

.order-card__qr-button:active {
  transform: translateY(0);
}

.order-card__total {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.order-card__total span {
  color: #9b9289;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.order-card__total strong {
  color: #30281f;
  font-size: 15px;
}

@media (max-width: 620px) {
  .order-card__header {
    align-items: flex-start;
    padding: 15px;
  }

  .order-card__icon {
    width: 38px;
    height: 38px;
  }

  .order-card__body {
    padding: 15px;
  }

  .order-card__footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 11px;
    padding: 13px 15px 15px;
  }

  .order-card__footer-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .order-card__qr-button {
    width: 100%;
    min-height: 42px;
  }

  .order-card__total {
    width: 100%;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px dashed rgba(44, 28, 17, 0.08);
  }
}
</style>
