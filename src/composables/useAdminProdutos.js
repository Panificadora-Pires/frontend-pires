import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

export function useAdminProdutos() {
  const PAGE_SIZE = 18;
  const busca = ref("");
  const buscaAplicada = ref("");
  const categoria = ref("");
  const situacao = ref("");
  const paginaAtual = ref(1);
  const paginaDados = ref({
    count: 0,
    next: null,
    page: 1,
    total_pages: 1,
    results: [],
  });
  const resumo = ref(null);
  const inicializado = ref(false);
  const consultando = ref(false);
  const alterando = ref(null);
  const erro = ref("");
  let sequencia = 0;
  let timerBusca = null;

  const opcoesSituacao = [
    { label: "Todas as situações", value: "" },
    { label: "Ativos", value: "ativo" },
    { label: "Inativos", value: "inativo" },
    { label: "Sem estoque", value: "sem-estoque" },
    { label: "Para reposição", value: "reposicao" },
  ];
  const metricas = [
    {
      label: "Total de produtos",
      campo: "total",
      descricao: "Cadastrados no sistema",
    },
    { label: "Ativos", campo: "ativos", descricao: "Disponíveis no cardápio" },
    {
      label: "Para reposição",
      campo: "reposicao",
      descricao: "Estoque no mínimo ou abaixo",
    },
    {
      label: "Em promoção",
      campo: "em_promocao",
      descricao: "Com oferta vigente",
    },
  ];
  const filtrosAtivos = computed(() =>
    Boolean(buscaAplicada.value || categoria.value || situacao.value),
  );
  const inicioExibido = computed(
    () => (paginaDados.value.page - 1) * PAGE_SIZE + 1,
  );
  const fimExibido = computed(
    () =>
      (paginaDados.value.page - 1) * PAGE_SIZE + paginaDados.value.results.length,
  );

  function moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }
  async function carregar() {
    const chamada = ++sequencia;
    const sessao = getSessionVersion();
    consultando.value = true;
    try {
      const [pagina, totais] = await Promise.all([
        adminService.listarProdutosAdminPagina({
          page: paginaAtual.value,
          page_size: PAGE_SIZE,
          busca: buscaAplicada.value,
          categoria: categoria.value,
          situacao: situacao.value,
        }),
        adminService.resumoProdutosAdmin(),
      ]);
      if (chamada !== sequencia || getSessionVersion() !== sessao) return;
      paginaDados.value = pagina;
      resumo.value = totais;
      inicializado.value = true;
      erro.value = "";
    } catch (error) {
      if (chamada !== sequencia || getSessionVersion() !== sessao) return;
      if (error?.response?.status === 404 && paginaAtual.value > 1) {
        paginaAtual.value = 1;
        return carregar();
      }
      erro.value = mensagemErroApi(
        error,
        "Não foi possível consultar o catálogo.",
      );
      throw error;
    } finally {
      if (chamada === sequencia) consultando.value = false;
    }
  }
  useAutoRefresh(carregar, { intervalo: 60_000 });

  function aplicarFiltros() {
    paginaAtual.value = 1;
    void carregar().catch(() => {});
  }
  watch(busca, (value) => {
    if (timerBusca) clearTimeout(timerBusca);
    timerBusca = setTimeout(() => {
      buscaAplicada.value = value.trim();
      aplicarFiltros();
    }, 350);
  });
  watch([categoria, situacao], aplicarFiltros);
  function limparFiltros() {
    busca.value = "";
    buscaAplicada.value = "";
    categoria.value = "";
    situacao.value = "";
    aplicarFiltros();
  }
  function mudarPagina(delta) {
    const destino = paginaAtual.value + delta;
    if (destino < 1 || destino > paginaDados.value.total_pages) return;
    paginaAtual.value = destino;
    void carregar().catch(() => {});
  }
  async function alternarAtivo(produto) {
    if (alterando.value !== null) return;
    alterando.value = produto.id;
    erro.value = "";
    try {
      await adminService.atualizarProduto(produto.id, { ativo: !produto.ativo });
      await carregar();
    } catch (error) {
      erro.value = mensagemErroApi(
        error,
        "Não foi possível alterar a situação do produto.",
      );
    } finally {
      alterando.value = null;
    }
  }
  function tentarNovamente() {
    void carregar().catch(() => {});
  }
  onBeforeUnmount(() => {
    sequencia += 1;
    if (timerBusca) clearTimeout(timerBusca);
  });

  return {
    alterando,
    alternarAtivo,
    busca,
    categoria,
    consultando,
    erro,
    filtrosAtivos,
    fimExibido,
    inicializado,
    inicioExibido,
    limparFiltros,
    metricas,
    moeda,
    mudarPagina,
    opcoesSituacao,
    paginaAtual,
    paginaDados,
    resumo,
    situacao,
    tentarNovamente,
  };
}
