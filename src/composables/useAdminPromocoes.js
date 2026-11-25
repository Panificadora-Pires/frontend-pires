import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { getSessionVersion } from "@/services/api";
import { useAdminPromocoesStore } from "@/stores/adminPromocoes";
import { mensagemErroApi } from "@/services/admin.service";
import {
  diaEmSaoPaulo,
  estadoPromocao,
  validarPromocao,
} from "@/utils/adminPromocoes";

export function useAdminPromocoes() {
  const store = useAdminPromocoesStore();
  const hoje = ref(diaEmSaoPaulo());
  const busca = ref("");
  const situacao = ref("");
  const pagina = ref(1);
  const PAGE_SIZE = 12;
  const opcoesSituacao = [
    { label: "Todas as situações", value: "" },
    { label: "Ativas", value: "ativa" },
    { label: "Agendadas", value: "agendada" },
    { label: "Encerradas", value: "encerrada" },
  ];
  const metricas = [
    {
      label: "Total de promoções",
      campo: "total",
      descricao: "Ofertas cadastradas",
    },
    { label: "Ativas", campo: "ativas", descricao: "Com preço especial vigente" },
    {
      label: "Agendadas",
      campo: "agendadas",
      descricao: "Programadas para começar",
    },
    {
      label: "Encerradas",
      campo: "encerradas",
      descricao: "Com período finalizado",
    },
  ];
  const indicadores = computed(() => store.resumo || {});
  const totalPaginas = computed(() => store.pagina.total_pages);
  const visiveis = computed(() => store.pagina.results);
  const primeiraExibida = computed(
    () => (store.pagina.page - 1) * store.pagina.page_size + 1,
  );
  const ultimaExibida = computed(
    () => primeiraExibida.value + visiveis.value.length - 1,
  );
  let timerFiltros = null;

  function parametros() {
    return {
      page: pagina.value,
      page_size: PAGE_SIZE,
      busca: busca.value.trim(),
      situacao: situacao.value,
    };
  }
  async function carregar() {
    hoje.value = diaEmSaoPaulo();
    try {
      await store.carregar(parametros());
    } catch (error) {
      if (pagina.value > 1 && error?.response?.status === 404) {
        pagina.value = 1;
        await store.carregar(parametros());
        return;
      }
      throw error;
    }
  }
  function mudarPagina(deslocamento) {
    if (store.carregando) return;
    const destino = pagina.value + deslocamento;
    if (destino < 1 || destino > totalPaginas.value) return;
    pagina.value = destino;
    void carregar().catch(() => {});
  }
  watch([busca, situacao], () => {
    pagina.value = 1;
    clearTimeout(timerFiltros);
    timerFiltros = setTimeout(() => {
      void carregar().catch(() => {});
    }, 300);
  });
  const { atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });

  const formDialog = ref(null);
  const exclusaoDialog = ref(null);
  const novaRef = ref(null);
  const buscaProdutoRef = ref(null);
  const form = reactive({
    id: null,
    produto: "",
    preco_promocional: "",
    data_inicio: "",
    data_fim: "",
  });
  const produtoSelecionado = ref(null);
  const buscaProduto = ref("");
  const paginaProdutos = ref({ page: 1, count: 0, next: null, results: [] });
  const carregandoProdutos = ref(false);
  const erroProdutos = ref("");
  const salvando = ref(false);
  const erroFormulario = ref("");
  const excluindo = ref(false);
  const erroExclusao = ref("");
  const promocaoParaExcluir = ref(null);
  const sucesso = ref("");
  let focoFormulario = null;
  let focoExclusao = null;
  let timerBusca = null;
  let sequenciaBusca = 0;
  let sequenciaDetalhe = 0;
  let montado = true;

  function moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }
  function dataCivil(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(valor))
      ? valor.split("-").reverse().join("/")
      : "—";
  }
  function rotuloEstado(estado) {
    return (
      { ativa: "Ativa", agendada: "Agendada", encerrada: "Encerrada" }[estado] ||
      "—"
    );
  }
  function limparFiltros() {
    busca.value = "";
    situacao.value = "";
  }

  async function buscarProdutos(mais = false) {
    if (mais && (!paginaProdutos.value.next || carregandoProdutos.value)) return;
    const chamada = ++sequenciaBusca;
    const sessao = getSessionVersion();
    const buscaAtual = buscaProduto.value.trim();
    const numeroPagina = mais ? paginaProdutos.value.page + 1 : 1;
    carregandoProdutos.value = true;
    erroProdutos.value = "";
    try {
      const dados = await store.pesquisarProdutos({
        page: numeroPagina,
        page_size: 20,
        busca: buscaAtual,
      });
      if (
        chamada !== sequenciaBusca ||
        sessao !== getSessionVersion() ||
        !montado ||
        !formDialog.value?.open
      )
        return;
      paginaProdutos.value = {
        ...dados,
        results: mais
          ? [...paginaProdutos.value.results, ...dados.results]
          : dados.results,
      };
    } catch {
      if (
        chamada !== sequenciaBusca ||
        sessao !== getSessionVersion() ||
        !montado ||
        !formDialog.value?.open
      )
        return;
      erroProdutos.value = "Não foi possível buscar produtos.";
    } finally {
      if (chamada === sequenciaBusca) carregandoProdutos.value = false;
    }
  }
  function buscarProdutoAoEnter() {
    clearTimeout(timerBusca);
    buscarProdutos(false);
  }
  function agendarBuscaProduto() {
    clearTimeout(timerBusca);
    sequenciaBusca++;
    paginaProdutos.value = { page: 1, count: 0, next: null, results: [] };
    carregandoProdutos.value = true;
    timerBusca = window.setTimeout(() => buscarProdutos(false), 270);
  }
  function escolherProduto(produto) {
    produtoSelecionado.value = { ...produto };
    form.produto = Number(produto.id);
    erroFormulario.value = "";
  }
  async function carregarProdutoExistente(id) {
    const chamada = ++sequenciaDetalhe,
      sessao = getSessionVersion();
    try {
      const produto = await store.obterProdutoAdmin(id);
      if (
        chamada !== sequenciaDetalhe ||
        sessao !== getSessionVersion() ||
        !formDialog.value?.open ||
        !montado
      )
        return;
      if (Number(form.produto) !== Number(produto.id)) return;
      produtoSelecionado.value = produto;
    } catch {}
  }
  function preencherFormulario(promocao = null) {
    Object.assign(form, {
      id: promocao?.id ?? null,
      produto: promocao?.produto ?? "",
      preco_promocional: promocao?.preco_promocional ?? "",
      data_inicio: promocao?.data_inicio ?? diaEmSaoPaulo(),
      data_fim: promocao?.data_fim ?? diaEmSaoPaulo(),
    });
    buscaProduto.value = "";
    paginaProdutos.value = { page: 1, count: 0, next: null, results: [] };
    produtoSelecionado.value = promocao
      ? { id: promocao.produto, nome: promocao.produto_nome }
      : null;
    erroProdutos.value = "";
    erroFormulario.value = "";
    sucesso.value = "";
  }
  function abrirFormulario(promocao, event) {
    if (formDialog.value?.open || exclusaoDialog.value?.open) return;
    preencherFormulario(promocao);
    focoFormulario = event?.currentTarget || document.activeElement;
    formDialog.value?.showModal();
    nextTick(() => buscaProdutoRef.value?.focus());
    buscarProdutos(false);
    if (promocao) carregarProdutoExistente(promocao.produto);
  }
  function abrirNovo(event) {
    abrirFormulario(null, event);
  }
  function abrirEdicao(promocao, event) {
    abrirFormulario(promocao, event);
  }
  function fecharFormulario() {
    if (!salvando.value) formDialog.value?.close();
  }
  function aoCancelarFormulario(event) {
    if (salvando.value) event.preventDefault();
  }
  function aoClicarForaFormulario(event) {
    if (event.target === formDialog.value) fecharFormulario();
  }
  function aoFecharFormulario() {
    sequenciaBusca++;
    sequenciaDetalhe++;
    clearTimeout(timerBusca);
    carregandoProdutos.value = false;
    erroFormulario.value = "";
    if (focoFormulario?.isConnected) focoFormulario.focus();
    else novaRef.value?.focus();
    focoFormulario = null;
  }

  async function salvar() {
    if (salvando.value) return;
    erroFormulario.value = validarPromocao(form, produtoSelecionado.value?.preco);
    if (erroFormulario.value) return;
    const edicao = Boolean(form.id);
    const payload = {
      produto: Number(form.produto),
      preco_promocional: String(form.preco_promocional).replace(",", "."),
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
    };
    salvando.value = true;
    try {
      await store.salvar({ id: form.id, payload });
      if (!montado) return;
      formDialog.value?.close();
      sucesso.value = edicao
        ? "Promoção atualizada com sucesso."
        : "Promoção criada com sucesso.";
      await carregar().catch(() => {});
    } catch (error) {
      if (montado)
        erroFormulario.value = mensagemErroApi(
          error,
          "Não foi possível salvar a promoção.",
        );
    } finally {
      if (montado) salvando.value = false;
    }
  }

  function abrirExclusao(promocao, event) {
    if (formDialog.value?.open || exclusaoDialog.value?.open) return;
    promocaoParaExcluir.value = promocao;
    erroExclusao.value = "";
    sucesso.value = "";
    focoExclusao = event?.currentTarget || document.activeElement;
    exclusaoDialog.value?.showModal();
  }
  function fecharExclusao() {
    if (!excluindo.value) exclusaoDialog.value?.close();
  }
  function aoCancelarExclusao(event) {
    if (excluindo.value) event.preventDefault();
  }
  function aoClicarForaExclusao(event) {
    if (event.target === exclusaoDialog.value) fecharExclusao();
  }
  function aoFecharExclusao() {
    promocaoParaExcluir.value = null;
    erroExclusao.value = "";
    if (focoExclusao?.isConnected) focoExclusao.focus();
    else novaRef.value?.focus();
    focoExclusao = null;
  }
  async function confirmarExclusao() {
    if (!promocaoParaExcluir.value || excluindo.value) return;
    excluindo.value = true;
    erroExclusao.value = "";
    try {
      await store.excluir(promocaoParaExcluir.value.id);
      if (!montado) return;
      exclusaoDialog.value?.close();
      sucesso.value = "Promoção excluída. O produto continua no catálogo.";
      await carregar().catch(() => {});
    } catch (error) {
      if (montado)
        erroExclusao.value = mensagemErroApi(
          error,
          "Não foi possível excluir esta promoção.",
        );
    } finally {
      if (montado) excluindo.value = false;
    }
  }
  onBeforeUnmount(() => {
    montado = false;
    sequenciaBusca++;
    sequenciaDetalhe++;
    clearTimeout(timerBusca);
    clearTimeout(timerFiltros);
    formDialog.value?.close();
    exclusaoDialog.value?.close();
    store.resetar();
  });

  return {
    abrirEdicao,
    abrirExclusao,
    abrirNovo,
    agendarBuscaProduto,
    aoCancelarExclusao,
    aoCancelarFormulario,
    aoClicarForaExclusao,
    aoClicarForaFormulario,
    aoFecharExclusao,
    aoFecharFormulario,
    atualizarAgora,
    busca,
    buscaProduto,
    buscaProdutoRef,
    buscarProdutoAoEnter,
    buscarProdutos,
    carregandoProdutos,
    confirmarExclusao,
    dataCivil,
    erroExclusao,
    erroFormulario,
    erroProdutos,
    escolherProduto,
    excluindo,
    exclusaoDialog,
    fecharExclusao,
    fecharFormulario,
    form,
    formDialog,
    hoje,
    indicadores,
    limparFiltros,
    metricas,
    moeda,
    mudarPagina,
    novaRef,
    opcoesSituacao,
    paginaProdutos,
    primeiraExibida,
    produtoSelecionado,
    promocaoParaExcluir,
    rotuloEstado,
    salvando,
    salvar,
    situacao,
    store,
    sucesso,
    totalPaginas,
    ultimaExibida,
    visiveis,
    estadoPromocao,
    ref,
  };
}
