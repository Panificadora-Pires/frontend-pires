<template>
  <div
    v-if="aberto"
    class="qr-scanner"
    role="presentation"
    @click.self="fechar"
  >
    <section
      class="qr-scanner__dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <header class="qr-scanner__header">
        <div>
          <h2 id="qr-scanner-title">Confirmar retirada</h2>
          <p>Leia o QR Code do cliente ou informe o código de retirada manualmente.</p>
        </div>

        <button
          type="button"
          class="qr-scanner__close"
          aria-label="Fechar leitor de QR Code"
          :disabled="processando"
          @click="fechar"
        >
          <X :size="19" />
        </button>
      </header>

      <div class="qr-scanner__body">
        <div class="qr-scanner__camera" :class="{ 'is-error': cameraErro }">
          <video
            ref="video"
            class="qr-scanner__video"
            autoplay
            muted
            playsinline
          />

          <div v-if="cameraIniciando" class="qr-scanner__camera-state">
            <LoaderCircle :size="27" class="qr-scanner__spinner" />
            <strong>Abrindo câmera...</strong>
            <span>Autorize o acesso quando o navegador solicitar.</span>
          </div>

          <div v-else-if="cameraErro" class="qr-scanner__camera-state">
            <CameraOff :size="29" />
            <strong>{{ cameraErro }}</strong>
            <span>Você ainda pode usar o código manual abaixo.</span>
            <button
              type="button"
              class="qr-scanner__retry"
              :disabled="processando"
              @click="iniciarCamera"
            >
              <Camera :size="15" />
              Tentar abrir a câmera
            </button>
          </div>

          <div v-else class="qr-scanner__guide" aria-hidden="true">
            <span class="qr-scanner__corner qr-scanner__corner--tl" />
            <span class="qr-scanner__corner qr-scanner__corner--tr" />
            <span class="qr-scanner__corner qr-scanner__corner--bl" />
            <span class="qr-scanner__corner qr-scanner__corner--br" />
            <div class="qr-scanner__scan-line" />
          </div>

          <div v-if="!cameraIniciando && !cameraErro" class="qr-scanner__camera-caption">
            <QrCode :size="15" />
            Aponte a câmera para o QR Code
          </div>
        </div>

        <div class="qr-scanner__divider">
          <span>Código manual</span>
        </div>

        <label class="qr-scanner__field">
          <span>Código de retirada</span>
          <input
            v-model.trim="codigo"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="00000000-0000-0000-0000-000000000000"
            :disabled="processando"
            @keyup.enter="confirmarManual"
          />
        </label>

        <div v-if="erro" class="qr-scanner__error" role="alert">
          <CircleAlert :size="16" />
          <span>{{ erro }}</span>
        </div>
      </div>

      <footer class="qr-scanner__footer">
        <button
          type="button"
          class="qr-scanner__button qr-scanner__button--secondary"
          :disabled="processando"
          @click="fechar"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="qr-scanner__button qr-scanner__button--primary"
          :disabled="processando || !codigo"
          @click="confirmarManual"
        >
          <LoaderCircle
            v-if="processando"
            :size="16"
            class="qr-scanner__spinner"
          />
          <CircleCheck v-else :size="16" />
          {{ processando ? "Confirmando..." : "Confirmar retirada" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  QrCode,
  X,
} from "lucide-vue-next";

import adminService from "@/services/admin.service";

const props = defineProps({
  aberto: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "retirado"]);

const video = ref(null);
const codigo = ref("");
const erro = ref("");
const cameraErro = ref("");
const cameraIniciando = ref(false);
const processando = ref(false);

let leitor = null;
let controles = null;
let leituraEmAndamento = false;

watch(
  () => props.aberto,
  async (aberto) => {
    if (!aberto) {
      pararCamera();
      return;
    }

    codigo.value = "";
    erro.value = "";
    cameraErro.value = "";
    leituraEmAndamento = false;

    await nextTick();
    await iniciarCamera();
  },
);

onBeforeUnmount(pararCamera);

async function iniciarCamera() {
  if (!props.aberto || processando.value) return;

  pararCamera();
  cameraIniciando.value = true;
  cameraErro.value = "";
  erro.value = "";

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("CAMERA_UNAVAILABLE");
    }

    leitor = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 500,
      tryPlayVideoTimeout: 5000,
    });

    controles = await leitor.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      video.value,
      (resultado) => {
        if (!resultado || leituraEmAndamento || processando.value) return;

        const texto = String(resultado.getText?.() || "").trim();
        if (!texto) return;

        leituraEmAndamento = true;
        codigo.value = texto;
        void confirmarCodigo(texto, { origemCamera: true });
      },
    );
  } catch (e) {
    cameraErro.value = mensagemErroCamera(e);
  } finally {
    cameraIniciando.value = false;
  }
}

function pararCamera() {
  try {
    controles?.stop?.();
  } catch {
    // A câmera já pode ter sido encerrada pelo próprio navegador.
  }

  controles = null;
  leitor = null;

  const stream = video.value?.srcObject;
  if (stream?.getTracks) {
    stream.getTracks().forEach((track) => track.stop());
  }

  if (video.value) {
    video.value.srcObject = null;
  }
}

function mensagemErroCamera(error) {
  const nome = String(error?.name || "");

  if (nome === "NotAllowedError" || nome === "PermissionDeniedError") {
    return "A permissão da câmera foi bloqueada.";
  }

  if (
    nome === "NotFoundError" ||
    nome === "DevicesNotFoundError" ||
    nome === "OverconstrainedError"
  ) {
    return "Nenhuma câmera compatível foi encontrada.";
  }

  if (nome === "NotReadableError" || nome === "TrackStartError") {
    return "A câmera está sendo usada por outro aplicativo.";
  }

  if (nome === "SecurityError") {
    return "O navegador bloqueou a câmera por segurança.";
  }

  return "Não foi possível abrir a câmera.";
}

async function confirmarManual() {
  const valor = codigo.value.trim();
  if (!valor) return;
  await confirmarCodigo(valor, { origemCamera: false });
}

async function confirmarCodigo(valor, { origemCamera }) {
  if (processando.value) return;

  processando.value = true;
  erro.value = "";

  try {
    const pedido = await adminService.retirarViaQRCode(valor);
    pararCamera();
    emit("retirado", pedido);
  } catch (e) {
    erro.value = mensagemErroApi(
      e,
      "Não foi possível confirmar a retirada. Confira o código e tente novamente.",
    );

    if (origemCamera) {
      leituraEmAndamento = false;
    }
  } finally {
    processando.value = false;
  }
}

function mensagemErroApi(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.codigo_retirada === "string") return data.codigo_retirada;
  if (Array.isArray(data?.codigo_retirada) && data.codigo_retirada[0]) {
    return String(data.codigo_retirada[0]);
  }
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return String(data.non_field_errors[0]);
  }

  return fallback;
}

function fechar() {
  if (processando.value) return;
  pararCamera();
  emit("close");
}
</script>

<style scoped>
.qr-scanner {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(24, 20, 17, 0.48);
  backdrop-filter: blur(2px);
}

.qr-scanner__dialog {
  width: min(520px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(58, 41, 28, 0.12);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(24, 16, 10, 0.24);
}

.qr-scanner__header,
.qr-scanner__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
}

.qr-scanner__header {
  border-bottom: 1px solid #eee7df;
}

.qr-scanner__header h2 {
  margin: 0;
  color: #23170f;
  font-size: 18px;
  line-height: 1.2;
}

.qr-scanner__header p {
  margin: 5px 0 0;
  color: #81766d;
  font-size: 11px;
  line-height: 1.45;
}

.qr-scanner__close {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border: 1px solid #e6ded7;
  border-radius: 9px;
  background: #fff;
  color: #71675f;
  cursor: pointer;
}

.qr-scanner__body {
  padding: 16px 18px;
}

.qr-scanner__camera {
  min-height: 230px;
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #171411;
  color: #fff;
}

.qr-scanner__video {
  width: 100%;
  height: 230px;
  display: block;
  object-fit: cover;
  background: #171411;
}

.qr-scanner__camera-state {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 26px;
  text-align: center;
  background: #171411;
  color: #f6eee6;
}

.qr-scanner__camera-state strong {
  font-size: 13px;
}

.qr-scanner__camera-state span {
  max-width: 320px;
  color: #bdb3aa;
  font-size: 10px;
  line-height: 1.55;
}

.qr-scanner__retry {
  margin-top: 7px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}

.qr-scanner__guide {
  width: min(190px, 56%);
  aspect-ratio: 1;
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
}

.qr-scanner__corner {
  width: 34px;
  height: 34px;
  position: absolute;
  border-color: #f3b94e;
  border-style: solid;
}

.qr-scanner__corner--tl {
  top: 0;
  left: 0;
  border-width: 3px 0 0 3px;
  border-radius: 9px 0 0;
}

.qr-scanner__corner--tr {
  top: 0;
  right: 0;
  border-width: 3px 3px 0 0;
  border-radius: 0 9px 0 0;
}

.qr-scanner__corner--bl {
  bottom: 0;
  left: 0;
  border-width: 0 0 3px 3px;
  border-radius: 0 0 0 9px;
}

.qr-scanner__corner--br {
  right: 0;
  bottom: 0;
  border-width: 0 3px 3px 0;
  border-radius: 0 0 9px 0;
}

.qr-scanner__scan-line {
  height: 2px;
  position: absolute;
  left: 10px;
  right: 10px;
  top: 50%;
  border-radius: 999px;
  background: #f3b94e;
  box-shadow: 0 0 12px rgba(243, 185, 78, 0.7);
  animation: qr-scan 1.7s ease-in-out infinite alternate;
}

.qr-scanner__camera-caption {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 3;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(24, 18, 14, 0.72);
  color: #f7eee4;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}

.qr-scanner__divider {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 16px 0 11px;
  color: #9b9087;
  font-size: 10px;
}

.qr-scanner__divider::before,
.qr-scanner__divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: #eee7df;
}

.qr-scanner__field {
  display: grid;
  gap: 7px;
}

.qr-scanner__field > span {
  color: #4f433a;
  font-size: 11px;
  font-weight: 750;
}

.qr-scanner__field input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #ded6cf;
  border-radius: 9px;
  outline: none;
  color: #291b13;
  font: inherit;
  font-size: 12px;
}

.qr-scanner__field input:focus {
  border-color: #b67b20;
  box-shadow: 0 0 0 3px rgba(182, 123, 32, 0.11);
}

.qr-scanner__error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 11px;
  padding: 10px 11px;
  border: 1px solid #fecaca;
  border-radius: 9px;
  background: #fff7f7;
  color: #b42318;
  font-size: 10px;
  line-height: 1.45;
}

.qr-scanner__footer {
  justify-content: flex-end;
  border-top: 1px solid #eee7df;
}

.qr-scanner__button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.qr-scanner__button:disabled,
.qr-scanner__retry:disabled,
.qr-scanner__close:disabled {
  opacity: 0.62;
  cursor: wait;
}

.qr-scanner__button--secondary {
  border: 1px solid #ddd5ce;
  background: #fff;
  color: #4f433a;
}

.qr-scanner__button--primary {
  border: 1px solid #c98d2e;
  background: #cf9d58;
  color: #fff;
}

.qr-scanner__spinner {
  animation: qr-spin 750ms linear infinite;
}

@keyframes qr-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes qr-scan {
  from {
    transform: translateY(-56px);
  }
  to {
    transform: translateY(56px);
  }
}

@media (max-width: 600px) {
  .qr-scanner {
    padding: 10px;
  }

  .qr-scanner__dialog {
    max-height: calc(100dvh - 20px);
    border-radius: 14px;
  }

  .qr-scanner__header,
  .qr-scanner__footer {
    padding: 14px;
  }

  .qr-scanner__body {
    padding: 14px;
  }

  .qr-scanner__camera,
  .qr-scanner__video {
    height: min(52dvh, 330px);
    min-height: 245px;
  }

  .qr-scanner__footer {
    display: grid;
    grid-template-columns: 1fr 1.35fr;
  }

  .qr-scanner__button {
    width: 100%;
  }
}
</style>
