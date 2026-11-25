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
        <img class="chatbot__logo" src="/logo.png" alt="" aria-hidden="true" />
        <div class="chatbot__topo-texto">
          <h2 id="chatbot-titulo">Dúvidas sobre o pedido?</h2>
          <p>
            Respostas rápidas da Pires. Para falar com a equipe, use o chat do
            pedido.
          </p>
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
        <button
          type="button"
          class="chatbot__tentar"
          @click="chatbot.iniciar()"
        >
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
          :mostrar-acoes="
            mensagem.id === chatbot.ultimaMensagemId && !chatbot.respondendo
          "
          @acao="executarAcao"
          @repetir="chatbot.repetir"
        />
        <li v-if="chatbot.respondendo" class="chatbot__digitando">
          <span class="chatbot__pontos" aria-hidden="true"
            ><i /><i /><i
          /></span>
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
      :aria-label="
        aberto ? 'Fechar assistente de dúvidas' : 'Abrir assistente de dúvidas'
      "
      @click="alternar"
    >
      <X v-if="aberto" :size="22" aria-hidden="true" />
      <MessageCircleQuestion v-else :size="22" aria-hidden="true" />
      <span class="chatbot__botao-texto">{{
        aberto ? "Fechar" : "Dúvidas?"
      }}</span>
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

const TAMANHO_MAXIMO = 300;
const ROTAS_PERMITIDAS = new Set(["cardapio", "pedidos"]);

const chatbot = useChatbotStore();
const router = useRouter();

const aberto = shallowRef(false);
const texto = shallowRef("");
const lista = useTemplateRef("lista");
const campo = useTemplateRef("campo");
const botao = useTemplateRef("botao");

const podeEnviar = computed(
  () =>
    chatbot.iniciado && !chatbot.respondendo && texto.value.trim().length > 0,
);

async function abrir() {
  aberto.value = true;
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

watch(
  () => [chatbot.mensagens.length, chatbot.respondendo],
  () => nextTick(rolarParaOFim),
);
</script>

<style scoped src="./ChatbotWidget.css"></style>
