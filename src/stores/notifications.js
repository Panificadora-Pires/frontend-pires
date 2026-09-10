import { defineStore } from "pinia";

import notificationService from "@/services/notification.service";

let pollingTimer = null;

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({
    itens: [],
    carregando: false,
    inicializado: false,
    erro: null,
    atualizandoSilenciosamente: false,
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
      this.carregar({ force: !this.inicializado }).catch(() => {});

      if (pollingTimer) return;

      pollingTimer = window.setInterval(() => {
        this.carregar({
          force: true,
          silencioso: true,
        }).catch(() => {});
      }, intervaloMs);
    },

    pararPolling() {
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    },

    resetar() {
      this.pararPolling();
      this.itens = [];
      this.carregando = false;
      this.inicializado = false;
      this.erro = null;
      this.atualizandoSilenciosamente = false;
    },
  },
});
