import { defineStore } from "pinia";

import notificationService from "@/services/notification.service";
import { createAutoRefresh } from "@/utils/autoRefresh";

let autoRefresh = null;

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({
    itens: [],
    carregando: false,
    inicializado: false,
    erro: null,
    atualizandoSilenciosamente: false,
    ultimaAtualizacao: null,
    erroAtualizacao: null,
  }),

  getters: {
    naoLidas: (state) => state.itens.filter((item) => !item.lida).length,
  },

  actions: {
    async carregar({ force = false, silencioso = false } = {}) {
      if (this.carregando || this.atualizandoSilenciosamente) return;
      if (this.inicializado && !force && !silencioso) return;

      if (silencioso) {
        this.atualizandoSilenciosamente = true;
      } else {
        this.carregando = true;
      }

      this.erro = null;

      try {
        this.itens = await notificationService.listar();
        this.inicializado = true;
      } catch (error) {
        if (!silencioso) {
          this.erro = "Não foi possível carregar suas notificações.";
        }
        throw error;
      } finally {
        this.carregando = false;
        this.atualizandoSilenciosamente = false;
      }
    },

    async marcarLida(id) {
      const atual = this.itens.find((item) => Number(item.id) === Number(id));
      if (!atual || atual.lida) return atual;

      const { data } = await notificationService.marcarLida(id);
      this.itens = this.itens.map((item) =>
        Number(item.id) === Number(id) ? data : item,
      );
      return data;
    },

    async marcarTodasLidas() {
      if (!this.naoLidas) return;

      await notificationService.marcarTodasLidas();
      this.itens = this.itens.map((item) => ({
        ...item,
        lida: true,
      }));
    },

    iniciarPolling(intervaloMs = 30_000) {
      if (!autoRefresh) {
        autoRefresh = createAutoRefresh(
          () =>
            this.carregar({
              force: true,
              silencioso: this.inicializado,
            }),
          {
            intervalo: intervaloMs,
            onEstado: (estado) => {
              this.ultimaAtualizacao = estado.ultimaAtualizacao;
              this.erroAtualizacao = estado.erro;
            },
          },
        );
      }
      autoRefresh.iniciar();
    },

    pararPolling() {
      autoRefresh?.parar();
    },

    atualizarAgora() {
      if (autoRefresh) return autoRefresh.atualizarAgora();
      return this.carregar({ force: true });
    },

    resetar() {
      this.pararPolling();
      autoRefresh = null;
      this.ultimaAtualizacao = null;
      this.erroAtualizacao = null;
      this.itens = [];
      this.carregando = false;
      this.inicializado = false;
      this.erro = null;
      this.atualizandoSilenciosamente = false;
    },
  },
});
