import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReducedMotion } from "motion-v";

import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useChatStore } from "@/stores/chat";
import { useOrdersStore } from "@/stores/orders";
import { filtrarPedidos } from "@/utils/orders";

export function useMeusPedidos() {
  const route = useRoute();
  const router = useRouter();
  const orders = useOrdersStore();
  const chat = useChatStore();
  const reduzir = useReducedMotion();
  const filtro = ref("todos");
  const busca = ref("");
  const pedidoQRCodeId = ref(null);
  const pedidoChat = ref(null);
  const avisoPedido = ref("");
  let pedidoLocalizado = null;
  const filtros = [
    { valor: "todos", label: "Todos" },
    { valor: "andamento", label: "Em andamento" },
    { valor: "finalizados", label: "Finalizados" },
  ];
  const pedidosFiltrados = computed(() =>
    filtrarPedidos(orders.itens, filtro.value, busca.value),
  );
  const destaque = computed(() =>
    pedidosFiltrados.value.find((pedido) =>
      ["pendente", "confirmado", "pronto"].includes(pedido.status),
    ),
  );
  const colecao = computed(() =>
    pedidosFiltrados.value.filter((pedido) => pedido.id !== destaque.value?.id),
  );
  const pedidoQRCode = computed(
    () =>
      orders.itens.find(
        (pedido) =>
          pedido.id === pedidoQRCodeId.value && pedido.status === "pronto",
      ) || null,
  );
  const filtrosAtivos = computed(
    () => filtro.value !== "todos" || busca.value.trim(),
  );

  function quantidadeFiltro(valor) {
    return valor === "todos"
      ? orders.itens.length
      : valor === "andamento"
        ? orders.emAndamento.length
        : orders.finalizados.length;
  }
  const {
    atualizando,
    ultimaAtualizacao,
    erro: erroAtualizacao,
    atualizarAgora,
    reagendar,
  } = useAutoRefresh(
    () => orders.carregar({ force: true, silencioso: orders.inicializado }),
    { intervalo: () => (orders.emAndamento.length ? 10_000 : 60_000) },
  );
  watch(
    () => orders.emAndamento.length,
    () => reagendar(),
  );

  watch(
    () => route.query.pedido,
    () => {
      pedidoLocalizado = null;
      avisoPedido.value = "";
      if (route.query.pedido && ultimaAtualizacao.value) atualizarAgora();
    },
  );
  watch(
    [
      () => route.query.pedido,
      ultimaAtualizacao,
      atualizando,
      () => orders.carregando || orders.atualizandoSilenciosamente,
    ],
    async ([valor, atualizacao, sincronizando, carregando], _, onCleanup) => {
      const id = Number(valor);
      if (
        !/^\d+$/.test(String(valor)) ||
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        pedidoLocalizado === id ||
        !atualizacao ||
        sincronizando ||
        carregando ||
        erroAtualizacao.value ||
        pedidoChat.value ||
        pedidoQRCode.value
      )
        return;
      let cancelado = false;
      onCleanup(() => {
        cancelado = true;
      });
      pedidoLocalizado = id;
      filtro.value = "todos";
      busca.value = "";
      await nextTick();
      if (cancelado) return;
      const elemento = document.getElementById(`pedido-${id}`);
      if (!elemento) {
        avisoPedido.value =
          "Não encontramos esse pedido nesta lista. Confira os pedidos disponíveis abaixo.";
        return;
      }
      elemento.focus({ preventScroll: true });
      elemento.scrollIntoView({
        behavior: reduzir.value ? "instant" : "smooth",
        block: "start",
      });
    },
    { immediate: true },
  );
  watch(pedidoQRCode, (pedido) => {
    if (!pedido) pedidoQRCodeId.value = null;
  });
  function limparFiltros() {
    filtro.value = "todos";
    busca.value = "";
  }
  function abrirQRCode(pedido) {
    if (pedido?.status === "pronto") {
      pedidoChat.value = null;
      pedidoQRCodeId.value = pedido.id;
    }
  }
  function abrirChat(pedido) {
    pedidoQRCodeId.value = null;
    pedidoChat.value = pedido;
  }

  watch(
    [() => route.query.chat, () => orders.inicializado],
    ([chatId, carregado]) => {
      if (!chatId || !carregado) return;
      const pedido = orders.itens.find(
        (item) => Number(item.id) === Number(chatId),
      );
      if (pedido) abrirChat(pedido);
      const { chat: _chat, ...query } = route.query;
      router.replace({ query });
    },
    { immediate: true },
  );

  return {
    abrirChat,
    abrirQRCode,
    atualizarAgora,
    avisoPedido,
    busca,
    chat,
    colecao,
    destaque,
    erroAtualizacao,
    filtro,
    filtros,
    filtrosAtivos,
    limparFiltros,
    orders,
    pedidoChat,
    pedidoQRCode,
    pedidoQRCodeId,
    pedidosFiltrados,
    quantidadeFiltro,
    reduzir,
  };
}
