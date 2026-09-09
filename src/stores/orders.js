import { defineStore } from 'pinia'

import orderService from '@/services/order.service'

export const useOrdersStore = defineStore('orders', {
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
        ['pendente', 'confirmado', 'pronto'].includes(pedido.status),
      ),

    finalizados: (state) =>
      state.itens.filter((pedido) =>
        ['retirado', 'cancelado'].includes(pedido.status),
      ),

    prontos: (state) =>
      state.itens.filter((pedido) => pedido.status === 'pronto'),
  },

  actions: {
    async carregar({ force = false, silencioso = false } = {}) {
      if (this.carregando || this.atualizandoSilenciosamente) return
      if (this.inicializado && !force && !silencioso) return

      if (silencioso) {
        this.atualizandoSilenciosamente = true
      } else {
        this.carregando = true
      }

      this.erro = null

      try {
        this.itens = await orderService.listar()
        this.inicializado = true
      } catch (error) {
        if (!silencioso) {
          this.erro = 'Não foi possível carregar seus pedidos.'
        }
        throw error
      } finally {
        this.carregando = false
        this.atualizandoSilenciosamente = false
      }
    },

    async buscarPorId(id) {
      const existente = this.itens.find(
        (pedido) => Number(pedido.id) === Number(id),
      )

      if (existente) return existente

      const { data } = await orderService.obter(id)
      return data
    },

    resetar() {
      this.itens = []
      this.carregando = false
      this.atualizandoSilenciosamente = false
      this.inicializado = false
      this.erro = null
    },
  },
})
