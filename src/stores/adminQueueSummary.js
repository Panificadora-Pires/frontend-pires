import { defineStore } from "pinia";

import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { createAutoRefresh } from "@/utils/autoRefresh";

const INTERVALO_RESUMO_MS = 15_000;
const emAndamento = new WeakMap();
const controles = new WeakMap();

export const useAdminQueueSummaryStore = defineStore("adminQueueSummary", {
  state: () => ({
    resumo: null,
    inicializado: false,
    carregando: false,
    erro: null,
    ultimaAtualizacao: null,
    geracao: 0,
  }),
  getters: {
    aguardandoAcao: (state) =>
      state.resumo ? state.resumo.pendentes + state.resumo.prontos : null,
  },
  actions: {
    carregar() {
      const anterior = emAndamento.get(this);
      if (anterior) return anterior;
      const geracao = this.geracao;
      const sessao = getSessionVersion();
      this.carregando = true;
      this.erro = null;

      const promessa = (async () => {
        try {
          const resposta = await adminService.resumoPedidosAdmin();
          if (this.geracao !== geracao || getSessionVersion() !== sessao)
            return;
          this.resumo = resposta;
          this.inicializado = true;
          this.ultimaAtualizacao = new Date();
        } catch (error) {
          if (this.geracao !== geracao || getSessionVersion() !== sessao)
            return;
          this.erro = "Não foi possível sincronizar os totais de pedidos.";
          throw error;
        } finally {
          if (this.geracao === geracao && emAndamento.get(this) === promessa) {
            this.carregando = false;
            emAndamento.delete(this);
          }
        }
      })();
      emAndamento.set(this, promessa);
      return promessa;
    },
    iniciarAutoAtualizacao() {
      let controle = controles.get(this);
      if (!controle) {
        controle = createAutoRefresh(() => this.carregar(), {
          intervalo: INTERVALO_RESUMO_MS,
        });
        controles.set(this, controle);
      }
      controle.iniciar();
    },
    pararAutoAtualizacao() {
      controles.get(this)?.parar();
    },
    atualizarAgora() {
      const controle = controles.get(this);
      return controle ? controle.atualizarAgora() : this.carregar();
    },
    resetar() {
      this.pararAutoAtualizacao();
      controles.delete(this);
      emAndamento.delete(this);
      const proximaGeracao = this.geracao + 1;
      this.$reset();
      this.geracao = proximaGeracao;
    },
  },
});
