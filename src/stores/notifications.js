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
    idsEmLeitura: [],
    marcandoTodas: false,
    geracaoSessao: 0,
  }),

  getters: {
    naoLidas: (state) => state.itens.filter((item) => !item.lida).length,
  },

  actions: {
    async carregar({ force = false, silencioso = false } = {}) {
      if (this.carregando || this.atualizandoSilenciosamente) return;
      if (this.inicializado && !force && !silencioso) return;
      const geracao = this.geracaoSessao;

      if (silencioso) {
        this.atualizandoSilenciosamente = true;
      } else {
        this.carregando = true;
      }

      this.erro = null;

      try {
        const recebidas = await notificationService.listar();
        if (geracao !== this.geracaoSessao) return;
        // Leitura é monotônica neste contrato: não existe marcar novamente como não lida.
        // Um GET iniciado antes do PATCH não pode desfazer uma confirmação posterior.
        const lidas = new Set(
          this.itens.filter((item) => item.lida).map((item) => String(item.id)),
        );
        const unicas = new Map();
        for (const item of recebidas) {
          const id = String(item.id);
          if (!unicas.has(id))
            unicas.set(id, {
              ...item,
              lida: Boolean(item.lida || lidas.has(id)),
            });
          else if (item.lida) unicas.get(id).lida = true;
        }
        this.itens = [...unicas.values()];
        this.inicializado = true;
        this.ultimaAtualizacao = new Date();
        this.erroAtualizacao = null;
      } catch (error) {
        if (geracao !== this.geracaoSessao) return;
        if (!silencioso) {
          this.erro = "Não foi possível carregar suas notificações.";
        } else
          this.erroAtualizacao =
            "Não foi possível sincronizar suas notificações.";
        throw error;
      } finally {
        if (geracao === this.geracaoSessao) {
          this.carregando = false;
          this.atualizandoSilenciosamente = false;
        }
      }
    },

    async marcarLida(id) {
      const atual = this.itens.find((item) => Number(item.id) === Number(id));
      if (
        !atual ||
        atual.lida ||
        this.marcandoTodas ||
        this.idsEmLeitura.includes(String(id))
      )
        return false;
      const geracao = this.geracaoSessao;
      this.idsEmLeitura.push(String(id));
      try {
        const { data } = await notificationService.marcarLida(id);
        if (geracao !== this.geracaoSessao) return false;
        if (String(data?.id) !== String(id) || data?.lida !== true)
          throw new Error("A API não confirmou a leitura.");
        this.itens = this.itens.map((item) =>
          String(item.id) === String(id) ? { ...item, ...data } : item,
        );
        return data;
      } finally {
        if (geracao === this.geracaoSessao)
          this.idsEmLeitura = this.idsEmLeitura.filter(
            (item) => item !== String(id),
          );
      }
    },

    async marcarTodasLidas() {
      if (!this.naoLidas || this.marcandoTodas || this.idsEmLeitura.length)
        return false;
      const geracao = this.geracaoSessao;
      const ids = new Set(
        this.itens.filter((item) => !item.lida).map((item) => String(item.id)),
      );
      this.marcandoTodas = true;
      try {
        await notificationService.marcarTodasLidas();
        if (geracao !== this.geracaoSessao) return false;
        // A resposta não informa corte temporal. Não confirmar avisos que chegaram durante o POST.
        this.itens = this.itens.map((item) =>
          ids.has(String(item.id)) ? { ...item, lida: true } : item,
        );
        return true;
      } finally {
        if (geracao === this.geracaoSessao) this.marcandoTodas = false;
      }
    },

    iniciarPolling(intervaloMs = 30_000) {
      if (!autoRefresh) {
        const geracao = this.geracaoSessao;
        autoRefresh = createAutoRefresh(
          () =>
            this.carregar({
              force: true,
              silencioso: this.inicializado,
            }),
          {
            intervalo: intervaloMs,
            onEstado: (estado) => {
              if (geracao !== this.geracaoSessao) return;
              this.ultimaAtualizacao = estado.ultimaAtualizacao;
              this.erroAtualizacao = estado.erro
                ? "Não foi possível sincronizar suas notificações."
                : null;
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
      this.geracaoSessao += 1;
      this.pararPolling();
      autoRefresh = null;
      this.ultimaAtualizacao = null;
      this.erroAtualizacao = null;
      this.itens = [];
      this.carregando = false;
      this.inicializado = false;
      this.erro = null;
      this.atualizandoSilenciosamente = false;
      this.idsEmLeitura = [];
      this.marcandoTodas = false;
    },
  },
});
