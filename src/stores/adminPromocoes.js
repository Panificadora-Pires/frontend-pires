import { defineStore } from "pinia";
import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

// A API continua sendo a única fonte de preços, vigência e permissões.
export const useAdminPromocoesStore = defineStore("adminPromocoes", {
  state: () => ({
    itens: [],
    inicializado: false,
    carregando: false,
    erro: null,
    geracao: 0,
  }),
  actions: {
    async carregar() {
      const chamada = ++this.geracao;
      const sessao = getSessionVersion();
      const atual = () => chamada === this.geracao && sessao === getSessionVersion();
      if (!this.inicializado) this.carregando = true;
      try {
        const itens = await adminService.listarPromocoes();
        if (!atual()) return;
        if (!Array.isArray(itens)) throw new Error("A API não retornou uma lista válida de promoções.");
        this.itens = itens;
        this.inicializado = true;
        this.erro = null;
      } catch (error) {
        if (!atual()) return;
        this.erro = this.inicializado
          ? "Não foi possível sincronizar as promoções. A última lista foi preservada."
          : "Não foi possível carregar as promoções.";
        throw error;
      } finally {
        if (atual()) this.carregando = false;
      }
    },
    salvar({ id = null, payload }) {
      return id ? adminService.atualizarPromocao(id, payload) : adminService.criarPromocao(payload);
    },
    excluir(id) {
      return adminService.excluirPromocao(id);
    },
    pesquisarProdutos(params) {
      return adminService.listarProdutosAdminPagina(params);
    },
    obterProdutoAdmin(id) {
      return adminService.obterProdutoAdmin(id);
    },
    resetar() {
      const proximaGeracao = this.geracao + 1;
      this.$reset();
      this.geracao = proximaGeracao;
    },
  },
});
