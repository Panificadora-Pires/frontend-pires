<template>
  <Teleport to="body">
    <div
      class="qr-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      @click.self="fechar"
    >
      <section class="qr-modal__card">
        <button
          type="button"
          class="qr-modal__close"
          aria-label="Fechar QR Code"
          @click="fechar"
        >
          <X :size="19" aria-hidden="true" />
        </button>

        <header class="qr-modal__header">
          <span class="qr-modal__icon">
            <QrCode :size="23" aria-hidden="true" />
          </span>

          <div>
            <span class="qr-modal__eyebrow">Retirada no balcão</span>
            <h2 id="qr-modal-title">Pedido #{{ pedido.id }}</h2>
            <p>Apresente este QR Code quando for retirar seu pedido.</p>
          </div>
        </header>

        <div v-if="carregando" class="qr-modal__loading" aria-live="polite">
          <LoaderCircle :size="30" class="qr-modal__spinner" aria-hidden="true" />
          <span>Carregando QR Code...</span>
        </div>

        <div v-else-if="erro" class="qr-modal__error" role="alert">
          <CircleAlert :size="28" aria-hidden="true" />
          <strong>Não foi possível carregar o QR Code</strong>
          <p>{{ erro }}</p>
          <button type="button" @click="carregarQRCode">Tentar novamente</button>
        </div>

        <div v-else-if="dados" class="qr-modal__content">
          <div class="qr-modal__qr">
            <img
              :src="dados.qrcode_base64"
              :alt="`QR Code de retirada do pedido #${pedido.id}`"
            />
          </div>

          <div class="qr-modal__code">
            <span>Código de retirada</span>
            <strong>{{ dados.codigo_retirada }}</strong>
          </div>

          <div class="qr-modal__notice">
            <PackageCheck :size="18" aria-hidden="true" />
            <p>
              Seu pedido está pronto. O QR Code identifica este pedido no fluxo de retirada.
            </p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CircleAlert,
  LoaderCircle,
  PackageCheck,
  QrCode,
  X,
} from 'lucide-vue-next'

import orderService from '@/services/order.service'

const props = defineProps({
  pedido: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const carregando = ref(false)
const erro = ref('')
const dados = ref(null)
let overflowAnterior = ''

function extrairMensagemErro(error) {
  const detalhe = error?.response?.data?.detail
  if (typeof detalhe === 'string' && detalhe.trim()) return detalhe

  if (error?.response?.status === 404) {
    return 'O pedido não foi encontrado ou não pertence a esta conta.'
  }

  return 'Verifique sua conexão e tente novamente.'
}

async function carregarQRCode() {
  carregando.value = true
  erro.value = ''

  try {
    const { data } = await orderService.obterQRCode(props.pedido.id)

    if (
      !data?.codigo_retirada ||
      typeof data?.qrcode_base64 !== 'string' ||
      !data.qrcode_base64.startsWith('data:image/png;base64,')
    ) {
      throw new Error('Resposta de QR Code inválida.')
    }

    dados.value = data
  } catch (error) {
    console.error(`Erro ao carregar QR Code do pedido #${props.pedido.id}:`, error)
    dados.value = null
    erro.value = extrairMensagemErro(error)
  } finally {
    carregando.value = false
  }
}

function fechar() {
  emit('close')
}

function tratarTecla(event) {
  if (event.key === 'Escape') fechar()
}

onMounted(() => {
  overflowAnterior = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', tratarTecla)
  carregarQRCode()
})

onBeforeUnmount(() => {
  document.body.style.overflow = overflowAnterior
  window.removeEventListener('keydown', tratarTecla)
})
</script>

<style scoped>
.qr-modal {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(31, 18, 10, 0.58);
  backdrop-filter: blur(5px);
}

.qr-modal__card {
  position: relative;
  width: min(100%, 440px);
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 26px;
  border: 1px solid rgba(44, 28, 17, 0.08);
  border-radius: 23px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(31, 18, 10, 0.24);
}

.qr-modal__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: #f5f1ed;
  color: #6f665e;
  cursor: pointer;
}

.qr-modal__close:hover {
  background: #eee7e0;
}

.qr-modal__close:focus-visible,
.qr-modal__error button:focus-visible {
  outline: 3px solid rgba(193, 135, 39, 0.2);
  outline-offset: 2px;
}

.qr-modal__header {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding-right: 38px;
}

.qr-modal__icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #edf7ec;
  color: #5f8b5c;
}

.qr-modal__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #bd7c14;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.qr-modal__header h2 {
  margin: 0;
  color: #241e19;
  font-size: 24px;
  line-height: 1.08;
  letter-spacing: -0.025em;
}

.qr-modal__header p {
  margin: 7px 0 0;
  color: #746b63;
  font-size: 12px;
  line-height: 1.5;
}

.qr-modal__loading,
.qr-modal__error {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 11px;
  margin-top: 20px;
  text-align: center;
}

.qr-modal__loading {
  color: #7f756c;
  font-size: 12px;
  font-weight: 650;
}

.qr-modal__spinner {
  color: #b9822b;
  animation: qr-modal-spin 800ms linear infinite;
}

.qr-modal__error {
  color: #b24f4a;
}

.qr-modal__error strong {
  color: #4b312c;
  font-size: 15px;
}

.qr-modal__error p {
  width: min(100%, 310px);
  margin: -3px 0 3px;
  color: #7f6d68;
  font-size: 12px;
  line-height: 1.5;
}

.qr-modal__error button {
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 11px;
  background: #2d2018;
  color: #fff9f1;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.qr-modal__content {
  margin-top: 22px;
}

.qr-modal__qr {
  width: min(100%, 260px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  margin: 0 auto;
  padding: 13px;
  border: 1px solid rgba(44, 28, 17, 0.09);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(49, 31, 18, 0.06);
}

.qr-modal__qr img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-modal__code {
  margin-top: 17px;
  padding: 13px 14px;
  border-radius: 14px;
  background: #f8f5f1;
  text-align: center;
}

.qr-modal__code span {
  display: block;
  margin-bottom: 5px;
  color: #938981;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.qr-modal__code strong {
  display: block;
  color: #30281f;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.qr-modal__notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 12px 13px;
  border: 1px solid rgba(111, 163, 111, 0.2);
  border-radius: 13px;
  background: #f1f7ef;
  color: #5d7b5b;
}

.qr-modal__notice svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.qr-modal__notice p {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}

@keyframes qr-modal-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .qr-modal {
    align-items: end;
    padding: 12px;
  }

  .qr-modal__card {
    width: 100%;
    max-height: calc(100dvh - 24px);
    padding: 22px 18px;
    border-radius: 22px;
  }

  .qr-modal__header {
    padding-right: 34px;
  }

  .qr-modal__header h2 {
    font-size: 21px;
  }

  .qr-modal__qr {
    width: min(100%, 235px);
  }
}
</style>
