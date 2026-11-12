import { acceptHMRUpdate, defineStore } from "pinia";
export const useCartStore = defineStore("cart", {
  state: () => ({
    itens: [],
    contaId: null,
    geracao: 0,
  }),

  getters: {
    totalItens: (state) =>
      state.itens.reduce((soma, item) => soma + item.quantidade, 0),

    totalPreco: (state) =>
      state.itens.reduce(
        (soma, item) =>
          soma +
          Number(item.produto.preco_atual ?? item.produto.preco) *
            item.quantidade,
        0,
      ),

    vazio: (state) => state.itens.length === 0,
  },

  actions: {
    sincronizarConta(id) {
      const contaId = id == null ? null : String(id);
      if (contaId === this.contaId) return;
      this.contaId = contaId;
      this.geracao += 1;
      this.itens = [];
    },

    capturarContexto() {
      return { contaId: this.contaId, geracao: this.geracao };
    },

    contextoAtual(contexto) {
      return this.contaId !== null && contexto?.contaId === this.contaId && contexto?.geracao === this.geracao;
    },

    adicionar(produto, quantidade = 1, contexto = this.capturarContexto()) {
      if (!this.contextoAtual(contexto)) return false;
      const existente = this.itens.find(
        (item) => item.produto.id === produto.id,
      );

      if (existente) {
        existente.quantidade += quantidade;
      } else {
        this.itens.push({ produto, quantidade });
      }
      return true;
    },

    removerItem(produtoId) {
      this.itens = this.itens.filter((item) => item.produto.id !== produtoId);
    },

    alterarQuantidade(produtoId, quantidade) {
      if (quantidade <= 0) {
        this.removerItem(produtoId);
        return;
      }
      const item = this.itens.find((item) => item.produto.id === produtoId);
      if (item) item.quantidade = quantidade;
    },

    limpar(contexto = this.capturarContexto()) {
      if (!this.contextoAtual(contexto)) return false;
      this.itens = [];
      return true;
    },
  },
});
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useCartStore, import.meta.hot));
