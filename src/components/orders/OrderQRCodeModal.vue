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
.qr-modal{position:fixed;inset:0;z-index:130;display:grid;place-items:center;padding:20px;background:rgba(26,21,17,.58)}.qr-modal__card{position:relative;width:min(430px,100%);max-height:90vh;overflow:auto;padding:24px;border-radius:12px;background:#fff;color:var(--student-text);box-shadow:0 24px 70px rgba(20,16,12,.25)}.qr-modal__close{position:absolute;right:12px;top:12px;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--student-border);border-radius:50%;background:#fff;color:#5d554e;cursor:pointer}.qr-modal__header{text-align:center;padding:8px 30px 18px}.qr-modal__icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 10px;border-radius:50%;background:#eef5e9;color:#567343}.qr-modal__eyebrow{display:none}.qr-modal__header h2{margin:0;font-size:19px}.qr-modal__header p{margin:6px 0 0;color:var(--student-muted);font-size:10px;line-height:1.5}.qr-modal__loading,.qr-modal__error{min-height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--student-muted);font-size:10px}.qr-modal__spinner{animation:qr-spin .7s linear infinite}.qr-modal__error strong{color:var(--student-text);font-size:12px}.qr-modal__error p{margin:6px 0 12px}.qr-modal__error button{min-height:35px;padding:0 12px;border:1px solid var(--student-border-strong);border-radius:7px;background:#fff;font-size:10px;font-weight:700}.qr-modal__content{display:grid;gap:12px}.qr-modal__qr{width:240px;max-width:100%;margin:0 auto;padding:10px;border:1px solid var(--student-border);border-radius:8px;background:#fff}.qr-modal__qr img{width:100%;display:block}.qr-modal__code{padding:11px;border:1px solid var(--student-border);border-radius:8px;background:#faf8f5;text-align:center}.qr-modal__code span{display:block;color:var(--student-muted);font-size:8px;text-transform:uppercase;letter-spacing:.05em}.qr-modal__code strong{display:block;margin-top:5px;overflow-wrap:anywhere;font-size:10px}.qr-modal__notice{display:flex;align-items:flex-start;gap:7px;padding:10px;border-radius:7px;background:#f3f6f0;color:#536748}.qr-modal__notice p{margin:0;font-size:9px;line-height:1.5}@keyframes qr-spin{to{transform:rotate(360deg)}}@media(max-width:520px){.qr-modal{padding:10px;align-items:end}.qr-modal__card{padding:20px 16px 18px;border-radius:12px 12px 0 0}}
</style>
