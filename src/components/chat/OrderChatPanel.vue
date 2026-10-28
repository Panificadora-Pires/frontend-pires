<template>
  <div class="order-chat" :class="`order-chat--${variante}`">
    <div
      v-if="!conversa && carregando"
      class="order-chat__state"
      aria-live="polite"
    >
      <LoaderCircle :size="22" class="order-chat__spin" aria-hidden="true" />
      <span>Carregando conversa...</span>
    </div>

    <div
      v-else-if="!conversa && erro"
      class="order-chat__state order-chat__state--error"
      role="alert"
    >
      <CircleAlert :size="22" aria-hidden="true" />
      <strong>Não foi possível abrir a conversa</strong>
      <span>{{ erro }}</span>
      <button type="button" class="order-chat__link-btn" @click="recarregar">
        Tentar novamente
      </button>
    </div>

    <template v-else-if="conversa">
      <ol
        ref="lista"
        class="order-chat__messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        :aria-label="`Mensagens do pedido #${pedidoId}`"
        tabindex="0"
        @scroll="registrarRolagem"
      >
        <li v-if="!itens.length" class="order-chat__empty">
          <MessagesSquare :size="22" aria-hidden="true" />
          <p>{{ textoVazio }}</p>
        </li>

        <li
          v-for="item in itens"
          :key="item.chave"
          class="order-chat__message"
          :class="{
            'is-mine': item.minha,
            'is-failed': item.estado === 'erro',
          }"
        >
          <span class="order-chat__author">{{ item.autor }}</span>
          <p class="order-chat__text">{{ item.texto }}</p>
          <span class="order-chat__meta">
            <time :datetime="item.criada_em">{{ formatarHora(item.criada_em) }}</time>
            <template v-if="item.estado === 'enviando'">
              <Clock3 :size="12" aria-hidden="true" /> Enviando...
            </template>
            <template v-else-if="item.estado === 'erro'">
              <CircleAlert :size="12" aria-hidden="true" /> Não enviada
            </template>
            <template v-else-if="item.minha">
              <CheckCheck v-if="item.lida" :size="12" aria-hidden="true" />
              <Check v-else :size="12" aria-hidden="true" />
              {{ item.lida ? "Lida" : "Enviada" }}
            </template>
          </span>

          <div v-if="item.estado === 'erro'" class="order-chat__retry">
            <span>{{ item.erro }}</span>
            <button
              type="button"
              class="order-chat__link-btn"
              @click="chat.reenviar(pedidoId, item.idLocal)"
            >
              <RotateCw :size="12" aria-hidden="true" /> Tentar de novo
            </button>
            <button
              type="button"
              class="order-chat__link-btn order-chat__link-btn--muted"
              @click="chat.descartar(pedidoId, item.idLocal)"
            >
              Descartar
            </button>
          </div>
        </li>
      </ol>

      <p
        v-if="conversa.somente_leitura"
        class="order-chat__notice"
        role="status"
      >
        <Lock :size="14" aria-hidden="true" />
        <span>
          Conversa encerrada em {{ formatarDataCompleta(conversa.encerra_em) }}.
          O histórico continua disponível.
        </span>
      </p>

      <form v-else class="order-chat__composer" @submit.prevent="enviar">
        <p v-if="conversa.encerra_em" class="order-chat__hint">
          Dá para enviar mensagens até
          {{ formatarDataCompleta(conversa.encerra_em) }}.
        </p>
        <div class="order-chat__field">
          <label :for="idCampo" class="order-chat__sr-only">
            Mensagem sobre o pedido #{{ pedidoId }}
          </label>
          <textarea
            :id="idCampo"
            ref="campo"
            v-model="texto"
            rows="1"
            :maxlength="LIMITE_CARACTERES"
            :placeholder="placeholder"
            :aria-describedby="restantes <= AVISO_LIMITE ? idContador : undefined"
            @keydown.enter.exact.prevent="enviar"
          />
          <button
            type="submit"
            class="order-chat__send"
            :disabled="!textoValido"
            aria-label="Enviar mensagem"
          >
            <SendHorizontal :size="17" aria-hidden="true" />
          </button>
        </div>
        <span
          v-if="restantes <= AVISO_LIMITE"
          :id="idContador"
          class="order-chat__counter"
        >
          {{ restantes }} caracteres restantes
        </span>
      </form>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Lock,
  MessagesSquare,
  RotateCw,
  SendHorizontal,
} from "lucide-vue-next";

import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useChatStore } from "@/stores/chat";
import { useNotificationsStore } from "@/stores/notifications";

// Com a conversa aberta, a resposta precisa aparecer rápido.
const INTERVALO_CONVERSA_MS = 5_000;
// Igual ao CHAT_MENSAGEM_TAMANHO_MAXIMO padrão do backend.
const LIMITE_CARACTERES = 1000;
const AVISO_LIMITE = 150;
// Distância do fim da lista (px) em que ainda consideramos que a pessoa está "no fim".
const MARGEM_FIM_DA_LISTA = 80;

const props = defineProps({
  pedidoId: { type: [Number, String], required: true },
  // "cliente": o lado de lá é a padaria. "admin": o lado de lá é o cliente.
  variante: {
    type: String,
    default: "cliente",
    validator: (valor) => ["cliente", "admin"].includes(valor),
  },
  nomeCliente: { type: String, default: "" },
});

const chat = useChatStore();
const notifications = useNotificationsStore();

const texto = ref("");
const lista = ref(null);
const campo = ref(null);
const noFim = ref(true);
const idCampo = `chat-campo-${props.pedidoId}`;
const idContador = `chat-contador-${props.pedidoId}`;

const conversa = computed(() => chat.conversa(props.pedidoId));
const carregando = computed(() => Boolean(chat.carregando[String(props.pedidoId)]));
const erro = computed(() => chat.erros[String(props.pedidoId)]);
const textoValido = computed(() => texto.value.trim().length > 0);
const restantes = computed(() => LIMITE_CARACTERES - texto.value.length);

const nomeOutroLado = computed(() =>
  props.variante === "admin" ? props.nomeCliente || "Cliente" : "Pires Panificadora",
);
const placeholder = computed(() =>
  props.variante === "admin" ? "Responder ao cliente" : "Escreva para a padaria",
);
const textoVazio = computed(() => {
  if (conversa.value?.somente_leitura) {
    return "Nenhuma mensagem foi trocada neste pedido.";
  }
  return props.variante === "admin"
    ? "Nenhuma mensagem neste pedido ainda. Escreva para avisar o cliente sobre atraso, troca ou retirada."
    : `Alguma dúvida sobre o pedido #${props.pedidoId}? Escreva aqui: a equipe do balcão responde por esta conversa.`;
});

const itens = computed(() => {
  const confirmadas = (conversa.value?.mensagens || []).map((mensagem) => ({
    chave: `m-${mensagem.id}`,
    texto: mensagem.texto,
    criada_em: mensagem.criada_em,
    minha: mensagem.minha,
    lida: Boolean(mensagem.lida_em),
    autor: mensagem.minha ? "Você" : nomeOutroLado.value,
    estado: "enviada",
  }));
  const pendentes = chat.pendentesDe(props.pedidoId).map((pendente) => ({
    chave: pendente.idLocal,
    idLocal: pendente.idLocal,
    texto: pendente.texto,
    criada_em: pendente.criada_em,
    minha: true,
    lida: false,
    autor: "Você",
    estado: pendente.estado,
    erro: pendente.erro,
  }));
  return [...confirmadas, ...pendentes];
});

const { atualizarAgora } = useAutoRefresh(
  () =>
    chat.carregarConversa(props.pedidoId, {
      silencioso: Boolean(conversa.value),
    }),
  { intervalo: INTERVALO_CONVERSA_MS },
);

function recarregar() {
  atualizarAgora();
}

function registrarRolagem() {
  const el = lista.value;
  if (!el) return;
  noFim.value = el.scrollHeight - el.scrollTop - el.clientHeight < MARGEM_FIM_DA_LISTA;
}

function rolarParaOFim() {
  const el = lista.value;
  if (el) el.scrollTop = el.scrollHeight;
}

// Mensagem nova rola a lista só se a pessoa já estava no fim (não atrapalha quem lê o histórico).
watch(
  () => itens.value.length,
  async (atual, anterior) => {
    const primeiraCarga = !anterior;
    if (!primeiraCarga && !noFim.value) return;
    await nextTick();
    rolarParaOFim();
  },
  { flush: "post" },
);

// Conversa aberta e visível: o que chegou do outro lado conta como lido.
watch(
  () => conversa.value?.nao_lidas,
  async (quantidade) => {
    if (!quantidade || document.visibilityState === "hidden") return;
    try {
      const marcadas = await chat.marcarLidas(props.pedidoId);
      // O backend também marca a notificação "nova mensagem" como lida; atualiza o sininho.
      if (marcadas && props.variante === "cliente") {
        notifications.carregar({ force: true, silencioso: true }).catch(() => {});
      }
    } catch {
      // Tenta de novo na próxima atualização da conversa.
    }
  },
  { immediate: true },
);

async function enviar() {
  if (!textoValido.value) return;
  const mensagem = texto.value.trim();
  texto.value = "";
  noFim.value = true;
  await chat.enviar(props.pedidoId, mensagem);
}

function formatarHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date().toDateString() === data.toDateString();
  return new Intl.DateTimeFormat("pt-BR", {
    ...(hoje ? {} : { day: "2-digit", month: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formatarDataCompleta(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

defineExpose({
  focar: () => campo.value?.focus(),
});
</script>

<style scoped>
.order-chat--cliente {
  --chat-surface: var(--student-surface);
  --chat-surface-soft: var(--student-surface-soft);
  --chat-border: var(--student-border);
  --chat-text: var(--student-text);
  --chat-muted: var(--student-muted);
  --chat-accent: var(--student-accent);
  --chat-accent-hover: var(--student-accent-hover);
  --chat-accent-soft: var(--student-accent-soft);
  --chat-danger: var(--student-danger);
  --chat-danger-soft: var(--student-danger-soft);
  --chat-radius: var(--student-radius);
}
.order-chat--admin {
  --chat-surface: var(--admin-surface);
  --chat-surface-soft: var(--admin-surface-subtle);
  --chat-border: var(--admin-border);
  --chat-text: var(--admin-text);
  --chat-muted: var(--admin-muted);
  --chat-accent: var(--admin-accent);
  --chat-accent-hover: var(--admin-accent-hover);
  --chat-accent-soft: var(--admin-accent-soft);
  --chat-danger: var(--admin-danger);
  --chat-danger-soft: var(--admin-danger-soft);
  --chat-radius: var(--admin-radius);
}
.order-chat {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--chat-text);
}
.order-chat__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pp-space-1);
  padding: var(--pp-space-4);
  color: var(--chat-muted);
  font-size: 13px;
  text-align: center;
}
.order-chat__state--error {
  color: var(--chat-danger);
}
.order-chat__state--error strong {
  color: var(--chat-text);
}
.order-chat__spin {
  animation: order-chat-spin 0.8s linear infinite;
}
@keyframes order-chat-spin {
  to {
    transform: rotate(360deg);
  }
}
.order-chat__messages {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: var(--pp-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--pp-space-2);
  overflow-y: auto;
  list-style: none;
  overscroll-behavior: contain;
}
.order-chat__empty {
  margin: auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pp-space-1);
  padding: var(--pp-space-4) var(--pp-space-2);
  color: var(--chat-muted);
  text-align: center;
}
.order-chat__empty p {
  max-width: 280px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
.order-chat__message {
  max-width: 85%;
  align-self: flex-start;
  padding: 9px 12px;
  border: 1px solid var(--chat-border);
  border-radius: var(--chat-radius) var(--chat-radius) var(--chat-radius) 3px;
  background: var(--chat-surface-soft);
}
.order-chat__message.is-mine {
  align-self: flex-end;
  border-color: var(--chat-accent-soft);
  border-radius: var(--chat-radius) var(--chat-radius) 3px var(--chat-radius);
  background: var(--chat-accent-soft);
}
.order-chat__message.is-failed {
  border-color: var(--chat-danger);
  background: var(--chat-danger-soft);
}
.order-chat__author {
  display: block;
  margin-bottom: 2px;
  color: var(--chat-muted);
  font-size: 11px;
  font-weight: 700;
}
.order-chat__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.order-chat__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
  color: var(--chat-muted);
  font-size: 11px;
}
.order-chat__retry {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--pp-space-1);
  margin-top: 6px;
  color: var(--chat-danger);
  font-size: 12px;
}
.order-chat__link-btn {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid var(--chat-border);
  border-radius: var(--pp-radius-sm);
  background: var(--chat-surface);
  color: var(--chat-text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.order-chat__link-btn--muted {
  color: var(--chat-muted);
}
.order-chat__notice {
  display: flex;
  align-items: flex-start;
  gap: var(--pp-space-1);
  margin: 0;
  padding: var(--pp-space-2) var(--pp-space-3);
  border-top: 1px solid var(--chat-border);
  background: var(--chat-surface-soft);
  color: var(--chat-muted);
  font-size: 12px;
  line-height: 1.4;
}
.order-chat__notice svg {
  flex: 0 0 auto;
  margin-top: 1px;
}
.order-chat__composer {
  display: grid;
  gap: 6px;
  padding: var(--pp-space-2) var(--pp-space-3);
  border-top: 1px solid var(--chat-border);
  background: var(--chat-surface);
}
.order-chat__hint,
.order-chat__counter {
  margin: 0;
  color: var(--chat-muted);
  font-size: 11px;
}
.order-chat__field {
  display: flex;
  align-items: flex-end;
  gap: var(--pp-space-1);
}
.order-chat__field textarea {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  max-height: 140px;
  padding: 11px 12px;
  border: 1px solid var(--chat-border);
  border-radius: var(--pp-radius-sm);
  background: var(--chat-surface);
  color: var(--chat-text);
  font: inherit;
  font-size: 16px;
  line-height: 1.35;
  resize: none;
  field-sizing: content;
}
.order-chat__field textarea:focus-visible {
  outline: 2px solid var(--chat-accent);
  outline-offset: 1px;
}
.order-chat__send {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--pp-radius-sm);
  background: var(--chat-accent);
  color: var(--chat-surface);
  cursor: pointer;
}
.order-chat__send:hover:not(:disabled) {
  background: var(--chat-accent-hover);
}
.order-chat__send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.order-chat__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
