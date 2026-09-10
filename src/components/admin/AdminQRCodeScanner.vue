<template>
  <Teleport to="body">
    <Transition name="scanner-fade">
      <div
        v-if="aberto"
        class="scanner"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar retirada"
        @click.self="fechar"
      >
        <section class="scanner__card">
          <header class="scanner__head">
            <div>
              <h2>Confirmar retirada</h2>
              <p>
                Leia o QR Code do cliente ou informe o código de retirada
                manualmente.
              </p>
            </div>
            <button
              type="button"
              class="scanner__close"
              aria-label="Fechar"
              @click="fechar"
            >
              <X :size="19" />
            </button>
          </header>

          <div class="scanner__body">
            <div v-if="cameraAtiva" class="scanner__camera-wrap">
              <video
                ref="videoRef"
                class="scanner__video"
                muted
                playsinline
              ></video>
              <div class="scanner__target"></div>
            </div>

            <div v-else class="scanner__camera-placeholder">
              <QrCode :size="32" />
              <strong>Leitura por câmera</strong>
              <p v-if="cameraDisponivel">
                Abra a câmera e posicione o QR Code no centro.
              </p>
              <p v-else>
                Este navegador não oferece leitura automática. Use o código
                manual.
              </p>
              <button
                v-if="cameraDisponivel"
                type="button"
                class="admin-btn"
                :disabled="iniciandoCamera"
                @click="iniciarCamera"
              >
                <Camera :size="16" />
                {{ iniciandoCamera ? "Abrindo câmera..." : "Abrir câmera" }}
              </button>
            </div>

            <div class="scanner__separator"><span>Código manual</span></div>

            <label class="admin-field scanner__field">
              <span class="admin-field-label">Código de retirada</span>
              <input
                v-model.trim="codigo"
                type="text"
                autocomplete="off"
                placeholder="00000000-0000-0000-0000-000000000000"
                @keyup.enter="confirmar"
              />
            </label>

            <p v-if="erro" class="scanner__error">
              <CircleAlert :size="16" />{{ erro }}
            </p>
          </div>

          <footer class="scanner__actions">
            <button type="button" class="admin-btn" @click="fechar">
              Cancelar
            </button>
            <button
              type="button"
              class="admin-btn admin-btn--primary"
              :disabled="!codigo || enviando"
              @click="confirmar"
            >
              <LoaderCircle v-if="enviando" :size="16" class="admin-spin" />
              <CheckCircle2 v-else :size="16" />
              {{ enviando ? "Confirmando..." : "Confirmar retirada" }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  QrCode,
  X,
} from "lucide-vue-next";

import adminService from "@/services/admin.service";

const props = defineProps({
  aberto: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "retirado"]);

const codigo = ref("");
const erro = ref("");
const enviando = ref(false);
const iniciandoCamera = ref(false);
const cameraAtiva = ref(false);
const videoRef = ref(null);
let stream = null;
let rafId = null;
let detector = null;

const cameraDisponivel = computed(() => {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.BarcodeDetector && navigator.mediaDevices?.getUserMedia,
  );
});

function normalizarErro(error) {
  const data = error.response?.data;
  if (typeof data?.codigo_retirada === "string") return data.codigo_retirada;
  if (Array.isArray(data?.codigo_retirada))
    return data.codigo_retirada.join(" ");
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  return "Não foi possível confirmar a retirada.";
}

async function confirmar() {
  if (!codigo.value || enviando.value) return;
  enviando.value = true;
  erro.value = "";

  try {
    const pedido = await adminService.retirarViaQRCode(codigo.value);
    pararCamera();
    emit("retirado", pedido);
  } catch (error) {
    erro.value = normalizarErro(error);
  } finally {
    enviando.value = false;
  }
}

async function iniciarCamera() {
  if (!cameraDisponivel.value || iniciandoCamera.value) return;
  iniciandoCamera.value = true;
  erro.value = "";

  try {
    detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    cameraAtiva.value = true;
    await nextTick();
    videoRef.value.srcObject = stream;
    await videoRef.value.play();
    detectarFrame();
  } catch {
    pararCamera();
    erro.value =
      "Não foi possível acessar a câmera. Verifique a permissão do navegador.";
  } finally {
    iniciandoCamera.value = false;
  }
}

async function detectarFrame() {
  if (!cameraAtiva.value || !detector || !videoRef.value) return;

  try {
    const resultados = await detector.detect(videoRef.value);
    const valor = resultados?.[0]?.rawValue;
    if (valor) {
      codigo.value = valor.trim();
      pararCamera();
      await confirmar();
      return;
    }
  } catch {
    // Alguns frames podem falhar durante foco/movimento; o próximo frame tenta novamente.
  }

  rafId = window.requestAnimationFrame(detectarFrame);
}

function pararCamera() {
  cameraAtiva.value = false;
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (videoRef.value) videoRef.value.srcObject = null;
}

function fechar() {
  pararCamera();
  emit("close");
}

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      codigo.value = "";
      erro.value = "";
    } else {
      pararCamera();
    }
  },
);

onBeforeUnmount(pararCamera);
</script>

<style scoped>
.scanner {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(28, 25, 23, 0.48);
}
.scanner__card {
  width: min(520px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: #fff;
  color: var(--admin-text);
  box-shadow: 0 24px 70px rgba(28, 25, 23, 0.18);
}
.scanner__head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--admin-border);
}
.scanner__head h2 {
  margin: 0;
  font-size: 18px;
}
.scanner__head p {
  margin: 5px 0 0;
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.5;
}
.scanner__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 34px;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: #fff;
  color: var(--admin-text-soft);
  cursor: pointer;
}
.scanner__body {
  padding: 18px 20px;
}
.scanner__camera-wrap,
.scanner__camera-placeholder {
  position: relative;
  min-height: 230px;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  background: #1c1917;
}
.scanner__video {
  width: 100%;
  height: 280px;
  display: block;
  object-fit: cover;
}
.scanner__target {
  position: absolute;
  width: 170px;
  height: 170px;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  border: 2px solid #f5c86e;
  border-radius: 10px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.22);
}
.scanner__camera-placeholder {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: #f5c86e;
}
.scanner__camera-placeholder strong {
  color: #fafaf9;
  font-size: 13px;
}
.scanner__camera-placeholder p {
  max-width: 330px;
  margin: 0 0 4px;
  color: #a8a29e;
  font-size: 11px;
  line-height: 1.5;
}
.scanner__camera-placeholder .admin-btn {
  border-color: #57534e;
  background: #292524;
  color: #f5f5f4;
}
.scanner__separator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 17px 0 14px;
  color: var(--admin-muted);
  font-size: 11px;
}
.scanner__separator::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--admin-border);
}
.scanner__error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 11px 0 0;
  color: var(--admin-danger);
  font-size: 12px;
  line-height: 1.45;
}
.scanner__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--admin-border);
}
.scanner-fade-enter-active,
.scanner-fade-leave-active {
  transition: opacity 150ms ease;
}
.scanner-fade-enter-from,
.scanner-fade-leave-to {
  opacity: 0;
}
@media (max-width: 560px) {
  .scanner {
    padding: 10px;
    align-items: end;
  }
  .scanner__card {
    max-height: 92vh;
    border-radius: 14px 14px 8px 8px;
  }
  .scanner__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
