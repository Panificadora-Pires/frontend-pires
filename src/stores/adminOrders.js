import { defineStore } from "pinia";

import adminService from "@/services/admin.service";
import { createAutoRefresh } from "@/utils/autoRefresh";

// A fila do balcão muda rápido no intervalo; 15 s mantém menu, dashboard e fila em dia.
const INTERVALO_FILA_MS = 15_000;

let autoRefresh = null;
let carregamentoAtual = null;

function ordenarPorDataDesc(lista) {
  return [...lista].sort(
    (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime(),
  );
}

function momento(pedido) {
  return new Date(pedido?.status_atualizado_em || 0).getTime();
}

// Uma busca iniciada antes de uma mudança de status pode chegar depois dela;
// nesse caso, mantém a versão local mais recente em vez de voltar o status.
function mesclarComLocais(recebidos, locais) {
  const locaisPorId = new Map(locais.map((pedido) => [Number(pedido.id), pedido]));
  return recebidos.map((pedido) => {
    const local = locaisPorId.get(Number(pedido.id));
    return local && momento(local) > momento(pedido) ? local : pedido;
  });
}

export const useAdminOrdersStore = defineStore("adminOrders", {
  state: () => ({
    itens: [],
    carregando: false,
    inicializado: false,
    erro: null,
    atualizando: false,
    ultimaAtualizacao: null,
    erroAtualizacao: null,
  }),

  getters: {
    pendentes: (state) =>
      state.itens.filter((pedido) => pedido.status === "pendente"),
    confirmados: (state) =>
      state.itens.filter((pedido) => pedido.status === "confirmado"),
    prontos: (state) =>
      state.itens.filter((pedido) => pedido.status === "pronto"),
    // Pedidos que pedem ação do balcão (aparecem no badge do menu).
    aguardandoAcao() {
      return this.pendentes.length + this.prontos.length;
    },
    porId: (state) => (id) =>
      state.itens.find((pedido) => Number(pedido.id) === Number(id)) || null,
  },

  actions: {
    async carregar({ silencioso = false } = {}) {
      if (carregamentoAtual) return carregamentoAtual;

      if (!silencioso) {
        this.carregando = true;
        this.erro = null;
      }

      carregamentoAtual = (async () => {
        try {
          const recebidos = await adminService.listarPedidos();
          this.itens = ordenarPorDataDesc(mesclarComLocais(recebidos, this.itens));
          this.inicializado = true;
          this.erro = null;
        } catch (error) {
          // Atualização silenciosa não apaga a lista que já está na tela.
          if (!silencioso || !this.inicializado) {
            this.erro = "Não foi possível carregar os pedidos.";
          }
          throw error;
        } finally {
          this.carregando = false;
          carregamentoAtual = null;
        }
      })();

      return carregamentoAtual;
    },

    // Atualiza (ou insere) um pedido na lista local sem buscar tudo de novo.
    substituirPedido(pedido) {
      if (!pedido?.id) return;

      const indice = this.itens.findIndex(
        (item) => Number(item.id) === Number(pedido.id),
      );

      if (indice === -1) {
        this.itens = ordenarPorDataDesc([pedido, ...this.itens]);
      } else {
        this.itens.splice(indice, 1, { ...this.itens[indice], ...pedido });
      }
    },

    async alterarStatus(id, status) {
      const pedido = await adminService.alterarStatusPedido(id, status);
      this.substituirPedido(pedido);
      return pedido;
    },

    async obterPedido(id) {
      const pedido = await adminService.obterPedido(id);
      this.substituirPedido(pedido);
      return pedido;
    },

    iniciarAutoAtualizacao() {
      if (!autoRefresh) {
        autoRefresh = createAutoRefresh(
          () => this.carregar({ silencioso: this.inicializado }),
          {
            intervalo: INTERVALO_FILA_MS,
            onEstado: (estado) => {
              this.atualizando = estado.atualizando;
              this.ultimaAtualizacao = estado.ultimaAtualizacao;
              this.erroAtualizacao = estado.erro;
            },
          },
        );
      }
      autoRefresh.iniciar();
    },

    pararAutoAtualizacao() {
      autoRefresh?.parar();
    },

    atualizarAgora() {
      if (autoRefresh) return autoRefresh.atualizarAgora();
      return this.carregar({ silencioso: this.inicializado });
    },

    resetar() {
      this.pararAutoAtualizacao();
      autoRefresh = null;
      this.$reset();
    },
  },
});
