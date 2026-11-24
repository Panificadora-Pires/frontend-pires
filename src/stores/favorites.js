import { acceptHMRUpdate, defineStore } from "pinia";
import favoriteService from "@/services/favorite.service";
import catalogService from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";

const idProduto = item => Number(item.produto_detalhe?.id);
const unicos = itens => [...new Map(itens.filter(item => idProduto(item)).map(item => [idProduto(item), item])).values()];

export const useFavoritesStore = defineStore("favorites", {
  state: () => ({
    itens: [], carregando: false, inicializado: false, erro: null, processando: {},
    contaId: useAuthStore().usuario?.id ?? null, geracao: 0, revisao: 0, alteracoes: {}, suspenso: false,
  }),
  getters: {
    total: state => state.itens.length,
    produtos: state => state.itens.map(item => item.produto_detalhe).filter(Boolean),
    ids: state => new Set(state.itens.map(idProduto).filter(Boolean)),
  },
  actions: {
    tem(produtoId) { return this.itens.some(item => idProduto(item) === Number(produtoId)); },
    estaProcessando(produtoId) { return Boolean(this.processando[String(produtoId)]); },
    sincronizarConta(contaId = useAuthStore().usuario?.id ?? null) {
      if (this.contaId === contaId) return;
      this.resetar(); this.contaId = contaId;
    },
    _sessaoAtual(geracao) {
      return !this.suspenso && geracao === this.geracao && this.contaId !== null && this.contaId === (useAuthStore().usuario?.id ?? null);
    },
    async carregar({ force = false, migrarLegado = true } = {}) {
      this.sincronizarConta();
      if (this.suspenso || this.contaId === null || this.carregando || (this.inicializado && !force)) return;
      const geracao = this.geracao, revisao = this.revisao;
      this.carregando = true; this.erro = null;
      try {
        let itens = unicos(await favoriteService.listar());
        if (!this._sessaoAtual(geracao)) return;
        // Só sobrepor mutações confirmadas depois do início deste GET.
        for (const [id, alteracao] of Object.entries(this.alteracoes)) {
          if (alteracao.revisao <= revisao) continue;
          itens = itens.filter(item => idProduto(item) !== Number(id));
          if (alteracao.item) itens.unshift(alteracao.item);
        }
        this.itens = itens; this.inicializado = true;
        if (migrarLegado) await this._migrarFavoritosLocais(geracao);
      } catch (error) {
        if (!this._sessaoAtual(geracao)) return;
        this.erro = "Não foi possível carregar seus favoritos."; throw error;
      } finally { if (this._sessaoAtual(geracao)) this.carregando = false; }
    },
    async alternar(produto) {
      this.sincronizarConta();
      const produtoId = Number(produto?.id);
      if (this.suspenso || !Number.isSafeInteger(produtoId) || produtoId < 1 || this.contaId === null || this.estaProcessando(produtoId)) return;
      const geracao = this.geracao, remover = this.tem(produtoId);
      this.processando = { ...this.processando, [produtoId]: true };
      try {
        let item = null;
        if (remover) await favoriteService.remover(produtoId);
        else item = (await favoriteService.adicionar(produtoId)).data;
        if (!this._sessaoAtual(geracao)) return;
        this._confirmarAlteracao(produtoId, item);
        return !remover;
      } catch (error) { if (this._sessaoAtual(geracao)) throw error; }
      finally {
        if (this._sessaoAtual(geracao)) { const proximo = { ...this.processando }; delete proximo[produtoId]; this.processando = proximo; }
      }
    },
    _confirmarAlteracao(produtoId, item) {
      this.revisao++;
      this.alteracoes = { ...this.alteracoes, [produtoId]: { revisao: this.revisao, item } };
      this.itens = this.itens.filter(atual => idProduto(atual) !== Number(produtoId));
      if (item) this.itens.unshift(item);
    },
    async obterDetalhe(produtoId) { return catalogService.obterProduto(produtoId); },
    atualizarProduto(produto) {
      this.itens = this.itens.map(item => idProduto(item) === Number(produto.id) ? { ...item, produto_detalhe: produto } : item);
    },
    async _migrarFavoritosLocais(geracao = this.geracao) {
      if (typeof localStorage === "undefined" || !this._sessaoAtual(geracao)) return;
      const chave = `pp_favoritos_${this.contaId}`;
      let ids;
      try { const salvo = JSON.parse(localStorage.getItem(chave) || "[]"); ids = Array.isArray(salvo) ? [...new Set(salvo.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))] : []; }
      catch { return; }
      const pendentes = [];
      for (const produtoId of ids) {
        if (!this._sessaoAtual(geracao)) return;
        // Uma remoção confirmada nesta sessão prevalece sobre o legado,
        // inclusive enquanto a migração aguarda o POST de outro produto.
        if (this.tem(produtoId) || this.alteracoes[produtoId]?.item === null) continue;
        try {
          const resultado = await this.alternar({ id: produtoId });
          if (!this._sessaoAtual(geracao)) return;
          if (resultado === undefined) pendentes.push(produtoId);
        } catch { pendentes.push(produtoId); }
      }
      if (!this._sessaoAtual(geracao)) return;
      if (pendentes.length) localStorage.setItem(chave, JSON.stringify(pendentes));
      else localStorage.removeItem(chave);
    },
    resetar({ suspender = false } = {}) {
      this.suspenso = suspender;
      this.geracao++; this.itens = []; this.carregando = false; this.inicializado = false;
      this.erro = null; this.processando = {}; this.alteracoes = {}; this.revisao = 0;
    },
  },
});

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useFavoritesStore, import.meta.hot));
