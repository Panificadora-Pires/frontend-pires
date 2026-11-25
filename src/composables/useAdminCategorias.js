import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

export function useAdminCategorias() {
  const dadosPagina = ref({
    count: 0,
    page: 1,
    page_size: 18,
    total_pages: 1,
    results: [],
  });
  const resumo = ref(null);
  const inicializado = ref(false);
  const pagina = ref(1);
  const carregando = ref(false);
  const PAGE_SIZE = 18;
  let timerFiltros = null;
  const erroLeitura = ref("");
  const mensagemSucesso = ref("");
  const busca = ref("");
  const situacao = ref("");
  const salvando = ref(false);
  const erroSalvar = ref("");
  const dialogRef = ref(null);
  const nomeRef = ref(null);
  const form = reactive({
    id: null,
    nome: "",
    descricao: "",
    ordem: 0,
    ativa: true,
  });
  let sequencia = 0;
  let focoAnterior = null;

  const opcoesSituacao = [
    { label: "Todas as situações", value: "" },
    { label: "Ativas", value: "ativa" },
    { label: "Inativas", value: "inativa" },
  ];
  const indicadores = computed(
    () => resumo.value || { total: 0, ativas: 0, inativas: 0 },
  );
  const visiveis = computed(() => dadosPagina.value.results);
  const erroExibido = computed(() => erroLeitura.value);

  function parametros() {
    return {
      page: pagina.value,
      page_size: PAGE_SIZE,
      busca: busca.value.trim(),
      situacao: situacao.value,
    };
  }
  async function carregar() {
    const chamada = ++sequencia;
    const sessao = getSessionVersion();
    carregando.value = true;
    try {
      const [dados, totais] = await Promise.all([
        adminService.listarCategoriasAdminPagina(parametros()),
        adminService.resumoCategoriasAdmin(),
      ]);
      if (chamada !== sequencia || sessao !== getSessionVersion()) return;
      dadosPagina.value = dados;
      resumo.value = totais;
      inicializado.value = true;
      erroLeitura.value = "";
    } catch (error) {
      if (chamada !== sequencia || sessao !== getSessionVersion()) return;
      if (pagina.value > 1 && error?.response?.status === 404) {
        pagina.value = 1;
        return carregar();
      }
      erroLeitura.value = inicializado.value
        ? "Não foi possível atualizar as categorias. A última consulta válida foi preservada."
        : "Não foi possível carregar as categorias.";
      throw error;
    } finally {
      if (chamada === sequencia && sessao === getSessionVersion())
        carregando.value = false;
    }
  }
  function mudarPagina(deslocamento) {
    if (carregando.value) return;
    const proxima = dadosPagina.value.page + deslocamento;
    if (proxima < 1 || proxima > dadosPagina.value.total_pages) return;
    pagina.value = proxima;
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

  function limparFiltros() {
    busca.value = "";
    situacao.value = "";
  }
  function preencherFormulario(item = null) {
    Object.assign(form, {
      id: item?.id ?? null,
      nome: item?.nome ?? "",
      descricao: item?.descricao ?? "",
      ordem: Number(item?.ordem) || 0,
      ativa: item?.ativa ?? true,
    });
    erroSalvar.value = "";
    mensagemSucesso.value = "";
  }
  function abrirFormulario(item) {
    if (dialogRef.value?.open) return;
    preencherFormulario(item);
    focoAnterior = document.activeElement;
    dialogRef.value?.showModal();
    nextTick(() => nomeRef.value?.focus());
  }
  function abrirNovaCategoria() {
    abrirFormulario(null);
  }
  function abrirEdicao(item) {
    abrirFormulario(item);
  }
  function fecharDialog() {
    if (salvando.value) return;
    dialogRef.value?.close();
  }
  function aoCancelarDialog(event) {
    if (salvando.value) event.preventDefault();
  }
  function aoFecharDialog() {
    erroSalvar.value = "";
    if (focoAnterior?.isConnected && typeof focoAnterior.focus === "function") {
      focoAnterior.focus();
    }
    focoAnterior = null;
  }
  async function salvar() {
    if (salvando.value) return;
    erroSalvar.value = "";
    salvando.value = true;
    const editando = Boolean(form.id);
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      ordem: Number(form.ordem),
      ativa: Boolean(form.ativa),
    };
    try {
      if (editando) await adminService.atualizarCategoria(form.id, payload);
      else await adminService.criarCategoria(payload);
      if (!editando) pagina.value = 1;
      dialogRef.value?.close();
      mensagemSucesso.value = editando
        ? "Categoria atualizada com sucesso."
        : "Categoria criada com sucesso.";
      await carregar().catch(() => {});
    } catch (error) {
      erroSalvar.value = mensagemErroApi(
        error,
        "Não foi possível salvar a categoria.",
      );
    } finally {
      salvando.value = false;
    }
  }
  onBeforeUnmount(() => {
    sequencia++;
    clearTimeout(timerFiltros);
    focoAnterior = null;
    dialogRef.value?.close();
  });

  return {
    abrirEdicao,
    abrirNovaCategoria,
    aoCancelarDialog,
    aoFecharDialog,
    atualizarAgora,
    busca,
    carregando,
    dadosPagina,
    dialogRef,
    erroExibido,
    erroLeitura,
    erroSalvar,
    fecharDialog,
    form,
    indicadores,
    inicializado,
    limparFiltros,
    mensagemSucesso,
    mudarPagina,
    nomeRef,
    opcoesSituacao,
    salvando,
    salvar,
    situacao,
    visiveis,
    ref,
  };
}
