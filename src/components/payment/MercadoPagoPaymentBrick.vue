<template>
  <div class="mp-brick">
    <div v-if="erroConfiguracao" class="mp-brick__error" role="alert">
      <CircleAlert :size="18" />
      <span>{{ erroConfiguracao }}</span>
    </div>

    <div v-else-if="mode === 'pix'" class="mp-brick__pix">
      <div class="mp-brick__method-head">
        <span class="mp-brick__method-icon"><QrCode :size="24" /></span>
        <div>
          <strong>Pagamento via Pix</strong>
          <p>
            O QR Code será gerado pelo Mercado Pago e ficará disponível nesta
            tela.
          </p>
        </div>
      </div>

      <div class="mp-brick__benefits">
        <span><Zap :size="14" /> Confirmação automática</span>
        <span><ShieldCheck :size="14" /> Processamento seguro</span>
      </div>

      <button type="button" :disabled="enviandoPix" @click="gerarPix">
        <LoaderCircle v-if="enviandoPix" :size="17" class="mp-brick__spinner" />
        <QrCode v-else :size="17" />
        {{ enviandoPix ? "Gerando Pix..." : "Gerar QR Code Pix" }}
        <ArrowRight v-if="!enviandoPix" :size="15" />
      </button>
    </div>

    <div v-else class="mp-brick__card">
      <div class="mp-brick__method-head">
        <span class="mp-brick__method-icon"><CreditCard :size="23" /></span>
        <div>
          <strong>Dados do cartão</strong>
          <p>Preencha os dados no formulário seguro do Mercado Pago.</p>
        </div>
        <span class="mp-brick__secure">
          <ShieldCheck :size="13" />
          Seguro
        </span>
      </div>

      <p v-if="avisoCartao" class="mp-brick__aviso" role="alert">
        <CircleAlert :size="15" aria-hidden="true" />
        <span>{{ avisoCartao }}</span>
      </p>

      <div v-if="carregando" class="mp-brick__loading" role="status">
        <LoaderCircle :size="18" class="mp-brick__spinner" />
        Preparando ambiente seguro de pagamento...
      </div>

      <div :id="containerId" class="mp-brick__container" />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  ArrowRight,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  Zap,
} from "lucide-vue-next";
import {
  erroBrickBloqueante,
  mensagemAvisoBrick,
} from "@/utils/mercadoPagoBrick.js";

const props = defineProps({
  amount: { type: Number, required: true },
  email: { type: String, default: "" },
  mode: {
    type: String,
    required: true,
    validator: (value) => ["pix", "card"].includes(value),
  },
  submitHandler: { type: Function, required: true },
});

const PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";
const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const containerId = `cardPaymentBrick_${Math.random().toString(36).slice(2)}`;
const carregando = ref(props.mode === "card");
const enviandoPix = ref(false);
const erroConfiguracao = ref("");
const avisoCartao = ref("");
let controller = null;

function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve();

  const existente = document.querySelector(`script[src="${SDK_SRC}"]`);
  if (existente) {
    return new Promise((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (window.MercadoPago) {
          window.clearInterval(timer);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(timer);
        reject(new Error("Tempo esgotado ao carregar o Mercado Pago."));
      }, 12000);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Não foi possível carregar o Mercado Pago."));
    document.head.appendChild(script);
  });
}

async function gerarPix() {
  if (enviandoPix.value) return;
  enviandoPix.value = true;
  erroConfiguracao.value = "";

  try {
    await props.submitHandler({
      paymentType: "bank_transfer",
      formData: {
        transaction_amount: Number(props.amount.toFixed(2)),
        payment_method_id: "pix",
        payer: props.email ? { email: props.email } : {},
      },
    });
  } catch (error) {
    erroConfiguracao.value =
      error?.response?.data?.detail ||
      error?.message ||
      "Não foi possível gerar o Pix.";
    throw error;
  } finally {
    enviandoPix.value = false;
  }
}

async function montarCardBrick() {
  if (props.mode !== "card") return;

  if (!PUBLIC_KEY) {
    erroConfiguracao.value =
      "A chave pública do Mercado Pago não foi configurada no frontend.";
    carregando.value = false;
    return;
  }

  try {
    await carregarSdk();
    const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "pt-BR" });
    const bricks = mp.bricks();

    controller = await bricks.create("cardPayment", containerId, {
      initialization: {
        amount: Number(props.amount.toFixed(2)),
      },
      callbacks: {
        onReady: () => {
          carregando.value = false;
        },
        onSubmit: (formData, additionalData) => {
          avisoCartao.value = "";
          return props.submitHandler({
            paymentType: additionalData?.paymentTypeId || "credit_card",
            formData,
          });
        },
        onError: (error) => {
          console.error("Mercado Pago Card Payment Brick:", error);
          if (!erroBrickBloqueante(error)) {
            avisoCartao.value = mensagemAvisoBrick(error);
            return;
          }
          erroConfiguracao.value =
            "O formulário de cartão encontrou um erro. Recarregue e tente novamente.";
          carregando.value = false;
        },
      },
    });
  } catch (error) {
    console.error(error);
    erroConfiguracao.value =
      error?.message || "Não foi possível iniciar o Mercado Pago.";
    carregando.value = false;
  }
}

onMounted(montarCardBrick);

onBeforeUnmount(async () => {
  if (controller?.unmount) {
    try {
      await controller.unmount();
    } catch {}
  }
});
</script>

<style scoped src="./MercadoPagoPaymentBrick.css"></style>
