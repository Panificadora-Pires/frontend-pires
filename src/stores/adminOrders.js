import { defineStore } from "pinia";
import adminService from "@/services/admin.service";

function ordenarPorDataDesc(lista) {
  return [...lista].sort(
    (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime(),
  );
}

export const useAdminOrdersStore = defineStore("adminOrders", {
  state: () => ({
    itens: [],
  }),
  getters: {
    porId: (state) => (id) =>
      state.itens.find((pedido) => Number(pedido.id) === Number(id)) || null,
  },
  actions: {
    substituirPedido(pedido) {
      if (!pedido?.id) return;
      const indice = this.itens.findIndex(
        item => Number(item.id) === Number(pedido.id),
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
    resetar() {
      this.$reset();
    },
  },
});
