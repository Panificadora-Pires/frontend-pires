import { defineStore } from "pinia";
import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

const paginaVazia = () => ({
  count: 0, page: 1, page_size: 12, total_pages: 1,
  next: null, previous: null, results: [],
});

export const useAdminPromocoesStore = defineStore("adminPromocoes", {
  state: () => ({
    pagina: paginaVazia(),
    resumo: null,
    inicializado: false,
    carregando: false,
    erro: null,
    geracao: 0,
    filtrosAplicados: null,
  }),
  actions: {
    async carregar(filtros = {}) {
      const chamada = ++this.geracao;
      const sessao = getSessionVersion();
      const atual = () => chamada === this.geracao && sessao === getSessionVersion();
      this.carregando = true;
      try {
        const [pagina, resumo] = await Promise.all([
          adminService.listarPromocoesAdminPagina(filtros),
          adminService.resumoPromocoesGestao(),
        ]);
        if (!atual()) return;
        this.pagina = pagina;
        this.resumo = resumo;
        this.filtrosAplicados = { ...filtros };
        this.inicializado = true;
        this.erro = null;
      } catch (error) {
        if (!atual()) return;
        this.erro = this.inicializado
          ? "Não foi possível atualizar as promoções. A última consulta válida foi preservada."
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
