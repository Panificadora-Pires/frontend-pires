import { defineStore } from "pinia";

import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

const paginaInicial = () => ({
  count: 0, page: 1, page_size: 18, total_pages: 1, next: null, previous: null,
  results: [],
});

export const useAdminUsuariosStore = defineStore("adminUsuarios", {
  state: () => ({
    pagina: paginaInicial(),
    resumo: null,
    inicializado: false,
    carregando: false,
    erro: null,
    geracao: 0,
    consultaAplicada: null,
  }),
  actions: {
    async carregar(filtros = {}) {
      const chamada = ++this.geracao;
      const sessao = getSessionVersion();
      const atual = () => chamada === this.geracao && sessao === getSessionVersion();
      this.carregando = true;
      this.erro = null;
      try {
        const [pagina, resumo] = await Promise.all([
          adminService.listarUsuariosAdminPagina(filtros),
          adminService.resumoUsuariosAdmin(),
        ]);
        if (!atual()) return;
        this.pagina = pagina;
        this.resumo = resumo;
        this.consultaAplicada = { ...filtros };
        this.inicializado = true;
      } catch (error) {
        if (!atual()) return;
        this.erro = error?.response?.status === 404 && !this.inicializado
          ? "O backend de desenvolvimento ainda não tem a listagem de usuários. Atualize-o para o PR4B.1."
          : this.inicializado
            ? "Não foi possível consultar os usuários. A última lista válida foi preservada."
            : "Não foi possível carregar os usuários.";
        throw error;
      } finally {
        if (atual()) this.carregando = false;
      }
    },
    resetar() {
      const proximaGeracao = this.geracao + 1;
      this.$reset();
      this.geracao = proximaGeracao;
    },
  },
});
