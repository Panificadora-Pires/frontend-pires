import { defineStore } from "pinia";

import { mensagemErroApi } from "@/services/admin.service";
import chatService from "@/services/chat.service";
import { createAutoRefresh } from "@/utils/autoRefresh";

let autoRefreshNaoLidas = null;
let sequenciaLocal = 0;

function chave(pedidoId) {
  return String(pedidoId);
}

// Uma busca que começou antes de um envio pode chegar sem a mensagem recém-enviada:
// mantém as mensagens locais mais novas que a última recebida do servidor.
function mesclarMensagens(recebidas, locais = []) {
  const ultimoId = recebidas.reduce((maior, m) => Math.max(maior, Number(m.id)), 0);
  const novasLocais = locais.filter((m) => Number(m.id) > ultimoId);
  return [...recebidas, ...novasLocais];
}

export const useChatStore = defineStore("chat", {
  state: () => ({
    // pedidoId -> { pedido, status_pedido, somente_leitura, encerra_em, nao_lidas, mensagens }
    conversas: {},
    // pedidoId -> [{ idLocal, texto, criada_em, estado: "enviando" | "erro", erro }]
    pendentes: {},
    carregando: {},
    erros: {},
    naoLidas: { total: 0, porPedido: {} },
    naoLidasInicializado: false,
  }),

  getters: {
    conversa: (state) => (pedidoId) => state.conversas[chave(pedidoId)] || null,
    pendentesDe: (state) => (pedidoId) => state.pendentes[chave(pedidoId)] || [],
    naoLidasDoPedido: (state) => (pedidoId) =>
      state.naoLidas.porPedido[chave(pedidoId)] || 0,
    pedidosComNaoLidas: (state) => Object.keys(state.naoLidas.porPedido).length,
  },

  actions: {
    async carregarConversa(pedidoId, { silencioso = false } = {}) {
      const id = chave(pedidoId);

      if (!silencioso) {
        this.carregando[id] = true;
        this.erros[id] = null;
      }

      try {
        const { data } = await chatService.obter(pedidoId);
        const anterior = this.conversas[id];
        this.conversas[id] = {
          ...data,
          mensagens: mesclarMensagens(data.mensagens || [], anterior?.mensagens),
        };
        this.erros[id] = null;
        this._definirNaoLidas(id, data.nao_lidas);
        return this.conversas[id];
      } catch (error) {
        // Falha em segundo plano não apaga a conversa já exibida.
        if (!this.conversas[id]) {
          this.erros[id] = mensagemErroApi(
            error,
            "Não foi possível carregar a conversa.",
          );
        }
        throw error;
      } finally {
        this.carregando[id] = false;
      }
    },

    async enviar(pedidoId, texto) {
      const id = chave(pedidoId);
      sequenciaLocal += 1;
      const pendente = {
        idLocal: `local-${sequenciaLocal}`,
        texto,
        criada_em: new Date().toISOString(),
        estado: "enviando",
        erro: "",
      };
      this.pendentes[id] = [...(this.pendentes[id] || []), pendente];

      return this._enviarPendente(pedidoId, pendente.idLocal);
    },

    async reenviar(pedidoId, idLocal) {
      const pendente = this._pendente(pedidoId, idLocal);
      if (!pendente || pendente.estado === "enviando") return false;

      pendente.estado = "enviando";
      pendente.erro = "";
      return this._enviarPendente(pedidoId, idLocal);
    },

    descartar(pedidoId, idLocal) {
      const id = chave(pedidoId);
      this.pendentes[id] = (this.pendentes[id] || []).filter(
        (item) => item.idLocal !== idLocal,
      );
    },

    async _enviarPendente(pedidoId, idLocal) {
      const id = chave(pedidoId);
      const pendente = this._pendente(pedidoId, idLocal);

      try {
        const { data } = await chatService.enviar(pedidoId, pendente.texto);
        this.descartar(pedidoId, idLocal);

        const conversa = this.conversas[id];
        if (conversa && !conversa.mensagens.some((m) => m.id === data.id)) {
          conversa.mensagens = [...conversa.mensagens, data];
        }
        return true;
      } catch (error) {
        const atual = this._pendente(pedidoId, idLocal);
        if (atual) {
          atual.estado = "erro";
          atual.erro =
            error?.response?.status === 429
              ? "Muitas mensagens seguidas. Aguarde um pouco e tente de novo."
              : mensagemErroApi(error, "Não foi possível enviar. Verifique sua conexão.");
        }

        // Chat encerrado enquanto a tela estava aberta: busca a situação nova.
        if (error?.response?.status === 400) {
          this.carregarConversa(pedidoId, { silencioso: true }).catch(() => {});
        }
        return false;
      }
    },

    _pendente(pedidoId, idLocal) {
      return (this.pendentes[chave(pedidoId)] || []).find(
        (item) => item.idLocal === idLocal,
      );
    },

    async marcarLidas(pedidoId) {
      const id = chave(pedidoId);
      const conversa = this.conversas[id];
      if (!conversa?.nao_lidas && !this.naoLidas.porPedido[id]) return 0;

      const { data } = await chatService.marcarLidas(pedidoId);
      if (conversa) conversa.nao_lidas = 0;
      this._definirNaoLidas(id, 0);
      return data?.marcadas || 0;
    },

    _definirNaoLidas(id, quantidade) {
      const porPedido = { ...this.naoLidas.porPedido };
      if (quantidade > 0) {
        porPedido[id] = quantidade;
      } else {
        delete porPedido[id];
      }
      this.naoLidas = {
        total: Object.values(porPedido).reduce((soma, n) => soma + n, 0),
        porPedido,
      };
    },

    async carregarNaoLidas() {
      const { data } = await chatService.naoLidas();
      const porPedido = {};
      for (const item of data?.por_pedido || []) {
        porPedido[chave(item.pedido)] = Number(item.nao_lidas) || 0;
      }
      this.naoLidas = { total: Number(data?.total) || 0, porPedido };
      this.naoLidasInicializado = true;
    },

    iniciarPollingNaoLidas(intervaloMs = 30_000) {
      if (!autoRefreshNaoLidas) {
        autoRefreshNaoLidas = createAutoRefresh(() => this.carregarNaoLidas(), {
          intervalo: intervaloMs,
        });
      }
      autoRefreshNaoLidas.iniciar();
    },

    pararPollingNaoLidas() {
      autoRefreshNaoLidas?.parar();
    },

    resetar() {
      this.pararPollingNaoLidas();
      autoRefreshNaoLidas = null;
      this.conversas = {};
      this.pendentes = {};
      this.carregando = {};
      this.erros = {};
      this.naoLidas = { total: 0, porPedido: {} };
      this.naoLidasInicializado = false;
    },
  },
});
