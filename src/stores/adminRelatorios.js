import { defineStore } from "pinia";
import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { validarRelatorioAnalitico, validarPeriodo } from "@/utils/adminRelatorios";

export const useAdminRelatoriosStore = defineStore("adminRelatorios", {
  state: () => ({
    relatorio: null,
    ranking: [],
    inicializado: false,
    carregando: false,
    erro: null,
    geracao: 0,
  }),
  actions: {
    async carregar({ inicio, fim }) {
      const problema = validarPeriodo(inicio, fim);
      if (problema) throw new Error(problema);
      const chamada = ++this.geracao;
      const sessao = getSessionVersion();
      const atual = () => chamada === this.geracao && getSessionVersion() === sessao;
      this.carregando = true;
      this.erro = null;
      try {
        const [resposta, ranking] = await Promise.all([
          adminService.relatorioAnaliticoAdmin({ dataInicio: inicio, dataFim: fim }),
          adminService.maisVendidos({ dataInicio: inicio, dataFim: fim, limite: 7 }),
        ]);
        if (!atual()) return;
        const relatorio = validarRelatorioAnalitico(resposta, { inicio, fim });
        if (!Array.isArray(ranking?.resultado) ||
          ranking.resultado.some(item => item?.produto_id == null || !Number.isSafeInteger(Number(item.quantidade_vendida)) ||
            Number(item.quantidade_vendida) < 0 || !item.produto_nome)) {
          throw new Error("O ranking de produtos não está disponível.");
        }
        this.relatorio = relatorio;
        this.ranking = ranking.resultado;
        this.inicializado = true;
      } catch (error) {
        if (!atual()) return;
        this.erro = error?.response?.status === 404
          ? "O backend ainda não possui o relatório analítico. Atualize o Django de desenvolvimento para o PR4A.1."
          : this.inicializado
            ? "Não foi possível consultar o período. O último relatório válido continua visível."
            : "Não foi possível carregar os relatórios. Tente novamente.";
        throw error;
      } finally {
        if (chamada === this.geracao) this.carregando = false;
      }
    },
    resetar() {
      const geracao = this.geracao + 1;
      this.$reset();
      this.geracao = geracao;
    },
  },
});
