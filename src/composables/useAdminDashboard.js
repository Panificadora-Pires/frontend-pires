import { computed, ref } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useAdminDashboardStore } from "@/stores/adminDashboard";
import { useAdminQueueSummaryStore } from "@/stores/adminQueueSummary";
import { useAuthStore } from "@/stores/auth";
import { diaEmSaoPaulo } from "@/utils/adminDashboard";

export function useAdminDashboard() {
  const dashboard = useAdminDashboardStore();
  const queueSummary = useAdminQueueSummaryStore();
  const auth = useAuthStore();
  const referencia = ref(new Date());
  const diaAtual = computed(() => diaEmSaoPaulo(referencia.value));
  const nome = computed(
    () => auth.usuario?.name?.trim().split(/\s+/)[0] || "equipe",
  );
  const hora = computed(() =>
    Number(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(referencia.value),
    ),
  );
  const saudacao = computed(() =>
    hora.value < 12 ? "Bom dia" : hora.value < 18 ? "Boa tarde" : "Boa noite",
  );
  const dataContexto = computed(() =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(referencia.value),
  );
  const pedidosProntos = computed(() => queueSummary.inicializado);
  const metricas = computed(() =>
    queueSummary.resumo
      ? {
          pedidosHoje: queueSummary.resumo.pedidos_hoje,
          pendentes: queueSummary.resumo.pendentes,
          confirmados: queueSummary.resumo.confirmados,
          prontos: queueSummary.resumo.prontos,
          pagamentosPendentes: queueSummary.resumo.pagamentos_pendentes,
        }
      : null,
  );
  const emAndamento = computed(() =>
    metricas.value
      ? metricas.value.pendentes +
        metricas.value.confirmados +
        metricas.value.prontos
      : 0,
  );
  const etapas = computed(() => [
    {
      status: "pendente",
      label: "Pendentes",
      description: "Aguardam confirmação",
      count: metricas.value.pendentes,
    },
    {
      status: "confirmado",
      label: "Em preparo",
      description: "Na produção",
      count: metricas.value.confirmados,
    },
    {
      status: "pronto",
      label: "Prontos",
      description: "Já podem ser retirados",
      count: metricas.value.prontos,
    },
  ]);
  const recentes = computed(() => dashboard.pedidosRecentes);
  const serie = computed(() =>
    (dashboard.relatorioSemana?.serie_diaria || []).map((item) => ({
      dia: item.data,
      label: formatarDia(item.data),
      value: Number(item.total_vendido),
    })),
  );
  const totalSemana = computed(() =>
    Number(dashboard.relatorioSemana?.resumo.total_vendido || 0),
  );
  const rotuloFaturamento = computed(() =>
    !dashboard.dia || dashboard.dia === diaAtual.value
      ? "Faturamento do dia"
      : `Faturamento de ${formatarDia(dashboard.dia)}`,
  );
  const extras = useAutoRefresh(
    () => {
      referencia.value = new Date();
      return dashboard.carregar({ agora: referencia.value });
    },
    { intervalo: 60_000 },
  );
  const erro = computed(
    () =>
      queueSummary.erro ||
      dashboard.erro ||
      (extras.erro.value ? "Não foi possível atualizar os indicadores." : ""),
  );
  function atualizarTudo() {
    return Promise.allSettled([
      extras.atualizarAgora(),
      queueSummary.atualizarAgora(),
    ]);
  }
  function moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }
  function formatarDia(dia) {
    return dia ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}` : "—";
  }
  function formatarData(valor) {
    const data = new Date(valor);
    return Number.isFinite(data.getTime())
      ? new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(data)
      : "—";
  }
  function statusLabel(status) {
    return (
      {
        pendente: "Pendente",
        confirmado: "Em preparo",
        pronto: "Pronto",
        retirado: "Retirado",
        cancelado: "Cancelado",
      }[status] ||
      status ||
      "—"
    );
  }
  function badge(status) {
    return ["pendente", "confirmado", "pronto", "retirado", "cancelado"].includes(
      status,
    )
      ? `dashboard-badge--${status}`
      : "";
  }

  return {
    atualizarTudo,
    badge,
    dashboard,
    dataContexto,
    diaAtual,
    emAndamento,
    erro,
    etapas,
    formatarData,
    formatarDia,
    metricas,
    moeda,
    nome,
    pedidosProntos,
    queueSummary,
    recentes,
    rotuloFaturamento,
    saudacao,
    serie,
    statusLabel,
    totalSemana,
  };
}
