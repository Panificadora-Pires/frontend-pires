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
          <p>
            Leia o QR Code do cliente ou informe o código de retirada
            manualmente.
          </p>
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

          <div
            v-if="!cameraIniciando && !cameraErro"
            class="qr-scanner__camera-caption"
          >
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
  } catch {}

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

<style scoped src="./AdminQRCodeScanner.css"></style>
