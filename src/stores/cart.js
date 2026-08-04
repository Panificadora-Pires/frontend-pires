import { defineStore } from 'pinia'

/**
 * Carrinho é local (não existe endpoint de "rascunho de pedido" no backend —
 * o pedido só é criado de verdade no POST /api/pedidos/, com todos os itens
 * de uma vez). Então o carrinho vive só no front até a hora de finalizar.
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    itens: [], // [{ produto, quantidade }]
  }),

  getters: {
    totalItens: (state) => state.itens.reduce((soma, item) => soma + item.quantidade, 0),

    totalPreco: (state) =>
      state.itens.reduce((soma, item) => soma + Number(item.produto.preco_atual ?? item.produto.preco) * item.quantidade, 0),

    vazio: (state) => state.itens.length === 0,
  },

  actions: {
    adicionar(produto, quantidade = 1) {
      const existente = this.itens.find((item) => item.produto.id === produto.id)

      if (existente) {
        existente.quantidade += quantidade
      } else {
        this.itens.push({ produto, quantidade })
      }
    },

    removerItem(produtoId) {
      this.itens = this.itens.filter((item) => item.produto.id !== produtoId)
    },

    alterarQuantidade(produtoId, quantidade) {
      if (quantidade <= 0) {
        this.removerItem(produtoId)
        return
      }
      const item = this.itens.find((item) => item.produto.id === produtoId)
      if (item) item.quantidade = quantidade
    },

    limpar() {
      this.itens = []
    },
  },
})
