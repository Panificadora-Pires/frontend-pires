import { defineStore } from "pinia";

import { mensagemErroApi } from "@/services/admin.service";
import chatbotService from "@/services/chatbot.service";

// Guarda só o fim da conversa: é ajuda rápida, não histórico permanente.
const MAXIMO_MENSAGENS = 50;

let sequencia = 0;

function proximoId() {
  sequencia += 1;
  return `cb-${sequencia}`;
}

function mensagemDoBot(resposta) {
  return {
    id: proximoId(),
    autor: "bot",
    texto: resposta?.texto || "",
    intencao: resposta?.intencao || "",
    acoes: resposta?.acoes || [],
    pedidos: resposta?.pedidos || [],
    produtos: resposta?.produtos || [],
  };
}

export const useChatbotStore = defineStore("chatbot", {
  state: () => ({
    // { id, autor: "usuario" | "bot", texto, acoes, pedidos, produtos, erro?, pergunta? }
    mensagens: [],
    iniciado: false,
    iniciando: false,
    erroInicio: null,
    respondendo: false,
  }),

  getters: {
    // Só a última resposta mostra botões de próximo passo.
    ultimaMensagemId: (state) => state.mensagens.at(-1)?.id || null,
  },

  actions: {
    async iniciar() {
      if (this.iniciado || this.iniciando) return;
      this.iniciando = true;
      this.erroInicio = null;

      try {
        const { data } = await chatbotService.inicio();
        this._adicionar(mensagemDoBot(data));
        this.iniciado = true;
      } catch (error) {
        this.erroInicio = mensagemErroApi(
          error,
          "Não foi possível abrir o assistente. Verifique sua conexão.",
        );
      } finally {
        this.iniciando = false;
      }
    },

    // `rotulo` é o que aparece como fala do cliente quando ele toca em um botão.
    async perguntar({ texto = "", intencao = "", rotulo = "" } = {}) {
      const pergunta = intencao ? { intencao } : { texto: texto.trim() };
      if (!pergunta.intencao && !pergunta.texto) return;

      this._adicionar({
        id: proximoId(),
        autor: "usuario",
        texto: intencao ? rotulo || intencao : pergunta.texto,
      });
      await this._consultar(pergunta);
    },

    async repetir(idMensagemErro) {
      const falha = this.mensagens.find((m) => m.id === idMensagemErro);
      if (!falha?.pergunta || this.respondendo) return;

      this.mensagens = this.mensagens.filter((m) => m.id !== idMensagemErro);
      await this._consultar(falha.pergunta);
    },

    async _consultar(pergunta) {
      this.respondendo = true;
      try {
        const { data } = await chatbotService.enviar(pergunta);
        this._adicionar(mensagemDoBot(data));
      } catch (error) {
        this._adicionar({
          id: proximoId(),
          autor: "bot",
          erro: true,
          pergunta,
          texto:
            error?.response?.status === 429
              ? "Muitas perguntas seguidas. Aguarde um pouco e tente de novo."
              : mensagemErroApi(error, "Não consegui responder agora. Verifique sua conexão."),
        });
      } finally {
        this.respondendo = false;
      }
    },

    _adicionar(mensagem) {
      this.mensagens = [...this.mensagens, mensagem].slice(-MAXIMO_MENSAGENS);
    },

    resetar() {
      this.mensagens = [];
      this.iniciado = false;
      this.iniciando = false;
      this.erroInicio = null;
      this.respondendo = false;
    },
  },
});
