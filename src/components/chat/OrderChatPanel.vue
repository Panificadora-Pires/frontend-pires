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
            <time :datetime="item.criada_em">{{
              formatarHora(item.criada_em)
            }}</time>
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
            :aria-describedby="
              restantes <= AVISO_LIMITE ? idContador : undefined
            "
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
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
import { REALTIME_ENABLED, realtimeClient } from "@/services/realtime";
import { formatarDataCompleta, formatarHora } from "@/utils/chat";

const INTERVALO_CONVERSA_MS = 5_000;
const LIMITE_CARACTERES = 1000;
const AVISO_LIMITE = 150;
const MARGEM_FIM_DA_LISTA = 80;

const props = defineProps({
  pedidoId: { type: [Number, String], required: true },
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
const carregando = computed(() =>
  Boolean(chat.carregando[String(props.pedidoId)]),
);
const erro = computed(() => chat.erros[String(props.pedidoId)]);
const textoValido = computed(() => texto.value.trim().length > 0);
const restantes = computed(() => LIMITE_CARACTERES - texto.value.length);

const nomeOutroLado = computed(() =>
  props.variante === "admin"
    ? props.nomeCliente || "Cliente"
    : "Pires Panificadora",
);
const placeholder = computed(() =>
  props.variante === "admin"
    ? "Responder ao cliente"
    : "Escreva para a padaria",
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

let desinscreverRealtime = null;
let timerRealtime = null;

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

onMounted(() => {
  if (!REALTIME_ENABLED) return;
  desinscreverRealtime = realtimeClient.inscrever((evento) => {
    if (evento) {
      const tipoRelevante =
        evento.tipo.startsWith("chat.") || evento.tipo.startsWith("pedido.");
      if (!tipoRelevante || Number(evento.pedido_id) !== Number(props.pedidoId))
        return;
    }
    if (timerRealtime !== null) return;
    timerRealtime = setTimeout(() => {
      timerRealtime = null;
      void atualizarAgora();
    }, 400);
  });
});
onBeforeUnmount(() => {
  desinscreverRealtime?.();
  desinscreverRealtime = null;
  if (timerRealtime !== null) clearTimeout(timerRealtime);
  timerRealtime = null;
});

function registrarRolagem() {
  const el = lista.value;
  if (!el) return;
  noFim.value =
    el.scrollHeight - el.scrollTop - el.clientHeight < MARGEM_FIM_DA_LISTA;
}

function rolarParaOFim() {
  const el = lista.value;
  if (el) el.scrollTop = el.scrollHeight;
}

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

watch(
  () => conversa.value?.nao_lidas,
  async (quantidade) => {
    if (!quantidade || document.visibilityState === "hidden") return;
    try {
      const marcadas = await chat.marcarLidas(props.pedidoId);
      if (marcadas && props.variante === "cliente") {
        notifications
          .carregar({ force: true, silencioso: true })
          .catch(() => {});
      }
    } catch {}
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

defineExpose({
  focar: () => campo.value?.focus(),
});
</script>

<style scoped src="./OrderChatPanel.css"></style>
