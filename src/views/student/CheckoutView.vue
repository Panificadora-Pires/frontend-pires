<template>
  <div class="checkout-page">
    <header class="checkout-page__header">
      <div>
        <span class="checkout-page__eyebrow">Finalização</span>
        <h1>Pagamento</h1>
        <p>Escolha como pagar seu pedido. Cartão e Pix são processados pelo Mercado Pago.</p>
      </div>
      <RouterLink v-if="!resultado" :to="{ name: 'carrinho' }" class="checkout-page__back">
        <ArrowLeft :size="17" />
        Voltar ao carrinho
      </RouterLink>
    </header>

    <section v-if="resultado" class="checkout-result">
      <template v-if="pagamentoAprovado">
        <span class="checkout-result__icon checkout-result__icon--success">
          <CircleCheckBig :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Pagamento aprovado</span>
        <h2>Pedido #{{ pedido.id }} confirmado</h2>
        <p>O pagamento foi aprovado e o pedido já entrou no fluxo de preparo.</p>
      </template>

      <template v-else-if="pagamentoPixPendente">
        <span class="checkout-result__icon checkout-result__icon--pix">
          <QrCode :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Aguardando Pix</span>
        <h2>Pague o pedido #{{ pedido.id }}</h2>
        <p>Escaneie o QR Code ou copie o código Pix. A confirmação é atualizada automaticamente.</p>

        <div v-if="pagamento.pix_qr_code_base64" class="checkout-result__qr">
          <img :src="qrPixSrc" alt="QR Code Pix do pedido" />
        </div>

        <div v-if="pagamento.pix_qr_code" class="checkout-result__pix-code">
          <code>{{ pagamento.pix_qr_code }}</code>
          <button type="button" @click="copiarPix">
            <Copy :size="16" />
            {{ pixCopiado ? 'Copiado' : 'Copiar Pix' }}
          </button>
        </div>

        <div class="checkout-result__waiting">
          <LoaderCircle :size="17" class="checkout-page__spinner" />
          {{ consultando ? 'Verificando pagamento...' : 'Aguardando confirmação do Mercado Pago...' }}
        </div>
      </template>

      <template v-else-if="pagamentoDinheiro">
        <span class="checkout-result__icon checkout-result__icon--cash">
          <Banknote :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Pagamento na retirada</span>
        <h2>Pedido #{{ pedido.id }} recebido</h2>
        <p>Leve o valor em dinheiro. O pagamento será confirmado quando você retirar o pedido.</p>
      </template>

      <template v-else-if="pagamentoFalhou">
        <span class="checkout-result__icon checkout-result__icon--error">
          <CircleX :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Pagamento não concluído</span>
        <h2>Não foi possível concluir o pagamento</h2>
        <p>{{ mensagemResultado }}</p>
      </template>

      <template v-else>
        <span class="checkout-result__icon checkout-result__icon--waiting">
          <Clock3 :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Processando</span>
        <h2>Pagamento em análise</h2>
        <p>A confirmação ainda está sendo processada. Esta tela atualiza o status automaticamente.</p>
        <div class="checkout-result__waiting">
          <LoaderCircle :size="17" class="checkout-page__spinner" />
          Verificando pagamento...
        </div>
      </template>

      <div v-if="pedido" class="checkout-result__summary">
        <span>Total do pedido</span>
        <strong>{{ formatarPreco(pedido.total) }}</strong>
      </div>

      <div class="checkout-result__actions">
        <RouterLink :to="{ name: 'pedidos' }" class="checkout-page__primary">
          Acompanhar pedido
          <ArrowRight :size="17" />
        </RouterLink>
        <RouterLink :to="{ name: 'cardapio' }" class="checkout-page__secondary">
          Voltar ao cardápio
        </RouterLink>
      </div>
    </section>

    <section v-else-if="cart.vazio" class="checkout-empty">
      <ShoppingCart :size="32" />
      <h2>Seu carrinho está vazio</h2>
      <p>Volte ao cardápio e escolha os produtos antes de abrir o checkout.</p>
      <RouterLink :to="{ name: 'cardapio' }" class="checkout-page__primary">
        Ver cardápio
      </RouterLink>
    </section>

    <div v-else class="checkout-page__layout">
      <main class="checkout-payment">
        <div class="checkout-payment__head">
          <span class="checkout-payment__step">1</span>
          <div>
            <h2>Como você quer pagar?</h2>
            <p>Escolha uma opção para continuar.</p>
          </div>
        </div>

        <div class="checkout-methods">
          <button
            type="button"
            :class="{ 'is-active': metodo === 'pix' }"
            @click="selecionarMetodo('pix')"
          >
            <QrCode :size="22" />
            <span><strong>Pix</strong><small>QR Code e copia e cola</small></span>
          </button>

          <button
            type="button"
            :class="{ 'is-active': metodo === 'card' }"
            @click="selecionarMetodo('card')"
          >
            <CreditCard :size="22" />
            <span><strong>Cartão</strong><small>Crédito ou débito</small></span>
          </button>

          <button
            type="button"
            :class="{ 'is-active': metodo === 'cash' }"
            @click="selecionarMetodo('cash')"
          >
            <Banknote :size="22" />
            <span><strong>Dinheiro</strong><small>Pagar na retirada</small></span>
          </button>
        </div>

        <div class="checkout-payment__body">
          <div v-if="metodo === 'cash'" class="checkout-cash">
            <Banknote :size="28" />
            <div>
              <h3>Pagar em dinheiro na retirada</h3>
              <p>O pedido será reservado agora e o pagamento será registrado quando você apresentar o QR Code e retirar.</p>
            </div>
            <button type="button" :disabled="processando" @click="finalizarDinheiro">
              <LoaderCircle v-if="processando" :size="18" class="checkout-page__spinner" />
              <Banknote v-else :size="18" />
              {{ processando ? 'Criando pedido...' : `Confirmar ${formatarPreco(cart.totalPreco)}` }}
            </button>
          </div>

          <MercadoPagoPaymentBrick
            v-else
            :key="metodo"
            :amount="cart.totalPreco"
            :email="auth.usuario?.email || ''"
            :mode="metodo"
            :submit-handler="processarMercadoPago"
          />
        </div>

        <div v-if="erro" class="checkout-payment__error" role="alert">
          <CircleAlert :size="17" />
          <span>{{ erro }}</span>
        </div>

        <div class="checkout-payment__security">
          <ShieldCheck :size="18" />
          <p>
            Os dados do cartão são coletados diretamente pelo ambiente seguro do Mercado Pago.
            A Pires Panificadora não recebe número do cartão nem CVV.
          </p>
        </div>
      </main>

      <aside class="checkout-summary">
        <span class="checkout-page__eyebrow">Resumo</span>
        <h2>Seu pedido</h2>

        <div class="checkout-summary__items">
          <div v-for="item in cart.itens" :key="item.produto.id">
            <span>{{ item.quantidade }}x {{ item.produto.nome }}</span>
            <strong>{{ formatarPreco(precoItem(item) * item.quantidade) }}</strong>
          </div>
        </div>

        <div class="checkout-summary__row">
          <span>Itens</span>
          <strong>{{ cart.totalItens }}</strong>
        </div>
        <div class="checkout-summary__row">
          <span>Taxas</span>
          <strong>R$ 0,00</strong>
        </div>
        <div class="checkout-summary__total">
          <span>Total</span>
          <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  Clock3,
  Copy,
  CreditCard,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-vue-next'

import MercadoPagoPaymentBrick from '@/components/payment/MercadoPagoPaymentBrick.vue'
import paymentService from '@/services/payment.service'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const auth = useAuthStore()
const cart = useCartStore()

const metodo = ref('pix')
const checkoutId = ref(novoCheckoutId())
const processando = ref(false)
const erro = ref('')
const resultado = ref(null)
const consultando = ref(false)
const pixCopiado = ref(false)
let polling = null

const pedido = computed(() => resultado.value?.pedido || null)
const pagamento = computed(() => resultado.value?.pagamento || null)
const pagamentoAprovado = computed(() => pagamento.value?.status_pagamento === 'aprovado')
const pagamentoPixPendente = computed(() =>
  pagamento.value?.forma_pagamento === 'pix' &&
  ['pendente', 'processando'].includes(pagamento.value?.status_pagamento),
)
const pagamentoDinheiro = computed(() => pagamento.value?.forma_pagamento === 'dinheiro')
const pagamentoFalhou = computed(() =>
  ['recusado', 'cancelado', 'reembolsado', 'erro'].includes(pagamento.value?.status_pagamento),
)
const mensagemResultado = computed(() => {
  if (pagamento.value?.status_pagamento === 'recusado') return 'O pagamento foi recusado. Você pode montar o pedido novamente e tentar outro meio de pagamento.'
  if (pagamento.value?.status_pagamento === 'cancelado') return 'O pagamento foi cancelado.'
  if (pagamento.value?.status_pagamento === 'reembolsado') return 'O pagamento foi reembolsado pelo Mercado Pago.'
  return 'O pagamento não pôde ser concluído.'
})
const qrPixSrc = computed(() => {
  const valor = pagamento.value?.pix_qr_code_base64 || ''
  if (!valor) return ''
  return valor.startsWith('data:image/') ? valor : `data:image/png;base64,${valor}`
})

function novoCheckoutId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caractere) => {
    const aleatorio = Math.floor(Math.random() * 16)
    const valor = caractere === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8
    return valor.toString(16)
  })
}

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function precoItem(item) {
  return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0)
}

function selecionarMetodo(valor) {
  if (processando.value) return
  metodo.value = valor
  erro.value = ''
}

function mensagemErro(error) {
  const data = error?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  return 'Não foi possível concluir o pagamento. Tente novamente.'
}

function tratarResposta(data) {
  resultado.value = data
  const status = data?.pagamento?.status_pagamento

  if (['aprovado', 'pendente', 'processando'].includes(status) || data?.pagamento?.forma_pagamento === 'dinheiro') {
    cart.limpar()
  }

  if (['pendente', 'processando'].includes(status) && data?.pedido?.id) {
    iniciarPolling(data.pedido.id)
  } else {
    pararPolling()
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function processarMercadoPago({ paymentType, formData }) {
  if (processando.value) return
  processando.value = true
  erro.value = ''

  try {
    const { data } = await paymentService.checkoutMercadoPago({
      checkoutId: checkoutId.value,
      cart,
      paymentType,
      formData,
    })

    tratarResposta(data)

    if (['recusado', 'cancelado', 'reembolsado', 'erro'].includes(data?.pagamento?.status_pagamento)) {
      checkoutId.value = novoCheckoutId()
      throw new Error('Pagamento não aprovado')
    }
  } catch (error) {
    erro.value = mensagemErro(error)
    if (error?.response?.data?.novo_checkout) {
      checkoutId.value = novoCheckoutId()
    }
    throw error
  } finally {
    processando.value = false
  }
}

async function finalizarDinheiro() {
  if (processando.value || cart.vazio) return
  processando.value = true
  erro.value = ''

  try {
    const { data } = await paymentService.checkoutDinheiro({
      checkoutId: checkoutId.value,
      cart,
    })
    tratarResposta(data)
  } catch (error) {
    erro.value = mensagemErro(error)
  } finally {
    processando.value = false
  }
}

async function consultarPagamento(pedidoId) {
  if (consultando.value) return
  consultando.value = true
  try {
    const { data } = await paymentService.consultar(pedidoId)
    resultado.value = data
    const status = data?.pagamento?.status_pagamento
    if (['aprovado', 'recusado', 'cancelado', 'reembolsado', 'erro'].includes(status)) {
      pararPolling()
    }
  } catch {
    // O polling tenta novamente. O webhook também continua ativo no backend.
  } finally {
    consultando.value = false
  }
}

function iniciarPolling(pedidoId) {
  pararPolling()
  polling = window.setInterval(() => consultarPagamento(pedidoId), 5000)
}

function pararPolling() {
  if (polling) window.clearInterval(polling)
  polling = null
}

async function copiarPix() {
  const codigo = pagamento.value?.pix_qr_code
  if (!codigo) return
  try {
    await navigator.clipboard.writeText(codigo)
    pixCopiado.value = true
    window.setTimeout(() => { pixCopiado.value = false }, 1800)
  } catch {
    erro.value = 'Não foi possível copiar automaticamente. Selecione o código Pix e copie manualmente.'
  }
}

onBeforeUnmount(pararPolling)
</script>

<style scoped>
.checkout-page {
  width: min(100%, 1180px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.checkout-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 28px;
}

.checkout-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7a10;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.checkout-page__header h1 {
  margin: 0;
  color: #201b17;
  font-size: clamp(31px, 4vw, 43px);
  letter-spacing: -.045em;
  line-height: 1;
}

.checkout-page__header p {
  margin: 9px 0 0;
  color: #81776e;
  font-size: 12.5px;
}

.checkout-page__back,
.checkout-page__primary,
.checkout-page__secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 11.5px;
  font-weight: 800;
}

.checkout-page__back,
.checkout-page__secondary {
  border: 1px solid rgba(47, 31, 20, .1);
  background: #fff;
  color: #5f554c;
}

.checkout-page__primary {
  border: 0;
  background: linear-gradient(135deg, #dda238, #f0b63f);
  color: #2b190d;
}

.checkout-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 24px;
  align-items: start;
}

.checkout-payment,
.checkout-summary,
.checkout-result,
.checkout-empty {
  border: 1px solid rgba(43, 31, 22, .08);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(54, 38, 26, .055);
}

.checkout-payment { padding: 24px; }
.checkout-summary { padding: 22px; position: sticky; top: 24px; }

.checkout-payment__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.checkout-payment__step {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #2c180d;
  color: #fff;
  font-weight: 850;
}

.checkout-payment__head h2,
.checkout-summary h2 { margin: 0; font-size: 20px; color: #261e18; }
.checkout-payment__head p { margin: 4px 0 0; color: #877c72; font-size: 11.5px; }

.checkout-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.checkout-methods button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  padding: 13px;
  border: 1px solid #e5ddd4;
  border-radius: 15px;
  background: #fbf9f6;
  color: #71675e;
  text-align: left;
  cursor: pointer;
}

.checkout-methods button.is-active {
  border-color: #dca43c;
  background: #fff8e9;
  color: #6b4816;
  box-shadow: 0 0 0 2px rgba(224, 168, 62, .08);
}

.checkout-methods strong,
.checkout-methods small { display: block; }
.checkout-methods strong { margin-bottom: 3px; font-size: 12px; }
.checkout-methods small { color: #948980; font-size: 9.5px; }
.checkout-payment__body { min-height: 160px; }

.checkout-cash {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  background: #f7f4ef;
}

.checkout-cash h3 { margin: 0 0 5px; font-size: 15px; }
.checkout-cash p { margin: 0; color: #7e736a; font-size: 11.5px; line-height: 1.55; }
.checkout-cash button {
  grid-column: 1 / -1;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: #2c180d;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.checkout-payment__error {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 13px;
  border-radius: 11px;
  background: #fff0ee;
  color: #9d473c;
  font-size: 11.5px;
}

.checkout-payment__security {
  display: flex;
  gap: 9px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eee8e1;
  color: #7c736b;
}
.checkout-payment__security svg { flex: 0 0 auto; color: #5e8d61; }
.checkout-payment__security p { margin: 0; font-size: 10.5px; line-height: 1.55; }

.checkout-summary__items {
  display: grid;
  gap: 11px;
  margin: 18px 0;
  padding-bottom: 17px;
  border-bottom: 1px solid #eee8e1;
}
.checkout-summary__items div,
.checkout-summary__row,
.checkout-summary__total {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}
.checkout-summary__items span,
.checkout-summary__row span { color: #796f67; font-size: 11px; }
.checkout-summary__items strong,
.checkout-summary__row strong { color: #3a3029; font-size: 11px; }
.checkout-summary__row { margin-top: 11px; }
.checkout-summary__total {
  align-items: end;
  margin-top: 18px;
  padding-top: 17px;
  border-top: 1px solid #e9e1d9;
}
.checkout-summary__total span { font-size: 12px; font-weight: 800; }
.checkout-summary__total strong { font-size: 23px; color: #bd7a10; }

.checkout-result,
.checkout-empty {
  width: min(100%, 620px);
  margin: 46px auto 0;
  padding: 34px;
  text-align: center;
}
.checkout-result__icon {
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  margin: 0 auto 17px;
  border-radius: 20px;
}
.checkout-result__icon--success { background: #eaf6e9; color: #568458; }
.checkout-result__icon--pix { background: #e9f5f3; color: #277f77; }
.checkout-result__icon--cash { background: #fff4dc; color: #b47716; }
.checkout-result__icon--error { background: #fff0ee; color: #a7473c; }
.checkout-result__icon--waiting { background: #f3f0ed; color: #766a61; }
.checkout-result h2,
.checkout-empty h2 { margin: 0; color: #281f19; font-size: 25px; }
.checkout-result > p,
.checkout-empty p { margin: 9px auto 0; max-width: 470px; color: #81766d; font-size: 12px; line-height: 1.6; }
.checkout-result__qr {
  width: 260px;
  height: 260px;
  margin: 23px auto 14px;
  padding: 12px;
  border: 1px solid #eee5dc;
  border-radius: 18px;
  background: #fff;
}
.checkout-result__qr img { width: 100%; height: 100%; object-fit: contain; }
.checkout-result__pix-code {
  display: grid;
  gap: 9px;
  margin-top: 14px;
  padding: 13px;
  border-radius: 13px;
  background: #f7f5f2;
}
.checkout-result__pix-code code {
  max-height: 70px;
  overflow: auto;
  word-break: break-all;
  font-size: 9px;
  color: #635950;
}
.checkout-result__pix-code button {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 10px;
  background: #2b1a10;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
.checkout-result__waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  color: #746a62;
  font-size: 11px;
}
.checkout-result__summary {
  display: flex;
  justify-content: space-between;
  margin-top: 22px;
  padding: 15px 17px;
  border-radius: 13px;
  background: #f8f5f1;
}
.checkout-result__actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}
.checkout-page__spinner { animation: checkout-spin 700ms linear infinite; }
@keyframes checkout-spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .checkout-page__layout { grid-template-columns: 1fr; }
  .checkout-summary { position: static; order: -1; }
}

@media (max-width: 620px) {
  .checkout-page__header { align-items: flex-start; flex-direction: column; }
  .checkout-methods { grid-template-columns: 1fr; }
  .checkout-methods button { min-height: 60px; }
  .checkout-payment { padding: 17px; }
  .checkout-result, .checkout-empty { padding: 24px 17px; }
  .checkout-result__qr { width: min(100%, 240px); height: auto; aspect-ratio: 1; }
  .checkout-result__actions { flex-direction: column; }
}
</style>
