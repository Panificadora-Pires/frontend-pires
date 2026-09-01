import { defineStore } from 'pinia'

import favoriteService from '@/services/favorite.service'
import { useAuthStore } from '@/stores/auth'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    itens: [],
    carregando: false,
    inicializado: false,
    erro: null,
    processando: {},
  }),

  getters: {
    total: (state) => state.itens.length,

    produtos: (state) =>
      state.itens
        .map((item) => item.produto_detalhe)
        .filter(Boolean),

    ids: (state) =>
      new Set(
        state.itens
          .map((item) => item.produto_detalhe?.id)
          .filter((id) => id !== undefined && id !== null),
      ),
  },

  actions: {
    tem(produtoId) {
      return this.itens.some(
        (item) => Number(item.produto_detalhe?.id) === Number(produtoId),
      )
    },

    estaProcessando(produtoId) {
      return Boolean(this.processando[String(produtoId)])
    },

    async carregar({ force = false, migrarLegado = true } = {}) {
      if (this.carregando) return
      if (this.inicializado && !force) return

      this.carregando = true
      this.erro = null

      try {
        this.itens = await favoriteService.listar()
        this.inicializado = true

        if (migrarLegado) {
          await this._migrarFavoritosLocais()
        }
      } catch (error) {
        this.erro = 'Não foi possível carregar seus favoritos.'
        throw error
      } finally {
        this.carregando = false
      }
    },

    async alternar(produto) {
      const produtoId = Number(produto?.id)
      if (!produtoId || this.estaProcessando(produtoId)) {
        return this.tem(produtoId)
      }

      this.processando = {
        ...this.processando,
        [produtoId]: true,
      }

      try {
        if (this.tem(produtoId)) {
          await favoriteService.remover(produtoId)
          this.itens = this.itens.filter(
            (item) => Number(item.produto_detalhe?.id) !== produtoId,
          )
          return false
        }

        const { data } = await favoriteService.adicionar(produtoId)
        this.itens = [
          data,
          ...this.itens.filter(
            (item) => Number(item.produto_detalhe?.id) !== produtoId,
          ),
        ]
        return true
      } finally {
        const proximo = { ...this.processando }
        delete proximo[produtoId]
        this.processando = proximo
      }
    },

    async _migrarFavoritosLocais() {
      const auth = useAuthStore()
      const userId = auth.usuario?.id
      if (!userId || typeof localStorage === 'undefined') return

      const chave = `pp_favoritos_${userId}`
      let ids = []

      try {
        const salvo = JSON.parse(localStorage.getItem(chave) || '[]')
        ids = Array.isArray(salvo) ? salvo.map(Number).filter(Boolean) : []
      } catch {
        localStorage.removeItem(chave)
        return
      }

      if (!ids.length) {
        localStorage.removeItem(chave)
        return
      }

      const atuais = new Set(
        this.itens
          .map((item) => Number(item.produto_detalhe?.id))
          .filter(Boolean),
      )

      let houveMudanca = false

      for (const produtoId of ids) {
        if (atuais.has(produtoId)) continue

        try {
          const { data } = await favoriteService.adicionar(produtoId)
          this.itens.push(data)
          atuais.add(produtoId)
          houveMudanca = true
        } catch {
          // Entrada antiga inválida/inativa ou já existente: ignora.
        }
      }

      localStorage.removeItem(chave)

      if (houveMudanca) {
        this.itens = [...this.itens]
      }
    },

    resetar() {
      this.itens = []
      this.carregando = false
      this.inicializado = false
      this.erro = null
      this.processando = {}
    },
  },
})
