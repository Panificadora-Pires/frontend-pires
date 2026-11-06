<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  CircleAlert,
  LoaderCircle,
  PackageCheck,
  QrCode,
  X,
} from "lucide-vue-next";
import orderService from "@/services/order.service";
import { useOrderDialog } from "@/composables/useOrderDialog";

const props = defineProps({ pedido: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const dialogo = ref(null);
const carregando = ref(true);
const erro = ref("");
const dados = ref(null);
const { fechar, fecharNoFundo } = useOrderDialog(dialogo, () => emit("close"));
let ativo = true;
let consulta = 0;

async function carregarQRCode() {
  const atual = ++consulta;
  const id = props.pedido.id;
  if (props.pedido.status !== "pronto") {
    emit("close");
    return;
  }
  carregando.value = true;
  dados.value = null;
  erro.value = "";
  try {
    const { data } = await orderService.obterQRCode(id);
    if (
      !ativo ||
      atual !== consulta ||
      props.pedido.id !== id ||
      props.pedido.status !== "pronto"
    )
      return;
    if (
      !data?.codigo_retirada ||
      typeof data?.qrcode_base64 !== "string" ||
      !data.qrcode_base64.startsWith("data:image/png;base64,")
    )
      throw new Error("Resposta inválida");
    dados.value = data;
  } catch (error) {
    if (!ativo || atual !== consulta) return;
    // Não registrar o objeto Axios: ele pode conter o código de retirada.
    erro.value =
      error?.response?.status === 404
        ? "O pedido não foi encontrado ou não pertence a esta conta."
        : "Verifique sua conexão e tente novamente.";
  } finally {
    if (ativo && atual === consulta) carregando.value = false;
  }
}
watch(
  () => [props.pedido.id, props.pedido.status],
  () => {
    ++consulta;
    dados.value = null;
    if (props.pedido.status !== "pronto") emit("close");
    else carregarQRCode();
  },
);
onMounted(carregarQRCode);
onBeforeUnmount(() => {
  ativo = false;
  ++consulta;
  dados.value = null;
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialogo"
      class="qr-modal"
      aria-labelledby="qr-modal-title"
      aria-describedby="qr-modal-description"
      @cancel.prevent="fechar"
      @click="fecharNoFundo"
    >
      <button
        type="button"
        autofocus
        class="qr-modal__close"
        aria-label="Fechar QR Code"
        @click="fechar"
      >
        <X :size="20" aria-hidden="true" />
      </button>
      <header class="qr-modal__header">
        <QrCode :size="28" aria-hidden="true" />
        <h2 id="qr-modal-title">Seu pedido está pronto.</h2>
        <p id="qr-modal-description">
          Apresente este QR Code no balcão para retirar o pedido
          <strong>#{{ pedido.id }}</strong
          >.
        </p>
      </header>
      <div v-if="carregando" class="qr-modal__state" role="status">
        <LoaderCircle :size="28" aria-hidden="true" />
        <p>Carregando QR Code…</p>
      </div>
      <div v-else-if="erro" class="qr-modal__state" role="alert">
        <CircleAlert :size="28" aria-hidden="true" /><strong
          >Não foi possível carregar o QR Code</strong
        >
        <p>{{ erro }}</p>
        <button type="button" @click="carregarQRCode">Tentar novamente</button>
      </div>
      <div v-else-if="dados" class="qr-modal__content">
        <div class="qr-modal__qr">
          <img
            :src="dados.qrcode_base64"
            :alt="`QR Code de retirada do pedido #${pedido.id}`"
            width="280"
            height="280"
            @error="
              dados = null;
              erro = 'A imagem não carregou. Tente novamente.';
            "
          />
        </div>
        <div class="qr-modal__code">
          <span>Código de retirada</span
          ><strong>{{ dados.codigo_retirada }}</strong>
        </div>
        <p class="qr-modal__notice">
          <PackageCheck :size="20" aria-hidden="true" /><span
            >Mostre o código à equipe. A retirada será confirmada pelo
            balcão.</span
          >
        </p>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.qr-modal {
  position: fixed;
  margin: auto;
  width: min(460px, calc(100% - 24px));
  max-height: calc(100dvh - 24px);
  overflow: auto;
  padding: 34px 30px 24px;
  border: 0;
  border-radius: 16px;
  background: var(--pp-creme);
  color: var(--pp-marrom);
  box-shadow: var(--pp-shadow-soft);
  font-family: var(--pp-font-body);
  animation: qr-enter 220ms var(--pp-ease);
}
.qr-modal::backdrop {
  background: var(--pp-overlay);
}
.qr-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 50%;
  background: transparent;
  color: var(--pp-marrom);
  cursor: pointer;
}
.qr-modal__header {
  padding-top: 20px;
}
.qr-modal__header > svg {
  color: var(--pp-dourado-profundo);
}
.qr-modal h2 {
  font: 400 36px/1.15 var(--pp-font-titulo);
  letter-spacing: -0.02em;
  margin: 18px 0 12px;
}
.qr-modal__header p {
  font-size: 14px;
  line-height: 1.7;
  color: var(--pp-texto-2);
  margin: 0 0 24px;
}
.qr-modal__qr {
  margin: 0 auto;
  padding: 16px;
  width: min(100%, 312px);
  background: var(--pp-surface-card);
}
.qr-modal__qr img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
}
.qr-modal__code {
  padding: 18px 0;
  text-align: center;
}
.qr-modal__code span {
  display: block;
  font-size: 12px;
  color: var(--pp-texto-2);
}
.qr-modal__code strong {
  display: block;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
  margin-top: 8px;
}
.qr-modal__notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pp-texto-2);
  border-top: 1px solid var(--pp-creme-borda);
  padding-top: 18px;
  margin: 0;
}
.qr-modal__notice svg {
  flex-shrink: 0;
}
.qr-modal__state {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
}
.qr-modal__state p {
  color: var(--pp-texto-2);
  margin: 0;
}
.qr-modal__state button {
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  cursor: pointer;
}
.qr-modal button:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 3px;
}
@keyframes qr-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (max-width: 390px) {
  .qr-modal {
    padding: 28px 20px 20px;
  }
  .qr-modal h2 {
    font-size: 32px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .qr-modal {
    animation: none;
  }
}
</style>
