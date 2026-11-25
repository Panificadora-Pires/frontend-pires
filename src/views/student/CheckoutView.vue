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
        :class="{ 'is-done': etapaPagamentoConcluida }"
      />
      <div
        class="checkout-progress__step"
        :class="{
          'is-active': !etapaPagamentoConcluida,
          'is-done': etapaPagamentoConcluida,
        }"
      >
        <span>
          <CircleCheckBig v-if="etapaPagamentoConcluida" :size="14" />
          <span v-else>2</span>
        </span>
        <div>
          <strong>Pagamento</strong>
          <small>{{ descricaoPagamento }}</small>
        </div>
      </div>
      <div
        class="checkout-progress__line"
        :class="{ 'is-done': etapaPagamentoConcluida }"
      />
      <div
        class="checkout-progress__step"
        :class="{ 'is-active': Boolean(pedido) }"
      >
        <span>3</span>
        <div>
          <strong>Confirmação</strong>
          <small>{{ descricaoPedido }}</small>
        </div>
      </div>
    </nav>

    <header class="checkout-page__header">
      <div>
        <h1>{{ resultado ? "Status do pedido" : "Pagamento" }}</h1>
        <span v-if="!resultado" class="checkout-page__note"
          >Seu pedido, do seu jeito.</span
        >
        <p>
          {{
            resultado
              ? "Confira abaixo as informações da sua compra."
              : "Escolha como pagar e confira o total antes de confirmar."
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

    <section
      v-if="resultado"
      class="checkout-result"
      aria-label="Situação atual do pedido"
    >
      <div class="checkout-result__top" aria-live="polite" aria-atomic="true">
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

      <div v-if="pagamentoDinheiro" class="checkout-result__next">
        <Clock3 :size="20" aria-hidden="true" />
        <div>
          <strong>Próximo passo: retirada</strong>
          <p>
            Acompanhe o preparo em Meus pedidos. Você será avisado quando
            estiver pronto e poderá pagar em dinheiro no balcão.
          </p>
        </div>
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
            <span class="checkout-payment__kicker">Escolha uma opção</span>
            <h2>Como você quer pagar?</h2>
            <p>Escolha a opção que funciona melhor para você.</p>
          </div>
        </div>

        <div
          class="checkout-methods"
          role="group"
          aria-label="Forma de pagamento"
        >
          <button
            type="button"
            :aria-pressed="metodo === 'pix'"
            :disabled="processando"
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
            :aria-pressed="metodo === 'card'"
            :disabled="processando"
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
            :aria-pressed="metodo === 'cash'"
            :disabled="processando"
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
          <div class="checkout-payment__amount">
            <span>Total do pedido</span>
            <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
          </div>
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
                  : `Registrar pedido · ${formatarPreco(cart.totalPreco)}`
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

        <details class="checkout-summary__details" open>
          <summary class="checkout-summary__toggle">
            Ver itens e valores do pedido
          </summary>
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
        </details>

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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import { createAutoRefresh } from "@/utils/autoRefresh";
import {
  descreverEtapaPagamento,
  descreverEtapaPedido,
  etapaPagamentoAprovada,
} from "@/utils/checkoutProgress";

const INTERVALO_PAGAMENTO_MS = 5_000;

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
let montado = true;
const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
watch(
  () => cart.geracao,
  () => {
    pararPolling();
    resultado.value = null;
    erro.value = "";
    processando.value = false;
    consultando.value = false;
    pixCopiado.value = false;
    checkoutId.value = novoCheckoutId();
  },
  { flush: "sync" },
);

const pedido = computed(() => resultado.value?.pedido || null);
const descricaoPagamento = computed(() =>
  descreverEtapaPagamento({
    forma: resultado.value?.pagamento?.forma_pagamento,
    status: resultado.value?.pagamento?.status_pagamento,
    temChallenge: Boolean(
      resultado.value?.pagamento?.mercadopago_challenge_url,
    ),
    temResultado: Boolean(resultado.value),
  }),
);
const descricaoPedido = computed(() => descreverEtapaPedido(pedido.value?.id));
const etapaPagamentoConcluida = computed(() =>
  etapaPagamentoAprovada(resultado.value?.pagamento?.status_pagamento),
);
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

function tratarResposta(data, contexto) {
  if (!contextoAtual(contexto)) return;
  resultado.value = data;
  const status = data?.pagamento?.status_pagamento;

  if (
    ["aprovado", "pendente", "processando"].includes(status) ||
    data?.pagamento?.forma_pagamento === "dinheiro"
  ) {
    cart.limpar(contexto);
  }

  if (["pendente", "processando"].includes(status) && data?.pedido?.id) {
    iniciarPolling(data.pedido.id, contexto);
  } else {
    pararPolling();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function processarMercadoPago({ paymentType, formData }) {
  if (processando.value) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;
  processando.value = true;
  erro.value = "";

  try {
    const { data } = await paymentService.checkoutMercadoPago({
      checkoutId: checkoutId.value,
      cart,
      paymentType,
      formData,
    });

    if (!contextoAtual(contexto)) return;
    tratarResposta(data, contexto);

    if (
      ["recusado", "cancelado", "reembolsado", "erro"].includes(
        data?.pagamento?.status_pagamento,
      )
    ) {
      checkoutId.value = novoCheckoutId();
      throw new Error("Pagamento não aprovado");
    }
  } catch (error) {
    if (!contextoAtual(contexto)) return;
    erro.value = mensagemErro(error);
    if (error?.response?.data?.novo_checkout) {
      checkoutId.value = novoCheckoutId();
    }
    throw error;
  } finally {
    if (contextoAtual(contexto)) processando.value = false;
  }
}

async function finalizarDinheiro() {
  if (processando.value || cart.vazio) return;
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;
  processando.value = true;
  erro.value = "";

  try {
    const { data } = await paymentService.checkoutDinheiro({
      checkoutId: checkoutId.value,
      cart,
    });
    tratarResposta(data, contexto);
  } catch (error) {
    if (contextoAtual(contexto)) erro.value = mensagemErro(error);
  } finally {
    if (contextoAtual(contexto)) processando.value = false;
  }
}

async function consultarPagamento(
  pedidoId,
  contexto = cart.capturarContexto(),
) {
  if (consultando.value || !contextoAtual(contexto)) return;
  consultando.value = true;
  try {
    const { data } = await paymentService.consultar(pedidoId);
    if (!contextoAtual(contexto)) return;
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
    if (contextoAtual(contexto)) consultando.value = false;
  }
}

function iniciarPolling(pedidoId, contexto) {
  pararPolling();
  polling = createAutoRefresh(() => consultarPagamento(pedidoId, contexto), {
    intervalo: INTERVALO_PAGAMENTO_MS,
    imediato: false,
  });
  polling.iniciar();
}

function pararPolling() {
  polling?.parar();
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
  montado = false;
  pararPolling();
  window.removeEventListener("message", tratarMensagem3DS);
});
</script>

<style scoped src="./CheckoutView.css"></style>
