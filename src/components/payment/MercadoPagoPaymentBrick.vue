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
          return props.submitHandler({
            paymentType: additionalData?.paymentTypeId || "credit_card",
            formData,
          });
        },
        onError: (error) => {
          console.error("Mercado Pago Card Payment Brick:", error);
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
    } catch {
    }
  }
});
</script>

<style scoped>
.mp-brick {
  min-width: 0;
}

.mp-brick__error {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid #edc9c5;
  border-radius: 10px;
  background: var(--student-danger-soft);
  color: var(--student-danger);
  text-align: center;
  font-size: 10px;
}

.mp-brick__pix,
.mp-brick__card {
  min-width: 0;
}

.mp-brick__pix {
  padding: 16px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #faf8f5;
}

.mp-brick__method-head {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}

.mp-brick__method-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #f0e6d8;
  color: #81591f;
}

.mp-brick__method-head strong {
  display: block;
  color: var(--student-text);
  font-size: 12px;
}

.mp-brick__method-head p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 9px;
  line-height: 1.45;
}

.mp-brick__secure {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--student-success);
  font-size: 8px;
  font-weight: 700;
}

.mp-brick__benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 15px 0 13px 53px;
  color: #6f675f;
  font-size: 8.5px;
}

.mp-brick__benefits span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.mp-brick__benefits svg {
  color: #8c6020;
}

.mp-brick__pix > button {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 10px;
  font-weight: 720;
  cursor: pointer;
}

.mp-brick__pix > button:hover:not(:disabled) {
  background: #19130f;
}

.mp-brick__pix > button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mp-brick__card {
  padding: 2px 0 0;
}

.mp-brick__card .mp-brick__method-head {
  margin-bottom: 15px;
}

.mp-brick__loading {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #faf8f5;
  color: var(--student-muted);
  text-align: center;
  font-size: 9.5px;
}

.mp-brick__container {
  min-width: 0;
}

.mp-brick__spinner {
  animation: mp-spin 0.7s linear infinite;
}

@keyframes mp-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .mp-brick__method-head {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .mp-brick__method-icon {
    width: 38px;
    height: 38px;
  }

  .mp-brick__secure {
    display: none;
  }

  .mp-brick__benefits {
    margin-left: 0;
  }
}
</style>
