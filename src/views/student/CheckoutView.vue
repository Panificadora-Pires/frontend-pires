<template>
  <div class="checkout-page">
    <header class="checkout-page__header">
      <div>
        <span class="checkout-page__eyebrow">Finalização</span>
        <h1>Pagamento</h1>
        <p>Escolha a forma de pagamento para concluir o pedido.</p>
      </div>
      <RouterLink
        v-if="!resultado"
        :to="{ name: 'carrinho' }"
        class="checkout-page__back"
      >
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
        <p>
          O pagamento foi aprovado e o pedido já entrou no fluxo de preparo.
        </p>
      </template>

      <template v-else-if="pagamentoPixPendente">
        <span class="checkout-result__icon checkout-result__icon--pix">
          <QrCode :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Aguardando Pix</span>
        <h2>Pague o pedido #{{ pedido.id }}</h2>
        <p>
          Escaneie o QR Code ou copie o código Pix. A confirmação é atualizada
          automaticamente.
        </p>

        <div v-if="pagamento.pix_qr_code_base64" class="checkout-result__qr">
          <img :src="qrPixSrc" alt="QR Code Pix do pedido" />
        </div>

        <div v-if="pagamento.pix_qr_code" class="checkout-result__pix-code">
          <code>{{ pagamento.pix_qr_code }}</code>
          <button type="button" @click="copiarPix">
            <Copy :size="16" />
            {{ pixCopiado ? "Copiado" : "Copiar Pix" }}
          </button>
        </div>

        <div class="checkout-result__waiting">
          <LoaderCircle :size="17" class="checkout-page__spinner" />
          {{
            consultando
              ? "Verificando pagamento..."
              : "Aguardando confirmação do Mercado Pago..."
          }}
        </div>
      </template>

      <template v-else-if="pagamentoDinheiro">
        <span class="checkout-result__icon checkout-result__icon--cash">
          <Banknote :size="34" />
        </span>
        <span class="checkout-page__eyebrow">Pagamento na retirada</span>
        <h2>Pedido #{{ pedido.id }} recebido</h2>
        <p>
          Leve o valor em dinheiro. O pagamento será confirmado quando você
          retirar o pedido.
        </p>
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
        <p>
          A confirmação ainda está sendo processada. Esta tela atualiza o status
          automaticamente.
        </p>
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
            <h2>Forma de pagamento</h2>
            <p>Selecione uma opção para continuar.</p>
          </div>
        </div>

        <div class="checkout-methods">
          <button
            type="button"
            :class="{ 'is-active': metodo === 'pix' }"
            @click="selecionarMetodo('pix')"
          >
            <QrCode :size="22" />
            <span
              ><strong>Pix</strong><small>QR Code e copia e cola</small></span
            >
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
            <span
              ><strong>Dinheiro</strong><small>Pagar na retirada</small></span
            >
          </button>
        </div>

        <div class="checkout-payment__body">
          <div v-if="metodo === 'cash'" class="checkout-cash">
            <Banknote :size="28" />
            <div>
              <h3>Pagar em dinheiro na retirada</h3>
              <p>
                O pedido será reservado agora e o pagamento será registrado
                quando você apresentar o QR Code e retirar.
              </p>
            </div>
            <button
              type="button"
              :disabled="processando"
              @click="finalizarDinheiro"
            >
              <LoaderCircle
                v-if="processando"
                :size="18"
                class="checkout-page__spinner"
              />
              <Banknote v-else :size="18" />
              {{
                processando
                  ? "Criando pedido..."
                  : `Confirmar ${formatarPreco(cart.totalPreco)}`
              }}
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
            Os dados do cartão são coletados diretamente pelo ambiente seguro do
            Mercado Pago. A Pires Panificadora não recebe número do cartão nem
            CVV.
          </p>
        </div>
      </main>

      <aside class="checkout-summary">
        <span class="checkout-page__eyebrow">Resumo</span>
        <h2>Seu pedido</h2>

        <div class="checkout-summary__items">
          <div v-for="item in cart.itens" :key="item.produto.id">
            <span>{{ item.quantidade }}x {{ item.produto.nome }}</span>
            <strong>{{
              formatarPreco(precoItem(item) * item.quantidade)
            }}</strong>
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
import { computed, onBeforeUnmount, ref } from "vue";
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
} from "lucide-vue-next";

import MercadoPagoPaymentBrick from "@/components/payment/MercadoPagoPaymentBrick.vue";
import paymentService from "@/services/payment.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";

const auth = useAuthStore();
const cart = useCartStore();

const metodo = ref("pix");
const checkoutId = ref(novoCheckoutId());
const processando = ref(false);
const erro = ref("");
const resultado = ref(null);
const consultando = ref(false);
const pixCopiado = ref(false);
let polling = null;

const pedido = computed(() => resultado.value?.pedido || null);
const pagamento = computed(() => resultado.value?.pagamento || null);
const pagamentoAprovado = computed(
  () => pagamento.value?.status_pagamento === "aprovado",
);
const pagamentoPixPendente = computed(
  () =>
    pagamento.value?.forma_pagamento === "pix" &&
    ["pendente", "processando"].includes(pagamento.value?.status_pagamento),
);
const pagamentoDinheiro = computed(
  () => pagamento.value?.forma_pagamento === "dinheiro",
);
const pagamentoFalhou = computed(() =>
  ["recusado", "cancelado", "reembolsado", "erro"].includes(
    pagamento.value?.status_pagamento,
  ),
);
const mensagemResultado = computed(() => {
  if (pagamento.value?.status_pagamento === "recusado")
    return "O pagamento foi recusado. Você pode montar o pedido novamente e tentar outro meio de pagamento.";
  if (pagamento.value?.status_pagamento === "cancelado")
    return "O pagamento foi cancelado.";
  if (pagamento.value?.status_pagamento === "reembolsado")
    return "O pagamento foi reembolsado pelo Mercado Pago.";
  return "O pagamento não pôde ser concluído.";
});
const qrPixSrc = computed(() => {
  const valor = pagamento.value?.pix_qr_code_base64 || "";
  if (!valor) return "";
  return valor.startsWith("data:image/")
    ? valor
    : `data:image/png;base64,${valor}`;
});

function novoCheckoutId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (caractere) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caractere === "x" ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    },
  );
}

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function precoItem(item) {
  return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0);
}

function selecionarMetodo(valor) {
  if (processando.value) return;
  metodo.value = valor;
  erro.value = "";
}

function mensagemErro(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  return "Não foi possível concluir o pagamento. Tente novamente.";
}

function tratarResposta(data) {
  resultado.value = data;
  const status = data?.pagamento?.status_pagamento;

  if (
    ["aprovado", "pendente", "processando"].includes(status) ||
    data?.pagamento?.forma_pagamento === "dinheiro"
  ) {
    cart.limpar();
  }

  if (["pendente", "processando"].includes(status) && data?.pedido?.id) {
    iniciarPolling(data.pedido.id);
  } else {
    pararPolling();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function processarMercadoPago({ paymentType, formData }) {
  if (processando.value) return;
  processando.value = true;
  erro.value = "";

  try {
    const { data } = await paymentService.checkoutMercadoPago({
      checkoutId: checkoutId.value,
      cart,
      paymentType,
      formData,
    });

    tratarResposta(data);

    if (
      ["recusado", "cancelado", "reembolsado", "erro"].includes(
        data?.pagamento?.status_pagamento,
      )
    ) {
      checkoutId.value = novoCheckoutId();
      throw new Error("Pagamento não aprovado");
    }
  } catch (error) {
    erro.value = mensagemErro(error);
    if (error?.response?.data?.novo_checkout) {
      checkoutId.value = novoCheckoutId();
    }
    throw error;
  } finally {
    processando.value = false;
  }
}

async function finalizarDinheiro() {
  if (processando.value || cart.vazio) return;
  processando.value = true;
  erro.value = "";

  try {
    const { data } = await paymentService.checkoutDinheiro({
      checkoutId: checkoutId.value,
      cart,
    });
    tratarResposta(data);
  } catch (error) {
    erro.value = mensagemErro(error);
  } finally {
    processando.value = false;
  }
}

async function consultarPagamento(pedidoId) {
  if (consultando.value) return;
  consultando.value = true;
  try {
    const { data } = await paymentService.consultar(pedidoId);
    resultado.value = data;
    const status = data?.pagamento?.status_pagamento;
    if (
      ["aprovado", "recusado", "cancelado", "reembolsado", "erro"].includes(
        status,
      )
    ) {
      pararPolling();
    }
  } catch {
    // O polling tenta novamente. O webhook também continua ativo no backend.
  } finally {
    consultando.value = false;
  }
}

function iniciarPolling(pedidoId) {
  pararPolling();
  polling = window.setInterval(() => consultarPagamento(pedidoId), 5000);
}

function pararPolling() {
  if (polling) window.clearInterval(polling);
  polling = null;
}

async function copiarPix() {
  const codigo = pagamento.value?.pix_qr_code;
  if (!codigo) return;
  try {
    await navigator.clipboard.writeText(codigo);
    pixCopiado.value = true;
    window.setTimeout(() => {
      pixCopiado.value = false;
    }, 1800);
  } catch {
    erro.value =
      "Não foi possível copiar automaticamente. Selecione o código Pix e copie manualmente.";
  }
}

onBeforeUnmount(pararPolling);
</script>

<style scoped>
.checkout-page {
  width: min(100%, 1120px);
  margin: 0 auto;
  color: var(--student-text);
}
.checkout-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 22px;
}
.checkout-page__eyebrow {
  display: none;
}
.checkout-page__header h1 {
  margin: 0;
  font-size: 30px;
}
.checkout-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.checkout-page__back,
.checkout-page__secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #745019;
  font-size: 11px;
  font-weight: 700;
}
.checkout-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}
.checkout-payment,
.checkout-summary,
.checkout-result,
.checkout-empty {
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.checkout-payment {
  overflow: hidden;
}
.checkout-payment__head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 17px 18px;
  border-bottom: 1px solid var(--student-border);
}
.checkout-payment__step {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.checkout-payment__head h2 {
  margin: 0;
  font-size: 16px;
}
.checkout-payment__head p {
  margin: 3px 0 0;
  color: var(--student-muted);
  font-size: 10px;
}
.checkout-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px 18px;
}
.checkout-methods button {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #5e5750;
  text-align: left;
  cursor: pointer;
}
.checkout-methods button.is-active {
  border-color: #c79a55;
  background: #fbf6ed;
  color: #62400f;
  box-shadow: inset 0 0 0 1px #c79a55;
}
.checkout-methods button span {
  min-width: 0;
}
.checkout-methods strong,
.checkout-methods small {
  display: block;
}
.checkout-methods strong {
  font-size: 11px;
}
.checkout-methods small {
  margin-top: 2px;
  color: var(--student-muted);
  font-size: 8px;
}
.checkout-payment__body {
  padding: 0 18px 18px;
}
.checkout-cash {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 8px 12px;
  padding: 16px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #faf8f5;
}
.checkout-cash h3 {
  margin: 0;
  font-size: 13px;
}
.checkout-cash p {
  margin: 5px 0 0;
  color: var(--student-muted);
  font-size: 10px;
  line-height: 1.5;
}
.checkout-cash button {
  grid-column: 1/-1;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 7px;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.checkout-payment__error,
.checkout-payment__security {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0 18px 16px;
  padding: 10px;
  border-radius: 7px;
  font-size: 9px;
  line-height: 1.5;
}
.checkout-payment__error {
  background: var(--student-danger-soft);
  color: var(--student-danger);
}
.checkout-payment__security {
  background: #f6f3ef;
  color: #6d645c;
}
.checkout-payment__security p {
  margin: 0;
}
.checkout-summary {
  position: sticky;
  top: 24px;
  padding: 18px;
}
.checkout-summary h2 {
  margin: 0 0 14px;
  font-size: 16px;
}
.checkout-summary__items {
  padding-bottom: 13px;
  border-bottom: 1px solid var(--student-border);
}
.checkout-summary__items > div,
.checkout-summary__row,
.checkout-summary__total {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}
.checkout-summary__items > div + div {
  margin-top: 9px;
}
.checkout-summary__items span,
.checkout-summary__row span {
  min-width: 0;
  color: var(--student-muted);
  font-size: 9px;
}
.checkout-summary__items strong,
.checkout-summary__row strong {
  flex: 0 0 auto;
  font-size: 9px;
}
.checkout-summary__row {
  padding-top: 10px;
}
.checkout-summary__total {
  align-items: baseline;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid var(--student-border);
}
.checkout-summary__total span {
  font-size: 11px;
  font-weight: 700;
}
.checkout-summary__total strong {
  font-size: 20px;
}
.checkout-result,
.checkout-empty {
  min-height: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 34px;
}
.checkout-result__icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 15px;
  border-radius: 50%;
  background: #f1eee9;
  color: #6f655c;
}
.checkout-result__icon--success {
  background: var(--student-success-soft);
  color: var(--student-success);
}
.checkout-result__icon--error {
  background: var(--student-danger-soft);
  color: var(--student-danger);
}
.checkout-result__icon--pix,
.checkout-result__icon--cash {
  background: #faf2e4;
  color: #8a5c1c;
}
.checkout-result h2,
.checkout-empty h2 {
  margin: 0;
  font-size: 21px;
}
.checkout-result > p,
.checkout-empty p {
  max-width: 580px;
  margin: 7px 0 18px;
  color: var(--student-muted);
  font-size: 11px;
  line-height: 1.55;
}
.checkout-result__qr {
  width: 210px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
}
.checkout-result__qr img {
  width: 100%;
  display: block;
}
.checkout-result__pix-code {
  width: min(100%, 540px);
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.checkout-result__pix-code code {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: 7px;
  background: #faf8f5;
  color: #554c44;
  font-size: 9px;
  text-align: left;
}
.checkout-result__pix-code button {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: #2a211b;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
}
.checkout-result__waiting {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: var(--student-muted);
  font-size: 9px;
}
.checkout-result__summary {
  width: min(100%, 380px);
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  padding: 12px 0;
  border-top: 1px solid var(--student-border);
  border-bottom: 1px solid var(--student-border);
  font-size: 11px;
}
.checkout-result__actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.checkout-page__primary {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border-radius: 7px;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.checkout-page__secondary {
  padding: 0 10px;
}
.checkout-page__spinner {
  animation: checkout-spin 0.7s linear infinite;
}
@keyframes checkout-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 900px) {
  .checkout-page__layout {
    grid-template-columns: 1fr;
  }
  .checkout-summary {
    position: static;
    order: -1;
  }
}
@media (max-width: 700px) {
  .checkout-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .checkout-page__header h1 {
    font-size: 25px;
  }
  .checkout-methods {
    grid-template-columns: 1fr;
  }
  .checkout-result,
  .checkout-empty {
    min-height: 330px;
    padding: 24px 16px;
  }
  .checkout-result__pix-code {
    flex-direction: column;
  }
  .checkout-result__pix-code button {
    min-height: 38px;
    justify-content: center;
  }
  .checkout-result__actions {
    width: 100%;
    flex-direction: column;
  }
  .checkout-page__primary {
    width: 100%;
  }
  .checkout-page__secondary {
    justify-content: center;
    min-height: 36px;
  }
}
</style>
