import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { REALTIME_ENABLED, realtimeClient } from "@/services/realtime";
import { useAdminOrdersStore } from "@/stores/adminOrders";
import { useAdminQueueSummaryStore } from "@/stores/adminQueueSummary";
import { useChatStore } from "@/stores/chat";
import {
  ETAPAS_FILA,
  ETAPAS_HISTORICO,
  TODOS_STATUS,
  paginaExpirada,
  proximaAcao,
} from "@/utils/adminKanban";

export function useAdminKanban() {
  const route = useRoute();
  const router = useRouter();
  const resumo = useAdminQueueSummaryStore();
  const pedidosStore = useAdminOrdersStore();
  const chat = useChatStore();
  const PAGE_SIZE = 12;
  const statusInicial = TODOS_STATUS.includes(String(route.query.status))
    ? String(route.query.status)
    : "pendente";
  const modo = ref(
    ETAPAS_HISTORICO.some((etapa) => etapa.status === statusInicial)
      ? "historico"
      : "fila",
  );
  const abaMobile = ref(statusInicial);
  const busca = ref("");
  const buscaAplicada = ref("");
  const pagamento = ref("");
  const dados = reactive(
    Object.fromEntries(TODOS_STATUS.map((status) => [status, paginaVazia()])),
  );
  const paginas = reactive(
    Object.fromEntries(TODOS_STATUS.map((status) => [status, 1])),
  );
  const carregando = ref(false);
  const erroGlobal = ref("");
  const erroAcao = ref("");
  const emAcao = ref(null);
  let sequencia = 0;
  let debounceBusca = null;

  function paginaVazia() {
    return {
      count: null,
      results: [],
      next: null,
      page: 1,
      total_pages: 1,
      inicializado: false,
      erro: "",
    };
  }
  const etapasVisiveis = computed(() =>
    modo.value === "historico" ? ETAPAS_HISTORICO : ETAPAS_FILA,
  );
  const totalOperacao = computed(() => {
    if (!resumo.resumo) return null;
    return (
      resumo.resumo.pendentes + resumo.resumo.confirmados + resumo.resumo.prontos
    );
  });
  const filtrosAtivos = computed(() =>
    Boolean(buscaAplicada.value || pagamento.value),
  );
  const pedidosComMensagem = computed(() =>
    Object.keys(chat.naoLidas.porPedido).slice(0, 5),
  );
  function totalEtapa(etapa) {
    const coluna = dados[etapa.status];
    const valor = filtrosAtivos.value
      ? coluna.count
      : (resumo.resumo?.[etapa.campo] ?? coluna.count);
    return valor === null || valor === undefined ? "—" : valor;
  }
  function resetarPaginas() {
    for (const status of TODOS_STATUS) {
      paginas[status] = 1;
      dados[status] = paginaVazia();
    }
  }
  async function carregarColunas() {
    const versao = getSessionVersion();
    const chamada = ++sequencia;
    carregando.value = true;
    erroGlobal.value = "";
    const estados = etapasVisiveis.value.map((etapa) => etapa.status);
    const filtroAtual = {
      busca: buscaAplicada.value || undefined,
      pagamento: pagamento.value || undefined,
    };
    try {
      const respostas = await Promise.allSettled(
        estados.map(async (status) => {
          const parametros = {
            page: paginas[status],
            page_size: PAGE_SIZE,
            status,
            ...filtroAtual,
          };
          try {
            return await adminService.listarPedidosPagina(parametros);
          } catch (error) {
            if (
              !paginaExpirada(error, parametros.page) ||
              chamada !== sequencia ||
              getSessionVersion() !== versao
            )
              throw error;
            paginas[status] = 1;
            return adminService.listarPedidosPagina({ ...parametros, page: 1 });
          }
        }),
      );
      if (chamada !== sequencia || getSessionVersion() !== versao) return;
      let falhas = false;
      respostas.forEach((resposta, i) => {
        const status = estados[i];
        if (resposta.status === "fulfilled") {
          dados[status] = { ...resposta.value, inicializado: true, erro: "" };
        } else {
          falhas = true;
          dados[status] = {
            ...dados[status],
            erro: "Não foi possível atualizar esta etapa.",
          };
        }
      });
      if (falhas) {
        erroGlobal.value =
          "Parte da fila não foi sincronizada. Os dados exibidos podem estar desatualizados.";
        throw new Error(erroGlobal.value);
      }
    } finally {
      if (chamada === sequencia) carregando.value = false;
    }
  }
  const atualizacao = useAutoRefresh(carregarColunas, { intervalo: 15_000 });
  let desinscreverRealtime = null;
  let timerRealtime = null;
  onMounted(() => {
    if (!REALTIME_ENABLED) return;
    desinscreverRealtime = realtimeClient.inscrever((evento) => {
      if (!evento || evento.tipo.startsWith("pedido.")) {
        if (timerRealtime !== null) return;
        timerRealtime = setTimeout(() => {
          timerRealtime = null;
          void atualizacao.atualizarAgora();
        }, 400);
      }
    });
  });

  function aplicarFiltros() {
    sequencia += 1;
    resetarPaginas();
    void carregarColunas().catch(() => {});
  }
  watch(busca, (value) => {
    if (debounceBusca) clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => {
      buscaAplicada.value = value.trim();
      aplicarFiltros();
    }, 350);
  });
  watch(pagamento, aplicarFiltros);
  watch(modo, () => {
    if (!etapasVisiveis.value.some((etapa) => etapa.status === abaMobile.value)) {
      abaMobile.value = etapasVisiveis.value[0].status;
    }
    aplicarFiltros();
  });
  watch(
    () => route.query.status,
    (value) => {
      const status = String(value || "");
      if (!TODOS_STATUS.includes(status)) return;
      abaMobile.value = status;
      modo.value = ETAPAS_HISTORICO.some((etapa) => etapa.status === status)
        ? "historico"
        : "fila";
    },
  );
  function selecionarModo(valor) {
    if (modo.value === valor) return;
    modo.value = valor;
    const status =
      valor === "fila" ? ETAPAS_FILA[0].status : ETAPAS_HISTORICO[0].status;
    selecionarAba(status);
  }
  function selecionarAba(status) {
    abaMobile.value = status;
    void router.replace({
      name: "admin-pedidos",
      query: { ...route.query, status },
    });
  }
  function mudarPagina(status, deslocamento) {
    const proxima = paginas[status] + deslocamento;
    if (proxima < 1 || proxima > dados[status].total_pages) return;
    paginas[status] = proxima;
    void carregarColunas().catch(() => {});
  }
  function prepararMovimentoCard(elemento) {
    if (
      !elemento ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    )
      return null;

    const origem = elemento.getBoundingClientRect();
    if (!origem.width || !origem.height) return null;

    const fantasma = elemento.cloneNode(true);
    fantasma.setAttribute("aria-hidden", "true");
    fantasma.inert = true;
    Object.assign(fantasma.style, {
      position: "fixed",
      top: `${origem.top}px`,
      left: `${origem.left}px`,
      width: `${origem.width}px`,
      height: `${origem.height}px`,
      margin: "0",
      pointerEvents: "none",
      zIndex: "1000",
      boxShadow: "0 20px 45px rgba(45, 24, 12, .18)",
      transformOrigin: "top left",
    });

    return {
      montar() {
        document.body.append(fantasma);
      },
      animar(status, id) {
        const coluna = document.querySelector(
          `.kanban-column[data-status="${status}"]`,
        );
        const alvo = coluna?.querySelector(
          `.kanban-card[data-pedido-id="${id}"]`,
        );
        let destino = alvo?.getBoundingClientRect();
        if (!destino?.width)
          destino = coluna
            ?.querySelector(".kanban-column-head")
            ?.getBoundingClientRect();
        if (!destino?.width) {
          destino = document
            .querySelector(`.kanban-stage-tabs button[data-status="${status}"]`)
            ?.getBoundingClientRect();
        }
        if (!destino?.width || !fantasma.animate) {
          fantasma.remove();
          return;
        }
        const dx = destino.left - origem.left;
        const dy = destino.top - origem.top;
        const escala = Math.min(1, destino.width / origem.width);

        const animacao = fantasma.animate(
          [
            { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${escala})`,
              opacity: 0.12,
            },
          ],
          {
            duration: 520,
            easing: "cubic-bezier(.22, 1, .36, 1)",
            fill: "forwards",
          },
        );
        animacao.finished.then(
          () => fantasma.remove(),
          () => fantasma.remove(),
        );
        alvo?.animate?.(
          [
            { opacity: 0.5, transform: "scale(.975)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 350, easing: "cubic-bezier(.22, 1, .36, 1)" },
        );
      },
      remover() {
        fantasma.remove();
      },
    };
  }
  async function avancar(pedido, event) {
    const acao = proximaAcao(pedido);
    if (!acao || emAcao.value !== null) return;
    const movimento = prepararMovimentoCard(
      event?.currentTarget?.closest(".kanban-card"),
    );
    emAcao.value = pedido.id;
    erroAcao.value = "";
    try {
      await pedidosStore.alterarStatus(pedido.id, acao.status);
      movimento?.montar();
      if (window.matchMedia?.("(max-width: 820px)")?.matches) {
        selecionarAba(acao.status);
      }
      await Promise.allSettled([resumo.carregar(), carregarColunas()]);
      await nextTick();
      movimento?.animar(acao.status, pedido.id);
    } catch (error) {
      movimento?.remover();
      erroAcao.value = mensagemErroApi(
        error,
        "Não foi possível atualizar o pedido.",
      );
    } finally {
      emAcao.value = null;
    }
  }
  function tentarNovamente() {
    erroAcao.value = "";
    void resumo.carregar().catch(() => {});
    void carregarColunas().catch(() => {});
  }
  onBeforeUnmount(() => {
    desinscreverRealtime?.();
    desinscreverRealtime = null;
    if (timerRealtime !== null) clearTimeout(timerRealtime);
    timerRealtime = null;
    sequencia += 1;
    if (debounceBusca) clearTimeout(debounceBusca);
  });

  return {
    abaMobile,
    avancar,
    busca,
    carregando,
    chat,
    dados,
    emAcao,
    erroAcao,
    erroGlobal,
    etapasVisiveis,
    filtrosAtivos,
    modo,
    mudarPagina,
    pagamento,
    paginas,
    pedidosComMensagem,
    resumo,
    selecionarAba,
    selecionarModo,
    tentarNovamente,
    totalEtapa,
    totalOperacao,
    proximaAcao,
  };
}
