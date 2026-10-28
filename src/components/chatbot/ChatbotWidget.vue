<template>
  <div class="chatbot" :class="{ 'is-open': aberto }">
    <section
      v-if="aberto"
      id="chatbot-painel"
      class="chatbot__painel"
      role="dialog"
      aria-labelledby="chatbot-titulo"
      @keydown.esc="fechar"
    >
      <header class="chatbot__topo">
        <img
          class="chatbot__logo"
          src="/logo.png"
          alt=""
          aria-hidden="true"
        />
        <div class="chatbot__topo-texto">
          <h2 id="chatbot-titulo">Dúvidas sobre o pedido?</h2>
          <p>Respostas rápidas da Pires. Para falar com a equipe, use o chat do pedido.</p>
        </div>
        <button
          type="button"
          class="chatbot__fechar"
          aria-label="Fechar assistente"
          @click="fechar"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </header>

      <div
        v-if="!chatbot.iniciado && chatbot.iniciando"
        class="chatbot__estado"
        aria-live="polite"
      >
        <LoaderCircle :size="20" class="chatbot__spin" aria-hidden="true" />
        Abrindo o assistente...
      </div>

      <div
        v-else-if="!chatbot.iniciado && chatbot.erroInicio"
        class="chatbot__estado chatbot__estado--erro"
        role="alert"
      >
        <CircleAlert :size="20" aria-hidden="true" />
        <span>{{ chatbot.erroInicio }}</span>
        <button type="button" class="chatbot__tentar" @click="chatbot.iniciar()">
          Tentar novamente
        </button>
      </div>

      <ol
        v-else
        ref="lista"
        class="chatbot__mensagens"
        role="log"
        aria-live="polite"
        aria-label="Conversa com o assistente"
      >
        <ChatbotMensagem
          v-for="mensagem in chatbot.mensagens"
          :key="mensagem.id"
          :mensagem="mensagem"
          :mostrar-acoes="mensagem.id === chatbot.ultimaMensagemId && !chatbot.respondendo"
          @acao="executarAcao"
          @repetir="chatbot.repetir"
        />
        <li v-if="chatbot.respondendo" class="chatbot__digitando">
          <span class="chatbot__pontos" aria-hidden="true"><i /><i /><i /></span>
          <span class="chatbot__sr">Assistente respondendo...</span>
        </li>
      </ol>

      <form class="chatbot__form" @submit.prevent="enviar">
        <label for="chatbot-campo" class="chatbot__sr">Sua pergunta</label>
        <input
          id="chatbot-campo"
          ref="campo"
          v-model="texto"
          type="text"
          :maxlength="TAMANHO_MAXIMO"
          autocomplete="off"
          placeholder="Ex.: tem coxinha?"
          :disabled="!chatbot.iniciado"
        />
        <button
          type="submit"
          class="chatbot__enviar"
          :disabled="!podeEnviar"
          aria-label="Enviar pergunta"
        >
          <SendHorizontal :size="17" aria-hidden="true" />
        </button>
      </form>
    </section>

    <button
      ref="botao"
      type="button"
      class="chatbot__botao"
      :aria-expanded="aberto"
      aria-controls="chatbot-painel"
      :aria-label="aberto ? 'Fechar assistente de dúvidas' : 'Abrir assistente de dúvidas'"
      @click="alternar"
    >
      <X v-if="aberto" :size="22" aria-hidden="true" />
      <MessageCircleQuestion v-else :size="22" aria-hidden="true" />
      <span class="chatbot__botao-texto">{{ aberto ? "Fechar" : "Dúvidas?" }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, shallowRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import {
  CircleAlert,
  LoaderCircle,
  MessageCircleQuestion,
  SendHorizontal,
  X,
} from "lucide-vue-next";

import ChatbotMensagem from "@/components/chatbot/ChatbotMensagem.vue";
import { useChatbotStore } from "@/stores/chatbot";

// Igual ao limite do backend (TAMANHO_MAXIMO_PERGUNTA).
const TAMANHO_MAXIMO = 300;
// Rotas para as quais o assistente pode levar o cliente.
const ROTAS_PERMITIDAS = new Set(["cardapio", "pedidos"]);

const chatbot = useChatbotStore();
const router = useRouter();

const aberto = shallowRef(false);
const texto = shallowRef("");
const lista = useTemplateRef("lista");
const campo = useTemplateRef("campo");
const botao = useTemplateRef("botao");

const podeEnviar = computed(
  () => chatbot.iniciado && !chatbot.respondendo && texto.value.trim().length > 0,
);

async function abrir() {
  aberto.value = true;
  // O campo fica desabilitado até a saudação chegar; o foco vai para ele depois disso.
  await chatbot.iniciar();
  await nextTick();
  campo.value?.focus();
  rolarParaOFim();
}

function fechar() {
  aberto.value = false;
  nextTick(() => botao.value?.focus());
}

function alternar() {
  if (aberto.value) {
    fechar();
  } else {
    abrir();
  }
}

function enviar() {
  if (!podeEnviar.value) return;
  const pergunta = texto.value;
  texto.value = "";
  chatbot.perguntar({ texto: pergunta });
}

function executarAcao(acao) {
  if (acao.tipo === "intencao") {
    chatbot.perguntar({ intencao: acao.valor, rotulo: acao.rotulo });
    return;
  }

  if (acao.tipo === "chat") {
    aberto.value = false;
    router.push({ name: "pedidos", query: { chat: String(acao.pedido) } });
    return;
  }

  if (acao.tipo === "rota" && ROTAS_PERMITIDAS.has(acao.rota)) {
    aberto.value = false;
    router.push({ name: acao.rota });
  }
}

function rolarParaOFim() {
  const el = lista.value;
  if (el) el.scrollTop = el.scrollHeight;
}

// Toda mensagem nova (e o "digitando") leva a conversa para o fim.
watch(
  () => [chatbot.mensagens.length, chatbot.respondendo],
  () => nextTick(rolarParaOFim),
);
</script>

<style scoped>
.chatbot {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 70;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--pp-space-2);
  pointer-events: none;
}
.chatbot > * {
  pointer-events: auto;
}
.chatbot__botao {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: var(--pp-space-1);
  padding: 0 18px 0 14px;
  border: 2px solid var(--pp-gold);
  border-radius: var(--pp-radius-full);
  background: var(--pp-bg-dark);
  color: var(--pp-cream);
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--pp-shadow-soft);
  cursor: pointer;
  transition: transform 0.18s ease;
}
.chatbot__botao:hover {
  transform: translateY(-2px);
}
.chatbot__botao svg {
  color: var(--pp-gold);
}
.chatbot__painel {
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100dvh - 120px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-card);
  background: var(--student-bg);
  box-shadow: var(--pp-shadow-soft);
  animation: chatbot-entrar 0.2s ease-out;
}
@keyframes chatbot-entrar {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
.chatbot__topo {
  display: flex;
  align-items: flex-start;
  gap: var(--pp-space-2);
  padding: var(--pp-space-3);
  border-bottom: 3px solid var(--pp-gold);
  background: var(--pp-bg-dark);
  color: var(--pp-cream);
}
.chatbot__logo {
  width: 56px;
  height: 40px;
  flex: 0 0 auto;
  object-fit: contain;
}
.chatbot__topo-texto {
  flex: 1;
  min-width: 0;
}
.chatbot__topo h2 {
  margin: 0;
  color: var(--pp-cream);
  font-family: var(--pp-font-display);
  font-size: 18px;
  letter-spacing: 0;
}
.chatbot__topo p {
  margin: 3px 0 0;
  color: var(--pp-cream-dim);
  font-size: 12px;
  line-height: 1.4;
}
.chatbot__fechar {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--pp-border-soft);
  border-radius: 50%;
  background: transparent;
  color: var(--pp-cream);
  cursor: pointer;
}
.chatbot__estado {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pp-space-1);
  padding: var(--pp-space-4);
  color: var(--student-muted);
  font-size: 13px;
  text-align: center;
}
.chatbot__estado--erro {
  color: var(--student-danger);
}
.chatbot__tentar {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: var(--student-radius-sm);
  background: var(--student-surface);
  color: var(--student-text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.chatbot__spin {
  animation: chatbot-girar 0.8s linear infinite;
}
@keyframes chatbot-girar {
  to {
    transform: rotate(360deg);
  }
}
.chatbot__mensagens {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--pp-space-2);
  margin: 0;
  padding: var(--pp-space-3);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}
.chatbot__digitando {
  align-self: flex-start;
  padding: 12px 14px;
  border: 1px solid var(--student-border);
  border-radius: 4px var(--student-radius) var(--student-radius) var(--student-radius);
  background: var(--student-surface);
}
.chatbot__pontos {
  display: flex;
  gap: 4px;
}
.chatbot__pontos i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--student-muted-2);
  animation: chatbot-ponto 1s ease-in-out infinite;
}
.chatbot__pontos i:nth-child(2) {
  animation-delay: 0.15s;
}
.chatbot__pontos i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes chatbot-ponto {
  50% {
    opacity: 0.3;
    transform: translateY(-3px);
  }
}
.chatbot__form {
  display: flex;
  gap: var(--pp-space-1);
  padding: var(--pp-space-2);
  border-top: 1px solid var(--student-border);
  background: var(--student-surface);
}
.chatbot__form input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: var(--student-radius-sm);
  background: var(--student-surface);
  color: var(--student-text);
  font: inherit;
  font-size: 16px;
}
.chatbot__form input:focus-visible {
  outline: 2px solid var(--student-accent);
  outline-offset: 1px;
}
.chatbot__enviar {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--student-radius-sm);
  background: var(--student-accent-hover);
  color: var(--student-surface);
  cursor: pointer;
}
.chatbot__enviar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.chatbot__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Celular: o botão fica acima da navegação inferior e o painel ocupa a tela toda. */
@media (max-width: 980px) {
  .chatbot {
    right: 14px;
    bottom: calc(64px + 14px + env(safe-area-inset-bottom));
  }
  .chatbot__botao {
    width: 52px;
    height: 52px;
    justify-content: center;
    padding: 0;
  }
  .chatbot__botao-texto {
    display: none;
  }
  .chatbot.is-open .chatbot__botao {
    display: none;
  }
  .chatbot__painel {
    position: fixed;
    inset: 0;
    z-index: 130;
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }
}
</style>
