import { defineStore } from "pinia";

import orderService from "@/services/order.service";

// Compartilha o resultado real entre polling, navegação e atualizações do layout.
const carregamentos = new WeakMap();

export const useOrdersStore = defineStore("orders", {
  state: () => ({
    itens: [],
    carregando: false,
    atualizandoSilenciosamente: false,
    inicializado: false,
    erro: null,
  }),

  getters: {
    emAndamento: (state) =>
      state.itens.filter((pedido) =>
        ["pendente", "confirmado", "pronto"].includes(pedido.status),
      ),

    finalizados: (state) =>
      state.itens.filter((pedido) =>
        ["retirado", "cancelado"].includes(pedido.status),
      ),

    prontos: (state) =>
      state.itens.filter((pedido) => pedido.status === "pronto"),
  },

  actions: {
    async carregar({ force = false, silencioso = false } = {}) {
      if (carregamentos.has(this)) return carregamentos.get(this).promise;
      if (this.inicializado && !force && !silencioso) return;

      const requisicao = { promise: null };
      carregamentos.set(this, requisicao);

      if (silencioso) {
        this.atualizandoSilenciosamente = true;
      } else {
        this.carregando = true;
      }

      this.erro = null;

      requisicao.promise = (async () => {
        try {
          const itens = await orderService.listar();
          if (carregamentos.get(this) !== requisicao) return;
          this.itens = itens;
          this.inicializado = true;
        } catch (error) {
          if (carregamentos.get(this) !== requisicao) return;
          if (!silencioso) {
            this.erro = "Não foi possível carregar seus pedidos.";
          }
          throw error;
        } finally {
          if (carregamentos.get(this) === requisicao) {
            carregamentos.delete(this);
            this.carregando = false;
            this.atualizandoSilenciosamente = false;
          }
        }
      })();
      return requisicao.promise;
    },

    async buscarPorId(id) {
      const existente = this.itens.find(
        (pedido) => Number(pedido.id) === Number(id),
      );

      if (existente) return existente;

      const { data } = await orderService.obter(id);
      return data;
    },

    resetar() {
      carregamentos.delete(this);
      this.itens = [];
      this.carregando = false;
      this.atualizandoSilenciosamente = false;
      this.inicializado = false;
      this.erro = null;
    },
  },
});
