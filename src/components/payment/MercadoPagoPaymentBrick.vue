<template>
  <div class="mp-brick">
    <div v-if="erroConfiguracao" class="mp-brick__error" role="alert">
      <CircleAlert :size="18" />
      <span>{{ erroConfiguracao }}</span>
    </div>

    <div v-else-if="mode === 'pix'" class="mp-brick__pix">
      <QrCode :size="28" />
      <div>
        <strong>Gerar pagamento Pix</strong>
        <p>O QR Code será criado pelo Mercado Pago e exibido nesta página.</p>
      </div>
      <button type="button" :disabled="enviandoPix" @click="gerarPix">
        <LoaderCircle v-if="enviandoPix" :size="17" class="mp-brick__spinner" />
        <QrCode v-else :size="17" />
        {{ enviandoPix ? 'Gerando Pix...' : 'Gerar QR Code Pix' }}
      </button>
    </div>

    <div v-else>
      <div v-if="carregando" class="mp-brick__loading" role="status">
        <LoaderCircle :size="18" class="mp-brick__spinner" />
        Preparando ambiente seguro de pagamento...
      </div>
      <div :id="containerId" class="mp-brick__container" />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CircleAlert, LoaderCircle, QrCode } from 'lucide-vue-next'

const props = defineProps({
  amount: { type: Number, required: true },
  email: { type: String, default: '' },
  mode: {
    type: String,
    required: true,
    validator: (value) => ['pix', 'card'].includes(value),
  },
  submitHandler: { type: Function, required: true },
})

const PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || ''
const SDK_SRC = 'https://sdk.mercadopago.com/js/v2'
const containerId = `cardPaymentBrick_${Math.random().toString(36).slice(2)}`
const carregando = ref(props.mode === 'card')
const enviandoPix = ref(false)
const erroConfiguracao = ref('')
let controller = null

function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve()

  const existente = document.querySelector(`script[src="${SDK_SRC}"]`)
  if (existente) {
    return new Promise((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (window.MercadoPago) {
          window.clearInterval(timer)
          resolve()
        }
      }, 50)
      window.setTimeout(() => {
        window.clearInterval(timer)
        reject(new Error('Tempo esgotado ao carregar o Mercado Pago.'))
      }, 12000)
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Não foi possível carregar o Mercado Pago.'))
    document.head.appendChild(script)
  })
}

async function gerarPix() {
  if (enviandoPix.value) return
  enviandoPix.value = true
  erroConfiguracao.value = ''

  try {
    await props.submitHandler({
      paymentType: 'bank_transfer',
      formData: {
        transaction_amount: Number(props.amount.toFixed(2)),
        payment_method_id: 'pix',
        payer: props.email ? { email: props.email } : {},
      },
    })
  } catch (error) {
    erroConfiguracao.value =
      error?.response?.data?.detail ||
      error?.message ||
      'Não foi possível gerar o Pix.'
    throw error
  } finally {
    enviandoPix.value = false
  }
}

async function montarCardBrick() {
  if (props.mode !== 'card') return

  if (!PUBLIC_KEY) {
    erroConfiguracao.value = 'A chave pública do Mercado Pago não foi configurada no frontend.'
    carregando.value = false
    return
  }

  try {
    await carregarSdk()
    const mp = new window.MercadoPago(PUBLIC_KEY, { locale: 'pt-BR' })
    const bricks = mp.bricks()

    controller = await bricks.create('cardPayment', containerId, {
      initialization: {
        amount: Number(props.amount.toFixed(2)),
      },
      callbacks: {
        onReady: () => {
          carregando.value = false
        },
        onSubmit: (formData, additionalData) => {
          return props.submitHandler({
            paymentType: additionalData?.paymentTypeId || 'credit_card',
            formData,
          })
        },
        onError: (error) => {
          console.error('Mercado Pago Card Payment Brick:', error)
          erroConfiguracao.value = 'O formulário de cartão encontrou um erro. Recarregue e tente novamente.'
          carregando.value = false
        },
      },
    })
  } catch (error) {
    console.error(error)
    erroConfiguracao.value = error?.message || 'Não foi possível iniciar o Mercado Pago.'
    carregando.value = false
  }
}

onMounted(montarCardBrick)

onBeforeUnmount(async () => {
  if (controller?.unmount) {
    try {
      await controller.unmount()
    } catch {
      // O Brick já pode ter sido desmontado pelo navegador.
    }
  }
})
</script>

<style scoped>
.mp-brick{min-width:0}.mp-brick__loading,.mp-brick__error{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:22px;border:1px solid var(--student-border);border-radius:8px;background:#faf8f5;color:var(--student-muted);text-align:center;font-size:10px}.mp-brick__error{background:var(--student-danger-soft);color:var(--student-danger)}.mp-brick__spinner{animation:mp-spin .7s linear infinite}.mp-brick__container{min-width:0;padding:2px 0}.mp-brick__pix{display:grid;grid-template-columns:36px minmax(0,1fr);gap:8px 12px;align-items:start;padding:16px;border:1px solid var(--student-border);border-radius:8px;background:#faf8f5;color:var(--student-text)}.mp-brick__pix strong{font-size:13px}.mp-brick__pix p{margin:5px 0 0;color:var(--student-muted);font-size:10px;line-height:1.5}.mp-brick__pix button{grid-column:1/-1;min-height:40px;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:7px;background:#2a211b;color:#fff;font-size:10px;font-weight:700;cursor:pointer}.mp-brick__pix button:disabled{opacity:.65;cursor:not-allowed}@keyframes mp-spin{to{transform:rotate(360deg)}}
</style>
