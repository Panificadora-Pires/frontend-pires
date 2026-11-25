import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useReducedMotion } from "motion-v";

import { useNotificationsStore } from "@/stores/notifications";
import {
  agruparNotificacoes,
  filtrarNotificacoes,
} from "@/utils/notifications";

export function useCentralNotificacoes() {
  const notifications = useNotificationsStore();
  const reduzir = useReducedMotion();
  const filtro = ref("todas");
  const busca = ref("");
  const agora = ref(new Date());
  const sucesso = ref("");
  const erroAcao = ref("");
  const novasIds = ref(new Set());
  const idsVistos = new Set();
  let listaInicializada = false;
  let montado = true;
  let timerDia;
  const atualizando = computed(
    () => notifications.carregando || notifications.atualizandoSilenciosamente,
  );
  const acaoPendente = computed(
    () => notifications.marcandoTodas || notifications.idsEmLeitura.length > 0,
  );
  const filtradas = computed(() =>
    filtrarNotificacoes(notifications.itens, filtro.value, busca.value),
  );
  const grupos = computed(() =>
    agruparNotificacoes(filtradas.value, agora.value),
  );
  const filtrosAtivos = computed(
    () => filtro.value !== "todas" || busca.value.trim(),
  );
  const todasLidas = computed(
    () =>
      notifications.inicializado &&
      notifications.itens.length > 0 &&
      notifications.naoLidas === 0,
  );

  function atualizarCalendario() {
    agora.value = new Date();
    clearTimeout(timerDia);
    const dia = agora.value;
    const proximo = new Date(
      dia.getFullYear(),
      dia.getMonth(),
      dia.getDate() + 1,
    );
    timerDia = setTimeout(
      atualizarCalendario,
      proximo.getTime() - dia.getTime() + 50,
    );
  }
  function aoRetomar() {
    if (document.visibilityState !== "hidden") atualizarCalendario();
  }
  onMounted(() => {
    atualizarCalendario();
    document.addEventListener("visibilitychange", aoRetomar);
  });
  onBeforeUnmount(() => {
    montado = false;
    clearTimeout(timerDia);
    document.removeEventListener("visibilitychange", aoRetomar);
  });

  watch(
    () => notifications.itens,
    (itens) => {
      const novas = listaInicializada
        ? itens
            .filter((item) => !idsVistos.has(String(item.id)))
            .map((item) => String(item.id))
        : [];
      itens.forEach((item) => idsVistos.add(String(item.id)));
      novasIds.value = new Set(novas);
      if (notifications.inicializado) listaInicializada = true;
    },
    { immediate: true },
  );
  function concluirEntrada(id) {
    if (!novasIds.value.has(String(id))) return;
    const restantes = new Set(novasIds.value);
    restantes.delete(String(id));
    novasIds.value = restantes;
  }
  function limparFiltros() {
    busca.value = "";
    filtro.value = "todas";
  }
  async function atualizar() {
    try {
      await notifications.atualizarAgora();
    } catch {}
  }

  async function recuperarFoco(origem, id) {
    await nextTick();
    if (
      !montado ||
      origem?.isConnected ||
      document.activeElement !== document.body
    )
      return;
    const item = document.getElementById(`notificacao-${id}`);
    const alvo =
      item?.querySelector("a, button:not([disabled])") ||
      item ||
      document.querySelector(
        '.notifications-page__filters button[aria-pressed="true"]',
      );
    alvo?.focus({ preventScroll: true });
  }
  async function marcarLida(id) {
    if (acaoPendente.value) return;
    const origem = document.activeElement;
    erroAcao.value = "";
    sucesso.value = "";
    try {
      const confirmada = await notifications.marcarLida(id);
      if (montado && confirmada) {
        sucesso.value = "Notificação marcada como lida.";
        await recuperarFoco(origem, id);
      }
    } catch {
      if (montado)
        erroAcao.value =
          "Não foi possível marcar esta notificação como lida. Ela continua não lida. Tente novamente.";
    }
  }
  async function marcarTodas() {
    if (acaoPendente.value || !notifications.naoLidas) return;
    const origem = document.activeElement;
    erroAcao.value = "";
    sucesso.value = "";
    try {
      const confirmadas = await notifications.marcarTodasLidas();
      if (montado && confirmadas) {
        sucesso.value = notifications.naoLidas
          ? "Leitura confirmada. Novos avisos continuam não lidos."
          : "Notificações marcadas como lidas.";
        await recuperarFoco(origem);
      }
    } catch {
      if (montado)
        erroAcao.value =
          "Não foi possível marcar todas como lidas. Os avisos foram mantidos. Tente novamente.";
    }
  }

  return {
    acaoPendente,
    atualizando,
    atualizar,
    busca,
    concluirEntrada,
    erroAcao,
    filtradas,
    filtro,
    filtrosAtivos,
    grupos,
    limparFiltros,
    marcarLida,
    marcarTodas,
    notifications,
    novasIds,
    reduzir,
    sucesso,
    todasLidas,
  };
}
