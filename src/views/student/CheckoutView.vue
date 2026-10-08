<template>
  <div class="checkout-page">
    <nav class="checkout-progress" aria-label="Etapas da compra">
      <div class="checkout-progress__step is-done">
        <span><CircleCheckBig :size="14" /></span>
        <div>
          <strong>Carrinho</strong>
          <small>Itens revisados</small>
        </div>
      </div>
      <div
        class="checkout-progress__line"
        :class="{ 'is-done': Boolean(resultado) }"
      />
      <div
        class="checkout-progress__step"
        :class="{ 'is-active': !resultado, 'is-done': Boolean(resultado) }"
      >
        <span>
          <CircleCheckBig v-if="resultado" :size="14" />
          <span v-else>2</span>
        </span>
        <div>
          <strong>Pagamento</strong>
          <small>{{ resultado ? "Concluído" : "Escolha como pagar" }}</small>
        </div>
      </div>
      <div
        class="checkout-progress__line"
        :class="{ 'is-done': Boolean(resultado) }"
      />
      <div
        class="checkout-progress__step"
        :class="{ 'is-active': Boolean(resultado) }"
      >
        <span>3</span>
        <div>
          <strong>Confirmação</strong>
          <small>{{
            resultado ? "Acompanhe seu pedido" : "Próxima etapa"
          }}</small>
        </div>
      </div>
    </nav>

    <header class="checkout-page__header">
      <div>
        <h1>{{ resultado ? "Status do pedido" : "Pagamento" }}</h1>
        <p>
          {{
            resultado
              ? "Confira abaixo as informações da sua compra."
              : "Escolha a forma de pagamento e revise o resumo do pedido."
          }}
        </p>
      </div>

      <RouterLink
        v-if="!resultado"
        :to="{ name: 'carrinho' }"
        class="checkout-page__back"
      >
        <ArrowLeft :size="16" />
        Voltar ao carrinho
      </RouterLink>
    </header>

    <section v-if="resultado" class="checkout-result">
      <div class="checkout-result__top">
        <template v-if="pagamentoAprovado">
          <span class="checkout-result__icon checkout-result__icon--success">
            <CircleCheckBig :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Pagamento aprovado</span>
            <h2>Pedido #{{ pedido.id }} confirmado</h2>
            <p>
              Seu pedido já entrou no fluxo de preparo da Pires Panificadora.
            </p>
          </div>
        </template>

        <template v-else-if="challengeUrl">
          <span class="checkout-result__icon checkout-result__icon--waiting">
            <ShieldCheck :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Verificação do cartão</span>
            <h2>Confirme a compra no seu banco</h2>
            <p>Conclua a autenticação solicitada pelo emissor do cartão.</p>
          </div>
        </template>

        <template v-else-if="pagamentoPixPendente">
          <span class="checkout-result__icon checkout-result__icon--pix">
            <QrCode :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Aguardando Pix</span>
            <h2>Pague o pedido #{{ pedido.id }}</h2>
            <p>
              Use o QR Code ou o Pix copia e cola. A confirmação é automática.
            </p>
          </div>
        </template>

        <template v-else-if="pagamentoDinheiro">
          <span class="checkout-result__icon checkout-result__icon--cash">
            <Banknote :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Pagamento na retirada</span>
            <h2>Pedido #{{ pedido.id }} recebido</h2>
            <p>
              O pagamento será registrado quando você retirar o pedido no
              balcão.
            </p>
          </div>
        </template>

        <template v-else-if="pagamentoFalhou">
          <span class="checkout-result__icon checkout-result__icon--error">
            <CircleX :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Pagamento não concluído</span>
            <h2>Não foi possível concluir o pagamento</h2>
            <p>{{ mensagemResultado }}</p>
          </div>
        </template>

        <template v-else>
          <span class="checkout-result__icon checkout-result__icon--waiting">
            <Clock3 :size="30" />
          </span>
          <div>
            <span class="checkout-result__label">Processando</span>
            <h2>Pagamento em análise</h2>
            <p>A confirmação ainda está sendo processada.</p>
          </div>
        </template>
      </div>

      <div v-if="challengeUrl" class="checkout-result__challenge">
        <iframe
          :src="challengeUrl"
          title="Autenticação de segurança do cartão"
          referrerpolicy="strict-origin-when-cross-origin"
        />
      </div>

      <div v-else-if="pagamentoPixPendente" class="checkout-result__pix">
        <div v-if="pagamento.pix_qr_code_base64" class="checkout-result__qr">
          <img :src="qrPixSrc" alt="QR Code Pix do pedido" />
        </div>

        <div class="checkout-result__pix-info">
          <h3>Como pagar</h3>
          <ol>
            <li>Abra o Pix no aplicativo do seu banco.</li>
            <li>Escaneie o QR Code ou use o código copia e cola.</li>
            <li>Conclua o pagamento e aguarde a confirmação nesta tela.</li>
          </ol>

          <div v-if="pagamento.pix_qr_code" class="checkout-result__pix-code">
            <code>{{ pagamento.pix_qr_code }}</code>
            <button type="button" @click="copiarPix">
              <Copy :size="15" />
              {{ pixCopiado ? "Copiado" : "Copiar código" }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="
          challengeUrl ||
          pagamentoPixPendente ||
          (!pagamentoAprovado && !pagamentoDinheiro && !pagamentoFalhou)
        "
        class="checkout-result__waiting"
      >
        <LoaderCircle :size="16" class="checkout-page__spinner" />
        <span>
          {{
            consultando
              ? "Atualizando o status..."
              : challengeUrl
                ? "Aguardando a autenticação..."
                : pagamentoPixPendente
                  ? "Aguardando confirmação do pagamento..."
                  : "Verificando pagamento..."
          }}
        </span>
      </div>

      <div v-if="pedido" class="checkout-result__footer">
        <div class="checkout-result__summary">
          <span>Total do pedido</span>
          <strong>{{ formatarPreco(pedido.total) }}</strong>
        </div>

        <div class="checkout-result__actions">
          <RouterLink :to="{ name: 'pedidos' }" class="checkout-page__primary">
            Acompanhar pedido
            <ArrowRight :size="16" />
          </RouterLink>
          <RouterLink
            :to="{ name: 'cardapio' }"
            class="checkout-page__secondary"
          >
            Voltar ao cardápio
          </RouterLink>
        </div>
      </div>
    </section>

    <section v-else-if="cart.vazio" class="checkout-empty">
      <ShoppingCart :size="30" />
      <h2>Seu carrinho está vazio</h2>
      <p>Volte ao cardápio e escolha os produtos antes de abrir o checkout.</p>
      <RouterLink :to="{ name: 'cardapio' }" class="checkout-page__primary">
        Ver cardápio
      </RouterLink>
    </section>

    <div v-else class="checkout-page__layout">
      <main class="checkout-payment">
        <div class="checkout-payment__head">
          <div>
            <span class="checkout-payment__kicker">Forma de pagamento</span>
            <h2>Como você quer pagar?</h2>
            <p>Selecione uma opção para continuar.</p>
          </div>
        </div>

        <div
          class="checkout-methods"
          role="radiogroup"
          aria-label="Forma de pagamento"
        >
          <button
            type="button"
            role="radio"
            :aria-checked="metodo === 'pix'"
            :class="{ 'is-active': metodo === 'pix' }"
            @click="selecionarMetodo('pix')"
          >
            <span class="checkout-methods__icon"><QrCode :size="20" /></span>
            <span class="checkout-methods__copy">
              <strong>Pix</strong>
              <small>QR Code ou copia e cola</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'pix'" :size="17" />
            </span>
          </button>

          <button
            type="button"
            role="radio"
            :aria-checked="metodo === 'card'"
            :class="{ 'is-active': metodo === 'card' }"
            @click="selecionarMetodo('card')"
          >
            <span class="checkout-methods__icon"
              ><CreditCard :size="20"
            /></span>
            <span class="checkout-methods__copy">
              <strong>Cartão</strong>
              <small>Crédito ou débito</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'card'" :size="17" />
            </span>
          </button>

          <button
            type="button"
            role="radio"
            :aria-checked="metodo === 'cash'"
            :class="{ 'is-active': metodo === 'cash' }"
            @click="selecionarMetodo('cash')"
          >
            <span class="checkout-methods__icon"><Banknote :size="20" /></span>
            <span class="checkout-methods__copy">
              <strong>Dinheiro</strong>
              <small>Pague no momento da retirada</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'cash'" :size="17" />
            </span>
          </button>
        </div>

        <div class="checkout-payment__body">
          <div v-if="metodo === 'cash'" class="checkout-cash">
            <div class="checkout-cash__icon">
              <Banknote :size="25" />
            </div>
            <div class="checkout-cash__copy">
              <h3>Pague ao retirar</h3>
              <p>
                Seu pedido será reservado agora. Leve o valor em dinheiro e o
                pagamento será confirmado na retirada.
              </p>
            </div>
            <button
              type="button"
              :disabled="processando"
              @click="finalizarDinheiro"
            >
              <LoaderCircle
                v-if="processando"
                :size="17"
                class="checkout-page__spinner"
              />
              <Banknote v-else :size="17" />
              {{
                processando
                  ? "Criando pedido..."
                  : `Confirmar pedido · ${formatarPreco(cart.totalPreco)}`
              }}
            </button>
          </div>

          <MercadoPagoPaymentBrick
            v-else
            :key="`${metodo}-${cart.totalPreco}`"
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
          <ShieldCheck :size="17" />
          <div>
            <strong>Pagamento protegido</strong>
            <p>
              Cartão e Pix são processados pelo Mercado Pago. A Pires não recebe
              número do cartão nem CVV.
            </p>
          </div>
        </div>
      </main>

      <aside class="checkout-summary">
        <div class="checkout-summary__head">
          <div>
            <span>Seu pedido</span>
            <strong
              >{{ cart.totalItens }}
              {{ cart.totalItens === 1 ? "item" : "itens" }}</strong
            >
          </div>
          <RouterLink :to="{ name: 'carrinho' }">Editar</RouterLink>
        </div>

        <div class="checkout-summary__items">
          <div
            v-for="item in cart.itens"
            :key="item.produto.id"
            class="checkout-summary__item"
          >
            <ProductImage :produto="item.produto" variant="compact" />
            <div class="checkout-summary__item-copy">
              <strong>{{ item.produto.nome }}</strong>
              <span
                >{{ item.quantidade }}x ·
                {{ formatarPreco(precoItem(item)) }} cada</span
              >
            </div>
            <strong class="checkout-summary__item-price">
              {{ formatarPreco(precoItem(item) * item.quantidade) }}
            </strong>
          </div>
        </div>

        <div class="checkout-summary__rows">
          <div>
            <span>Subtotal</span>
            <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
          </div>
          <div>
            <span>Retirada no balcão</span>
            <strong>Grátis</strong>
          </div>
        </div>

        <div class="checkout-summary__total">
          <span>Total</span>
          <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
        </div>

        <div class="checkout-summary__pickup">
          <Clock3 :size="17" />
          <span
            >Você será avisado quando o pedido estiver pronto para
            retirada.</span
          >
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
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

import ProductImage from "@/components/catalog/ProductImage.vue";
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
const challengeUrl = computed(
  () => pagamento.value?.mercadopago_challenge_url || "",
);
const challengeOrigin = computed(() => {
  if (!challengeUrl.value) return "";
  try {
    return new URL(challengeUrl.value).origin;
  } catch {
    return "";
  }
});
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

function tratarMensagem3DS(event) {
  if (!challengeUrl.value || !pedido.value?.id) return;
  if (challengeOrigin.value && event.origin !== challengeOrigin.value) return;
  if (event.data?.status === "COMPLETE") {
    consultarPagamento(pedido.value.id);
  }
}

onMounted(() => window.addEventListener("message", tratarMensagem3DS));

onBeforeUnmount(() => {
  pararPolling();
  window.removeEventListener("message", tratarMensagem3DS);
});
</script>

<style scoped>
.checkout-page {
  width: min(100%, 1120px);
  margin: 0 auto;
  color: var(--student-text);
}

.checkout-progress {
  display: grid;
  grid-template-columns: auto minmax(32px, 1fr) auto minmax(32px, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 26px;
  padding: 12px 16px;
  border: 1px solid var(--student-border);
  border-radius: 12px;
  background: #fff;
}

.checkout-progress__step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9a928a;
}

.checkout-progress__step > span {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  flex: 0 0 26px;
  border: 1px solid #ddd6cf;
  border-radius: 50%;
  background: #fff;
  font-size: 9px;
  font-weight: 800;
}

.checkout-progress__step strong,
.checkout-progress__step small {
  display: block;
  white-space: nowrap;
}

.checkout-progress__step strong {
  color: #6e665f;
  font-size: 9.5px;
}

.checkout-progress__step small {
  margin-top: 1px;
  font-size: 7.5px;
}

.checkout-progress__step.is-active > span {
  border-color: #2a211b;
  background: #2a211b;
  color: #fff;
}

.checkout-progress__step.is-active strong {
  color: #2a211b;
}

.checkout-progress__step.is-done > span {
  border-color: #d8c6a9;
  background: #f8f1e6;
  color: #8b5d1c;
}

.checkout-progress__line {
  height: 1px;
  background: #e4ded7;
}

.checkout-progress__line.is-done {
  background: #ceb991;
}

.checkout-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 22px;
}

.checkout-page__header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 750;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.checkout-page__header p {
  margin: 7px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}

.checkout-page__back,
.checkout-page__secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #745019;
  font-size: 10.5px;
  font-weight: 700;
}

.checkout-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.checkout-payment,
.checkout-summary,
.checkout-result,
.checkout-empty {
  border: 1px solid var(--student-border);
  border-radius: 14px;
  background: #fff;
}

.checkout-payment {
  overflow: hidden;
}

.checkout-payment__head {
  padding: 20px 20px 12px;
}

.checkout-payment__kicker {
  display: block;
  margin-bottom: 5px;
  color: #8b5d1c;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.checkout-payment__head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 740;
}

.checkout-payment__head p {
  margin: 5px 0 0;
  color: var(--student-muted);
  font-size: 10px;
}

.checkout-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 7px 20px 18px;
  border-bottom: 1px solid var(--student-border);
}

.checkout-methods button {
  min-width: 0;
  min-height: 70px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: 9px;
  background: #fff;
  color: #5d554e;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.checkout-methods button:hover {
  border-color: #cfc2b2;
}

.checkout-methods button.is-active {
  border-color: #ae7b35;
  background: #fcf8f1;
  color: #4a3720;
  box-shadow: inset 0 0 0 1px rgba(174, 123, 53, 0.28);
}

.checkout-methods__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #f5f1ec;
  color: #6c5d4e;
}

.checkout-methods button.is-active .checkout-methods__icon {
  background: #f3e7d4;
  color: #855918;
}

.checkout-methods__copy {
  min-width: 0;
}

.checkout-methods__copy strong,
.checkout-methods__copy small {
  display: block;
}

.checkout-methods__copy strong {
  font-size: 10.5px;
  font-weight: 750;
}

.checkout-methods__copy small {
  overflow: hidden;
  margin-top: 2px;
  color: var(--student-muted);
  font-size: 7.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-methods__check {
  width: 20px;
  display: grid;
  place-items: center;
  color: #8d611e;
}

.checkout-payment__body {
  padding: 18px 20px;
}

.checkout-cash {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px 12px;
  padding: 16px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #faf8f5;
}

.checkout-cash__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #f0e6d8;
  color: #81591f;
}

.checkout-cash__copy h3 {
  margin: 2px 0 0;
  font-size: 13px;
}

.checkout-cash__copy p {
  margin: 5px 0 0;
  color: var(--student-muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.checkout-cash > button {
  grid-column: 1 / -1;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 4px;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 720;
  cursor: pointer;
}

.checkout-payment__error,
.checkout-payment__security {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 20px 18px;
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 9px;
  line-height: 1.45;
}

.checkout-payment__error {
  background: var(--student-danger-soft);
  color: var(--student-danger);
}

.checkout-payment__security {
  border-top: 1px solid var(--student-border);
  border-radius: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding: 14px 0 18px;
  background: transparent;
  color: #746b63;
}

.checkout-payment__security svg {
  margin-top: 1px;
  color: var(--student-success);
}

.checkout-payment__security strong {
  display: block;
  color: #4d443d;
  font-size: 9.5px;
}

.checkout-payment__security p {
  margin: 2px 0 0;
  font-size: 8.5px;
}

.checkout-summary {
  position: sticky;
  top: 24px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(47, 38, 31, 0.035);
}

.checkout-summary__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--student-border);
}

.checkout-summary__head span,
.checkout-summary__head strong {
  display: block;
}

.checkout-summary__head span {
  color: var(--student-muted);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.checkout-summary__head strong {
  margin-top: 3px;
  font-size: 13px;
}

.checkout-summary__head a {
  color: #79531a;
  font-size: 9.5px;
  font-weight: 700;
}

.checkout-summary__items {
  padding: 13px 0;
  border-bottom: 1px solid var(--student-border);
}

.checkout-summary__item {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
}

.checkout-summary__item + .checkout-summary__item {
  margin-top: 10px;
}

.checkout-summary__item :deep(.catalog-product-image--compact) {
  width: 46px;
  height: 46px;
  flex-basis: 46px;
  border-radius: 7px;
}

.checkout-summary__item-copy {
  min-width: 0;
}

.checkout-summary__item-copy strong {
  overflow: hidden;
  display: block;
  color: #38312b;
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-summary__item-copy span {
  display: block;
  margin-top: 3px;
  color: var(--student-muted);
  font-size: 7.5px;
}

.checkout-summary__item-price {
  font-size: 9px;
  white-space: nowrap;
}

.checkout-summary__rows {
  padding: 13px 0 11px;
}

.checkout-summary__rows > div,
.checkout-summary__total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.checkout-summary__rows > div + div {
  margin-top: 9px;
}

.checkout-summary__rows span {
  color: var(--student-muted);
  font-size: 9px;
}

.checkout-summary__rows strong {
  font-size: 9px;
}

.checkout-summary__total {
  align-items: baseline;
  padding-top: 13px;
  border-top: 1px solid var(--student-border);
}

.checkout-summary__total span {
  font-size: 11px;
  font-weight: 700;
}

.checkout-summary__total strong {
  font-size: 21px;
  letter-spacing: -0.03em;
}

.checkout-summary__pickup {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 13px;
  padding: 10px;
  border-radius: 8px;
  background: #f7f4ef;
  color: #6e645b;
  font-size: 8px;
  line-height: 1.45;
}

.checkout-summary__pickup svg {
  flex: 0 0 auto;
  color: #8f6323;
}

.checkout-result {
  padding: 26px;
}

.checkout-result__top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 21px;
  border-bottom: 1px solid var(--student-border);
}

.checkout-result__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  flex: 0 0 52px;
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

.checkout-result__label {
  display: block;
  margin: 2px 0 5px;
  color: #8b5d1c;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.checkout-result__top h2 {
  margin: 0;
  font-size: 20px;
}

.checkout-result__top p {
  max-width: 620px;
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 10.5px;
  line-height: 1.5;
}

.checkout-result__pix {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  padding: 24px 0 8px;
}

.checkout-result__qr {
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}

.checkout-result__qr img {
  width: 100%;
  display: block;
}

.checkout-result__pix-info h3 {
  margin: 0 0 10px;
  font-size: 13px;
}

.checkout-result__pix-info ol {
  margin: 0;
  padding-left: 18px;
  color: #6e665e;
  font-size: 9.5px;
  line-height: 1.7;
}

.checkout-result__pix-code {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 14px;
}

.checkout-result__pix-code code {
  min-width: 0;
  overflow: hidden;
  padding: 11px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #faf8f5;
  color: #554c44;
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-result__pix-code button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.checkout-result__challenge {
  width: 100%;
  height: 460px;
  margin-top: 20px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.checkout-result__challenge iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.checkout-result__waiting {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 15px;
  color: var(--student-muted);
  font-size: 9px;
}

.checkout-result__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--student-border);
}

.checkout-result__summary span,
.checkout-result__summary strong {
  display: block;
}

.checkout-result__summary span {
  color: var(--student-muted);
  font-size: 8px;
}

.checkout-result__summary strong {
  margin-top: 3px;
  font-size: 18px;
}

.checkout-result__actions {
  display: flex;
  gap: 8px;
}

.checkout-page__primary {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.checkout-page__secondary {
  min-height: 40px;
  padding: 0 10px;
}

.checkout-empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
}

.checkout-empty h2 {
  margin: 12px 0 0;
  font-size: 19px;
}

.checkout-empty p {
  max-width: 420px;
  margin: 7px 0 17px;
  color: var(--student-muted);
  font-size: 11px;
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
  .checkout-progress {
    grid-template-columns: 1fr 24px 1fr 24px 1fr;
    gap: 6px;
  }

  .checkout-progress__step {
    justify-content: center;
  }

  .checkout-progress__step > div {
    display: none;
  }

  .checkout-page__layout {
    grid-template-columns: 1fr;
  }

  .checkout-summary {
    position: static;
    order: -1;
  }
}

@media (max-width: 700px) {
  .checkout-progress {
    padding-inline: 12px;
  }

  .checkout-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .checkout-page__header h1 {
    font-size: 26px;
  }

  .checkout-methods {
    grid-template-columns: 1fr;
  }

  .checkout-methods button {
    min-height: 62px;
  }

  .checkout-result {
    padding: 20px 16px;
  }

  .checkout-result__top {
    gap: 11px;
  }

  .checkout-result__icon {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }

  .checkout-result__pix {
    grid-template-columns: 1fr;
  }

  .checkout-result__qr {
    width: min(220px, 100%);
    justify-self: center;
  }

  .checkout-result__pix-code {
    grid-template-columns: 1fr;
  }

  .checkout-result__pix-code button {
    min-height: 38px;
    justify-content: center;
  }

  .checkout-result__challenge {
    height: 520px;
  }

  .checkout-result__footer {
    align-items: stretch;
    flex-direction: column;
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
  }
}
</style>
