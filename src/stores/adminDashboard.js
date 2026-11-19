import { defineStore } from 'pinia';
import adminService from '@/services/admin.service';
import { getSessionVersion } from '@/services/api';
import { diaEmSaoPaulo, normalizarRanking } from '@/utils/adminDashboard';
import { somarDias, validarRelatorioAnalitico } from '@/utils/adminRelatorios';

// Cada instância possui sua carga: reset permite nova busca sem aguardar a anterior.
const carregamentos = new WeakMap();

export const useAdminDashboardStore = defineStore('adminDashboard', {
  state: () => ({
    produtos: [],
    promocoes: [],
    ranking: [],
    relatorioHoje: null,
    relatorioSemana: null,
    pedidosRecentes: [],
    dia: null,
    inicializado: false,
    carregando: false,
    erro: null,
    ultimaAtualizacao: null,
    geracao: 0,
  }),
  actions: {
    carregar({ agora = new Date() } = {}) {
      const existente = carregamentos.get(this);
      if (existente) return existente.promise;
      const dia = diaEmSaoPaulo(agora);
      const entrada = { geracao: this.geracao, versao: getSessionVersion(), promise: null };
      const atual = () => carregamentos.get(this) === entrada && this.geracao === entrada.geracao;
      const sessaoAtual = () => atual() && getSessionVersion() === entrada.versao;
      this.carregando = true;
      this.erro = null;
      carregamentos.set(this, entrada);
      entrada.promise = (async () => {
        try {
          const periodo = { dataInicio: dia, dataFim: dia };
          const inicioSemana = somarDias(dia, -6);
          const [produtos, promocoes, relatorioHoje, respostaRanking, paginaRecentes, relatorioSemana] = await Promise.all([
            adminService.listarProdutos({ ativo: true }),
            adminService.listarPromocoes(),
            adminService.relatorioVendas(periodo),
            adminService.maisVendidos({ ...periodo, limite: 3 }),
            adminService.listarPedidosPagina({ page: 1, page_size: 4 }),
            adminService.relatorioAnaliticoAdmin({ dataInicio: inicioSemana, dataFim: dia }),
          ]);
          if (!sessaoAtual()) return;
          const ranking = normalizarRanking(respostaRanking, produtos);
          if (!relatorioHoje || [relatorioHoje.total_vendido, relatorioHoje.total_pedidos].some(valor => valor == null || valor === '' || !Number.isFinite(Number(valor)))) {
            throw new Error('Resposta de faturamento inválida.');
          }
          // A série é calculada no Django, a partir dos preços históricos de itens
          // retirados; jamais depender do histórico completo de pedidos.
          const semanaValidada = validarRelatorioAnalitico(relatorioSemana, { inicio: inicioSemana, fim: dia });
          this.produtos = produtos;
          this.promocoes = promocoes;
          this.relatorioHoje = relatorioHoje;
          this.relatorioSemana = semanaValidada;
          this.pedidosRecentes = paginaRecentes.results;
          this.ranking = ranking;
          this.dia = dia;
          this.inicializado = true;
          this.ultimaAtualizacao = new Date(agora);
        } catch (error) {
          if (!sessaoAtual()) return;
          this.erro = error.code === 'ADMIN_COLLECTION_INCOMPLETE'
            ? 'A consulta não foi concluída. Os indicadores não representam uma coleção completa.'
            : 'Não foi possível atualizar os dados do Dashboard. Tente novamente.';
          throw error;
        } finally {
          if (atual()) {
            this.carregando = false;
            carregamentos.delete(this);
          }
        }
      })();
      return entrada.promise;
    },
    resetar() {
      const geracao = this.geracao + 1;
      carregamentos.delete(this);
      this.$reset();
      this.geracao = geracao;
    },
  },
});
